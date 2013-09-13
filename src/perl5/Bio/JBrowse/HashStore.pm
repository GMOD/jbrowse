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

use Carp;

use Storable;
use JSON 2;

use File::Spec ();
use File::Path ();

use Bio::JBrowse::PartialSorter;

my $bucket_class = 'Bio::JBrowse::HashStore::Bucket';


=head2 open( dir => "/path/to/dir", hash_bits => 16, sort_mem => 256 * 2**20 )

=cut

sub open {
    my $class = shift;

    # source of data: defaults, overridden by open args, overridden by meta.json contents
    my $self = bless { @_ }, $class;

    $self->{final_dir} = $self->{dir} or croak "dir option required";
    $self->{dir} = $self->{work_dir} || $self->{final_dir};

    $self->empty if $self->{empty};

    $self->{meta} = $self->_read_meta;
    $self->{format} ||= $self->{meta}{format} || 'json';

    $self->{hash_bits} ||= $self->{meta}{hash_bits} || 16;
    $self->{hash_mask} = 2**($self->{hash_bits}) - 1;
    $self->{meta}{hash_bits} = $self->{hash_bits};
    $self->{hash_sprintf_pattern} = '%0'.int( $self->{hash_bits}/4 ).'x';
    $self->{file_extension} = '.'.$self->{format};

    my $cache_items = int( $self->{sort_mem} / 50000 / 6 );
    #warn "Hash store cache size: $cache_items";
    $self->{bucket_cache} = $self->_make_cache( size => $cache_items );
    $self->{bucket_path_cache_by_hash} = $self->_make_cache( size => $cache_items );

    return $self;
}

sub _make_cache {
    my ( $self, @args ) = @_;
    require Cache::Ref::FIFO;
    return Cache::Ref::FIFO->new( @args );
}

# write out meta.json file when the store itself is destroyed
sub DESTROY {
    my ( $self ) = @_;

    File::Path::mkpath( $self->{dir} );
    {
        my $meta_path = $self->_meta_path;
        CORE::open my $out, '>', $meta_path or die "$! writing $meta_path";
        $out->print( JSON::to_json( $self->{meta} ) )
            or die "$! writing $meta_path";
    }

    my $final_dir = $self->{final_dir};
    my $work_dir = $self->{dir};

    # free everything to flush buckets
    %$self = ();

    unless( $final_dir eq $work_dir ) {
        require File::Copy::Recursive;
        File::Copy::Recursive::dircopy( $work_dir, $final_dir );
    }

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
    my $d = eval { JSON->new->relaxed->decode( scalar <$meta> ) };
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

sub sort_stream {
    my ( $self, $in_stream ) = @_;

    my $sorted_stream = Bio::JBrowse::PartialSorter
        ->new(
            mem => $self->{sort_mem} || 256 * 2**20,
            compare => sub($$) {
                $_[0][0] cmp $_[1][0]
               },
           )
        ->sort( $in_stream );

    # sorted entries should have nearly perfect cache locality, so use a
    # 1-element cache for crc32 computations
    my $hash_cache = $self->{tiny_hash_cache} ||= { key => '' };
    return sub {
        my $d = $sorted_stream->()
            or return;

        my $key = $d->[0];
        my $hash = $hash_cache->{key} eq $key
            ? $hash_cache->{hash}
            : do {
                $hash_cache->{key} = $key;
                $hash_cache->{hash} = $self->_hash( $key );
            };

        return Bio::JBrowse::HashStore::Entry->new(
            store    => $self,
            key      => $key,
            data     => $d,
            hash => $hash
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

sub _hash {
    my ( $self, $key ) = @_;
    my $crc = ( $self->{crc} ||= do { require Digest::Crc32; Digest::Crc32->new } )
                  ->strcrc32( $key );
    return $crc & $self->{hash_mask};
}

sub _hashToPath {
    my ( $self, $crc ) = @_;
    my $hex = lc sprintf( $self->{hash_sprintf_pattern}, $crc );
    my @dir = ( $self->{dir}, reverse $hex =~ /(.{1,3})/g );
    my $file = (pop @dir).$self->{file_extension};
    my $dir = File::Spec->catdir(@dir);
    #warn "crc: $crc, fullpath: ".File::Spec->catfile( $dir, $file )."\n";
    return { dir => $dir, fullpath => File::Spec->catfile( $dir, $file ) };
}

sub _getBucket {
    my ( $self, $key ) = @_;
    return $self->_getBucketFromHash( $self->_hash( $key ) );
}

sub _getBucketFromHash {
    my ( $self, $hash ) = @_;
    my $pathinfo = $self->{bucket_path_cache_by_hash}->compute( $hash, sub { $self->_hashToPath( $hash ) }  );
    return $self->{bucket_cache}->compute( $pathinfo->{fullpath}, sub { $self->_readBucket( $pathinfo ); } );
}

sub _readBucket {
    my ( $self, $pathinfo ) = @_;

    my $path = $pathinfo->{fullpath};
    my $dir = $pathinfo->{dir};

    if( -f $path ) {
        return $bucket_class->new(
            format => $self->{format},
            dir => $dir,
            fullpath => $path,
            data => eval {
                if( $self->{format} eq 'storable' ) {
                    Storable::retrieve( $path )
                } else {
                    CORE::open my $in, '<', $path or die "$! reading $path";
                    local $/;
                    JSON::from_json( scalar <$in> )
                }
            } || {}
        );
    }
    else {
        return $bucket_class->new(
            format => $self->{format},
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

    if( $self->{dirty} && %{$self->{data}} ) {
        File::Path::mkpath( $self->{dir} ) unless -d $self->{dir};
        if( $self->{format} eq 'storable' ) {
            Storable::store( $self->{data}, $self->{fullpath} );
        } else {
            CORE::open my $out, '>', $self->{fullpath} or die "$! writing $self->{fullpath}";
            $out->print( JSON::to_json( $self->{data} ) ) or die "$! writing to $self->{fullpath}";
        }
    }
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

    # use a one-element cache for this _getBucket, because Entrys
    # come from sort_stream, and thus should have perfect cache locality
    my $tinycache = $self->{store}{tiny_bucket_cache} ||= { hash => -1 };
    if( $tinycache->{hash} == $self->{hash} ) {
        return $tinycache->{bucket};
    }
    else {
        my $store = $self->{store};
        my $pathinfo = $store->_hashToPath( $self->{hash} );
        my $bucket = $store->_readBucket( $pathinfo );
        $tinycache->{hash} = $self->{hash};
        $tinycache->{bucket} = $bucket;
        return $bucket;
    }
}

1;
