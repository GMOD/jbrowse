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

use ExternalSorter;

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
        %{$self->_read_meta}
    );

    $self->{hash_bits} ||= 16;
    $self->{hash_characters} = int( $self->{hash_bits}/4 );
    $self->{file_extension} = '.json';

    $self->{bucket_cache} = Cache::Ref::FIFO->new( size => 200 );
    $self->{bucket_path_cache} = Cache::Ref::FIFO->new( size => 1000 );

    return bless $self, $class;
}

# write out meta.json file when the store itself is destroyed
sub DESTROY {
    my ( $self ) = @_;
    File::Path::mkpath( $self->{dir} );
    my $meta_path = $self->_meta_path;
    CORE::open my $out, '>', $meta_path or die "$! writing $meta_path";
    $out->print( JSON::to_json(
        {
            hash_bits => $self->{hash_bits}
        }
        ));
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
    return JSON::from_json( scalar <$meta> );
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

    return $value;
}

=head2 sort_stream( $data_stream )

Given a data stream (sub that returns arrayrefs of [ key, ... ] when
called repeatedly), returns another data stream that returns the
arrayrefs in order of their hash bucket numbers.

Using this can greatly speed up bulk operations on the hash store,
because it allows the internal caches of the HashStore to operate at
maximum efficiency.

This is achieved by doing an external sort of the data items, which
involves writing all of the data items to temporary files and then
reading them back in sorted order.

=cut

sub sort_stream {
    my ( $self, $in_stream ) = @_;

    my $sorter = ExternalSorter->new(
        sub ($$) {
            $_[0]->[0] cmp $_[1]->[0]
        }, 32_000_000 );

    while( my $data = $in_stream->() ) {
        # hash each of the keys and values, spool them to a single log file
        $sorter->add( [ $self->_hexHash( $data->[0] ), $data ] );
    }
    $sorter->finish;

    return sub {
        my $d = $sorter->get or return;
        return $d->[1];
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
    my $pathinfo = $self->{bucket_path_cache}->compute( $key, sub { $self->_hexToPath( $self->_hexHash( $key ) ); }  );
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
             data => JSON::from_json( scalar <$in> )
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
    $out->print( JSON::to_json( $self->{data} ) );
}


1;
