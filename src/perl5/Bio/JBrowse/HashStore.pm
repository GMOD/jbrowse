=head1 NAME

Bio::JBrowse::HashStore - on-disk 2-level hash table

=head1 DESCRIPTION

Makes an on-disk hash table, designed to be easily read as static files over HTTP.

Makes a set of JSON-encoded files at paths based on a hash of the key.
For example:

  path/to/dir/29c/c14/fc.json
  path/to/dir/23f/5ad/11.json
  path/to/dir/711/7c1/29.json
  path/to/dir/5ec/b24/6a.json
  path/to/dir/4de/9ac/c6.json
  path/to/dir/41b/c43/27.json
  path/to/dir/28c/d86/e9.json

Where each file contains a JSON object containing data items like:

  { foo: "bar", ... }

Where "foo" is the original key, and "bar" is the JSON-encoded data.

=cut

package Bio::JBrowse::HashStore;
use strict;
use warnings;

use JSON 2;

use File::Spec ();
use File::Path ();

use Cache::Ref::FIFO ();

use Bio::JBrowse::ExternalSorter;

my $bucket_class = 'Bio::JBrowse::HashStore::Bucket';


=head2 open( dir => "/path/to/dir", hash_bits => 16 )

=cut

sub open {
    my $class = shift;

    # source of data: defaults, overridden by open args, overridden by meta.json contents
    my $self = bless { @_ }, $class;

    $self->empty if $self->{empty};

    %$self = (
        %$self,
        meta => $self->_read_meta
    );

    $self->{hash_bits} ||= $self->{meta}{hash_bits} || 16;
    $self->{meta}{hash_bits} = $self->{hash_bits};
    $self->{hash_characters} = int( $self->{hash_bits}/4 );
    $self->{file_extension} = '.json';

    $self->{bucket_cache} = Cache::Ref::FIFO->new( size => 2000 );
    $self->{bucket_path_cache_by_key} = Cache::Ref::FIFO->new( size => 200_000 );
    $self->{bucket_path_cache_by_hash} = Cache::Ref::FIFO->new( size => 200_000 );

    return bless $self, $class;
}

# write out meta.json file when the store itself is destroyed
sub DESTROY {
    my ( $self ) = @_;
    File::Path::mkpath( $self->{dir} );
    my $meta_path = $self->_meta_path;
    CORE::open my $out, '>', $meta_path or die "$! writing $meta_path";
    $out->print( JSON::to_json( $self->{meta} ) )
        or die "$! writing $meta_path";
}
sub _meta_path {
    File::Spec->catfile( shift->{dir}, 'meta.json' );
}
sub _read_meta {
    my ( $self ) = @_;
    my $meta_path = $self->_meta_path;
    return {} unless -r $meta_path;
    CORE::open my $meta, '<', $meta_path or die "$! reading $meta_path";
    local $/;
    my $d = eval { JSON::from_json( scalar <$meta> ) };
    warn $@ if $@;
    return $d || {};
}

=head2 get( $key )

=cut

sub get {
    my ( $self, $key ) = @_;
    my $bucket = $self->_getBucket( $key );
    return $bucket->{data}{$key};
}


=head2 set( $key, $value )

=cut

sub set {
    my ( $self, $key, $value ) = @_;

    my $bucket = $self->_getBucket( $key );
    $bucket->{data}{$key} = $value;
    $bucket->{dirty} = 1;
    $self->{meta}{last_changed_entry} = $key;

    return $value;
}

=head2 sort_stream( $data_stream )

Given a data stream (sub that returns arrayrefs of [ key, (any amount
of other data) ] when called repeatedly), returns another stream that
emits small objects that can be used to get and set the contents of
the name store at that key ( $entry->get and $entry->set( $value ) )
and will return the original data you passed (including the key) if
you call $entry->data.

Using this can greatly speed up bulk operations on the hash store,
because it allows the internal caches of the HashStore to operate at
maximum efficiency.

This is achieved by doing an external sort of the data items, which
involves writing all of the data items to temporary files and then
reading them back in sorted order.

=cut

use constant SORT_EOF     => 1;
use constant SORT_EOBATCH => 2;
sub sort_stream {
    my ( $self, $in_stream ) = @_;

    $self->{sort_state} = 0;

    # sort up to 10 million records at a time
    my $batch_size = 10_000_000;

    my $sorted_stream = $self->_sort_batch( $in_stream, $batch_size );

    return sub {
        my $d = $sorted_stream->();

        if( !$d && $self->{sort_state} != SORT_EOF ) {
            # sort another batch if we have not yet reached the end of the input stream
            $sorted_stream = $self->_sort_batch( $in_stream, $batch_size );
            $d = $sorted_stream->();
        }

        return $d;
    };
}

sub _sort_batch {
    my ( $self, $in_stream, $batch_size ) = @_;
    $batch_size ||= 10_000_000;

    my $sorter = Bio::JBrowse::ExternalSorter->new(
        sub ($$) {
            $_[0]->[0] cmp $_[1]->[0]
        }, 32_000_000 );

    my $data;
    while( $batch_size-- && ( $data = $in_stream->() ) ) {
        # hash each of the keys and values, spool them to a single log file
        $sorter->add( [ $self->_hexHash( $data->[0] ), $data ] );
    }
    $sorter->finish;

    $self->{sort_state} = $batch_size > -1 ? SORT_EOF : SORT_EOBATCH;

    return sub {
        my $d = $sorter->get;
        return $d && Bio::JBrowse::HashStore::Entry->new(
            store    => $self,
            key      => $d->[1][0],
            data     => $d->[1],
            hex_hash => $d->[0]
        );
    };
}

=head2 empty

Clear the store of all contents.  Deletes all files and directories
from the store directory.

=cut

sub empty {
    my ( $self ) = @_;
    File::Path::rmtree( $self->{dir} );
    File::Path::mkpath( $self->{dir} );
}

########## helper methods ###########

sub _hexHash {
    my ( $self, $key ) = @_;
    my $crc = ( $self->{crc} ||= do { require Digest::Crc32; Digest::Crc32->new } )
                ->strcrc32( $key );
    my $hex = lc sprintf( '%08x', $crc );
    $hex = substr( $hex, 8-$self->{hash_characters} );
    return $hex;
}

sub _hexToPath {
    my ( $self, $hex ) = @_;
    my @dir = ( $self->{dir}, reverse $hex =~ /(.{1,3})/g );
    my $file = (pop @dir).$self->{file_extension};
    my $dir = File::Spec->catdir(@dir);
    return { dir => $dir, fullpath => File::Spec->catfile( $dir, $file ) };
}

sub _getBucket {
    my ( $self, $key ) = @_;
    my $pathinfo = $self->{bucket_path_cache_by_key}->compute( $key, sub { $self->_hexToPath( $self->_hexHash( $key ) ); }  );
    return $self->{bucket_cache}->compute( $pathinfo->{fullpath}, sub { $self->_readBucket( $pathinfo ); } );
}

sub _readBucket {
    my ( $self, $pathinfo ) = @_;

    my $path = $pathinfo->{fullpath};
    my $dir = $pathinfo->{dir};

    if( -f $path ) {
        local $/;
        CORE::open my $in, '<', $path or die "$! reading $path";
        return $bucket_class->new(
             dir => $dir,
             fullpath => $path,
             data => eval { JSON::from_json( scalar <$in> ) } || {}
             );
    }
    else {
        return $bucket_class->new(
            dir => $dir,
            fullpath => $path,
            data => {},
            dirty => 1
            );
    }
}


######## inner class for on-disk hash buckets ##########

package Bio::JBrowse::HashStore::Bucket;

sub new {
    my $class = shift;
    bless { @_ }, $class;
}

# when a bucket is deleted, flush it to disk
sub DESTROY {
    my ( $self ) = @_;

    return unless $self->{dirty} && %{$self->{data}};

    File::Path::mkpath( $self->{dir} );
    CORE::open my $out, '>', $self->{fullpath} or die "$! writing $self->{fullpath}";
    $out->print( JSON::to_json( $self->{data} ) ) or die "$! writing to $self->{fullpath}";
}

package Bio::JBrowse::HashStore::Entry;

sub new {
    my $class = shift;
    bless { @_ }, $class;
}

sub get {
    my ( $self ) = @_;
    my $bucket = $self->_getBucket;
    return $bucket->{data}{ $self->{key} };
}

sub set {
    my ( $self, $value ) = @_;

    my $bucket = $self->_getBucket;
    $bucket->{data}{ $self->{key} } = $value;
    $bucket->{dirty} = 1;
    $self->{store}{meta}{last_changed_entry} = $self->{key};

    return $value;
}

sub data {
    $_[0]->{data};
}

sub store {
    $_[0]->{store};
}

sub _getBucket {
    my ( $self ) = @_;
    my $store = $self->{store};
    my $pathinfo = $store->{bucket_path_cache_by_hash}->compute( $self->{hex_hash}, sub { $store->_hexToPath( $self->{hex_hash} ); } );
    return $store->{bucket_cache}->compute( $pathinfo->{fullpath}, sub { $store->_readBucket( $pathinfo ); } );
}

1;
