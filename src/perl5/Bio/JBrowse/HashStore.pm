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

use Storable ();
use JSON 2;

use File::Spec ();
use File::Path ();

use DB_File ();
use IO::File ();
use POSIX ();

my $bucket_class = 'Bio::JBrowse::HashStore::Bucket';


=head2 open( dir => "/path/to/dir", hash_bits => 16, mem => 256 * 2**20 )

=cut

sub open {
    my $class = shift;

    # source of data: defaults, overridden by open args, overridden by meta.json contents
    my $self = bless { mem => 256*2**20, @_ }, $class;

    $self->{dir} or croak "dir option required";

    $self->empty if $self->{empty};

    $self->{meta} = $self->_read_meta;

    # compress, format, and hash_bits all use the value in the
    # meta.json if present, or the value passed in by the constructor,
    # or the default, in order of priority
    my %defaults = ( compress => 0, format => 'json', hash_bits => 16 );
    for (qw( compress format hash_bits )) {
        $self->{$_} = $self->{meta}{$_} = (
            defined $self->{meta}{$_}  ?  $self->{meta}{$_}  :
            defined $self->{$_}        ?  $self->{$_}        :
                                          $defaults{$_}
        );
    }

    # check that hash_bits is a multiple of 4
    if( $self->{hash_bits} % 4 ) {
        die "Invalid hash bits value $self->{hash_bits}, must be a multiple of 4.\n";
    }

    $self->{hash_mask} = 2**($self->{hash_bits}) - 1;
    $self->{hash_sprintf_pattern} = '%0'.int( $self->{hash_bits}/4 ).'x';
    $self->{file_extension} = '.'.$self->{format};

    $self->{cache_size} = int( $self->{mem} / 50000 / 6 );
    print "Hash store cache size: $self->{cache_size} buckets\n" if $self->{verbose};

    File::Path::mkpath( $self->{dir} );

    return $self;
}

sub _make_cache {
    my ( $self, @args ) = @_;
    return Bio::JBrowse::HashStore::FIFOCache->new( @args );
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

    # free everything to flush buckets
    %$self = ();
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
    my $d = eval { JSON->new->relaxed->decode( scalar <$meta> ) } || {};
    warn $@ if $@;
    $d->{compress} = 0 unless defined $d->{compress};
    return $d;
}

=head2 meta

return a hashref of metadata about this hash store

=cut

sub meta {
    ( shift->{meta} ||= {} )
}

=head2 get( $key )

=cut

sub get {
    my ( $self, $key ) = @_;
    my $bucket = $self->_getBucket( $key );
    return $bucket->{data}{$key};
}

=head2 stream_do( $arg_stream, $operation_callback )

=cut

sub stream_do {
    my ( $self, $op_stream, $do_operation, $estimated_op_count ) = @_;

    # clean up any stale log files
    { my $log_iterator = $self->_file_iterator( sub { /\.log$/ } );
      while( my $stale_logfile = $log_iterator->() ) {
          unlink $stale_logfile;
      }
    }

    # make log files for each bucket, log the operations that happen
    # on that bucket, but don't actually do them yet
    my $ops_written = 0;
    {
        my $filehandle_cache = $self->_make_cache( size => 1000 );
        my $progressbar = $estimated_op_count && $self->_make_progressbar( 'Sorting operations', $estimated_op_count );
        my $progressbar_next_update = 0;
        while ( my $op = $op_stream->() ) {
            my $key = $op->[0];
            my $hex = $self->_hexHash( $key );
            my $log_handle = $filehandle_cache->compute( $hex, sub {
                                                             my $pathinfo = $self->_hexToPath( $hex );
                                                             File::Path::mkpath( $pathinfo->{dir} ) unless -d $pathinfo->{dir};
                                                             #warn "writing $pathinfo->{fullpath}.log\n";
                                                             CORE::open( my $f, '>>', "$pathinfo->{fullpath}.log" )
                                                           or die "$! opening bucket log $pathinfo->{fullpath}.log";
                                                             return $f;
                                                         });

            Storable::store_fd( $op, $log_handle );

            $ops_written++;
            if ( $progressbar && $ops_written > $progressbar_next_update ) {
                $progressbar_next_update = $progressbar->update( $ops_written );
            }
        }
        if ( $progressbar && $ops_written >= $progressbar_next_update ) {
            $progressbar->update( $estimated_op_count );
        }
    }

    # play back the operations, feeding the $do_operation sub with the
    # bucket and the operation to be done
    {
        my $progressbar = $ops_written && $self->_make_progressbar( 'Executing operations', $ops_written );
        my $progressbar_next_update = 0;
        my $ops_played_back = 0;
        my $log_iterator = $self->_file_iterator( sub { /\.log$/ } );
        while ( my $log_path = $log_iterator->() ) {
            #unlink $log_path or die "$! unlinking $log_path\n";
            ( my $bucket_path = $log_path ) =~ s/\.log$//;
            my $bucket = $self->_readBucket({ fullpath => $bucket_path, dir => File::Basename::dirname( $bucket_path ) });
            CORE::open( my $log_fh, '<', $log_path ) or die "$! reading $log_path";
            unlink $log_path;
            while ( my $op = eval { Storable::fd_retrieve( $log_fh ) } ) {
                $bucket->{data}{$op->[0]} = $do_operation->( $op, $bucket->{data}{$op->[0]} );

                if ( $progressbar && ++$ops_played_back > $progressbar_next_update ) {
                    $progressbar_next_update = $progressbar->update( $ops_played_back );
                }
            }
        }

        if ( $progressbar && $ops_played_back >= $progressbar_next_update ) {
            $progressbar->update( $ops_written );
        }
    }
}

use File::Next ();
sub _file_iterator {
    my ( $self, $filter ) = @_;
    return File::Next::files( { file_filter => $filter }, $self->{dir} );
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

=head2 stream_set( $kv_stream, $key_count, \&merge_sub )

Given a stream that returns ( $key, $value ) when called repeatedly,
set all those values in the hash.

If $key_count is provided, Term::ProgressBar is installed, and
C<verbose> is set on this HashStore, will print progress bars.

If $merge_sub is provided, it will be used to merge values in the
input stream with any values for the same key already in the hash
store like: C<$new_value = $merge_sub-E<gt>( $old_value, $input_value )>.
If not provided, the values will just be overwritten.

=cut

sub stream_set {
    my $self = shift;

    require File::Temp;
    my $tempfile = File::Temp->new( TEMPLATE => 'names-hash-tmp-XXXXXXXX', UNLINK => 1,
                                    DIR => $self->{work_dir} || $self->{dir} );
    $tempfile->close;
    print "Temporary rehashing DBM file: $tempfile\n" if $self->{verbose};

    # convert the input key => value stream to a temp hash of
    # bucket_hex => { key => value, key => value }
    my $bucket_count = $self->_stream_set_build_buckets( shift, $tempfile, shift );

    # write out the bucket files
    my $mergeSub = shift;
    $self->_stream_set_write_bucket_files( $tempfile, $bucket_count, $mergeSub );

    print "Hash store bulk load finished.\n" if $self->{verbose};
}

=head2 db_open( $filename, $flags, $mode, { cachesize => 2**24, ... } )

Open and tie a DB_File in BTREE mode, with the given config options.
Returns a hashref tied to the DB_File.

=cut

sub db_open {
    my ( $self, $file, $flags, $mode, $conf ) = @_;
    my $db_conf = DB_File::BTREEINFO->new;
    $db_conf->{$_} = $conf->{$_} for keys %{ $conf || {} };
    tie( my %store, 'DB_File', "$file", $flags, $mode || 0666, $db_conf);
    return \%store;
}

sub _stream_set_write_bucket_files {
    my ( $self, $tempfile, $bucket_count, $mergeSub ) = @_;

    # reopen the database, this is better because for iterating we
    # don't need the big cache memory used in hashing the keys
    my $buckets = $self->db_open( $tempfile, &POSIX::O_RDONLY, 0666 );

    my $progressbar = $bucket_count && $self->_make_progressbar('Writing/updating index bucket files', $bucket_count );
    my $progressbar_next_update = 0;

    print "Writing buckets to ".$self->{format}."...\n" if $self->{verbose} && ! $progressbar;

    my $buckets_written = 0;
    while( my ( $hex, $contents ) = each %$buckets ) {
        my $bucket = $self->_readBucket( $self->_hexToPath( $hex ) );
        if( my $bucketData = $bucket->{data} ) {
            my $d = Storable::thaw( $contents ) || {};
            if( $mergeSub ) {
                for my $k ( keys %$d ) {
                    if( exists $bucketData->{$k} ) {
                        $bucketData->{$k} = $mergeSub->( $bucketData->{$k}, $d->{$k} );
                    }
                    else {
                        $bucketData->{$k} = $d->{$k};
                    }
                }
            }
            else {
                $bucket->{data} = { %{$bucket->{data}}, %$d };
            }
        }
        else {
            $bucket->{data} = Storable::thaw( $contents );
        }
        $bucket->{dirty} = 1;
        $buckets_written++;

        if ( $progressbar && $buckets_written > $progressbar_next_update ) {
            $progressbar_next_update = $progressbar->update( $buckets_written );
        }
    }
    if ( $progressbar && $buckets_written >= $progressbar_next_update ) {
        $progressbar->update( $bucket_count );
    }
}

sub _stream_set_build_buckets {
    my ( $self, $kv_stream, $tempfile, $key_count ) = @_;

    require Storable;

    my $buckets = $self->db_open( $tempfile, &POSIX::O_CREAT|&POSIX::O_RDWR, 0666,
                                       { flags => 0x1, cachesize => $self->{mem} } );

    my $progressbar = $key_count && $self->_make_progressbar( 'Rehashing to final buckets', $key_count );
    my $progressbar_next_update = 0;
    my $bucket_count = 0;
    my $keys_processed = 0;

    print "Rehashing to final HashStore buckets...\n" if $self->{verbose} && ! $progressbar;

    while ( my ( $k, $v ) = $kv_stream->() ) {
        my $hex = $self->_hexHash( $k );
        my $b = $buckets->{$hex};
        if( $b ) {
            $b = Storable::thaw( $b );
        } else {
            $b = {};
            $bucket_count++;
        }
        $b->{$k} = $v;
        $buckets->{$hex} = Storable::freeze( $b );

        $keys_processed++;
        if ( $progressbar && $keys_processed > $progressbar_next_update ) {
            $progressbar_next_update = $progressbar->update( $keys_processed );
        }
    }
    if ( $progressbar && $key_count > $progressbar_next_update ) {
        $progressbar->update( $key_count );
    }

    return $bucket_count;
}

sub _make_progressbar {
    my ( $self, $description, $total_count ) = @_;

    return unless $self->{verbose};

    eval { require Term::ProgressBar };
    return if $@;

    my $progressbar = Term::ProgressBar->new({ name  => $description,
                                               count => $total_count,
                                               ETA   => 'linear'       });
    $progressbar->max_update_rate(1);
    return $progressbar;
}


=head2 empty

Clear the store of all contents.  Deletes all files and directories
from the store directory.

=cut

sub empty {
    my ( $self ) = @_;
    print "Removing existing contents of target dir $self->{dir}\n" if $self->{verbose};
    File::Path::rmtree( $self->{dir} );
    File::Path::mkpath( $self->{dir} );
}


########## tied-hash support ########

sub TIEHASH {
    return shift->open( @_ );
}
sub FETCH {
    return shift->get(@_);
}
sub STORE {
    return shift->set(@_);
}
sub DELETE {
    die 'DELETE not implemented';
}
sub CLEAR {
    die 'CLEAR not implemented';
}
sub EXISTS {
    return !! shift->get(@_);
}
sub FIRSTKEY {
    die 'FIRSTKEY not implemented';
}
sub NEXTKEY {
    die 'NEXTKEY not implemented';
}
sub SCALAR {
    die 'SCALAR not implemented';
}
sub UNTIE {
    die 'UNTIE not implemented';
}

########## helper methods ###########

# cached combination hash and print as hex
sub _hexHash {
    my ( $self, $key ) = @_;
    my $cache = $self->{hex_hash_cache} ||= $self->_make_cache( size => 300 );
    return $cache->compute( $key, sub {
        my ($k) = @_;
        return $self->_hex( $self->_hash( $key ) );
    });
}

sub _hash {
    my ( $self, $key ) = @_;
    my $crc = ( $self->{crc} ||= do { require Digest::Crc32; Digest::Crc32->new } )
                  ->strcrc32( $key );
    $crc &= $self->{hash_mask};
    return $crc;
}

sub _hex {
    my ( $self, $crc ) = @_;
    return sprintf( $self->{hash_sprintf_pattern}, $crc );
}

sub _hexToPath {
    my ( $self, $hex ) = @_;
    my @dir = ( $self->{dir}, $hex =~ /(.{1,3})/g );
    my $file = (pop @dir).$self->{file_extension};
    my $dir = File::Spec->catdir(@dir);
    #warn "crc: $crc, fullpath: ".File::Spec->catfile( $dir, $file )."\n";
    return { dir => $dir, fullpath => File::Spec->catfile( $dir, $file ) };
}

sub _getBucket {
    my ( $self, $key ) = @_;
    return $self->_getBucketFromHex( $self->_hexHash( $key ) );
}

sub _flushAllCaches {
    my ( $self ) = @_;
    delete $self->{$_} for (
        qw(
              bucket_cache
              bucket_log_filehandle_cache
              hex_hash_cache
              bucket_path_cache_by_hex
          ));
}

sub _getBucketFromHex {
    my ( $self, $hex ) = @_;
    my $bucket_cache = $self->{bucket_cache} ||= $self->_make_cache( size => $self->{cache_size} );
    return $bucket_cache->compute( $hex, sub {
        return $self->_readBucket( $self->_getBucketPath( $hex ) )
    });
}

sub _getBucketPath {
    my ( $self, $hex ) = @_;
    my $path_cache = $self->{bucket_path_cache_by_hex} ||= $self->_make_cache( size => $self->{cache_size} );
    return $path_cache->compute( $hex, sub { $self->_hexToPath( $hex ) });
}

sub _readBucket {
    my ( $self, $pathinfo ) = @_;

    my $path = $pathinfo->{fullpath}.( $self->{compress} ? 'z' : '' );
    my $dir = $pathinfo->{dir};
    my $gzip = $self->{compress} ? ':gzip' : '';

    return $bucket_class->new(
        format => $self->{format},
        compress => $self->{compress},
        dir => $dir,
        fullpath => $path,
        ( -f $path
            ? (
                data => eval {
                    if ( $self->{format} eq 'storable' ) {
                        Storable::retrieve( $path )
                      } else {
                          CORE::open my $in, "<$gzip", $path or die "$! reading $path";
                          local $/;
                          JSON::from_json( scalar <$in> )
                        }
                } || {}
              )
            : ( data => {}, dirty => 1 )
        ));
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
            my $gzip = $self->{compress} ? ':gzip' : '';
            my $out = IO::File->new( $self->{fullpath}, ">$gzip" )
                or die "$! writing $self->{fullpath}";
            $out->print( JSON::to_json( $self->{data} ) ) or die "$! writing to $self->{fullpath}";
        }
    }
}


##### inner cache for FIFO caching ###
package Bio::JBrowse::HashStore::FIFOCache;

sub new {
    my $class = shift;
    return bless {
        fifo  => [],
        bykey => {},
        size  => 100,
        @_
    }, $class;
}

sub compute {
    my ( $self, $key, $callback ) = @_;
    return exists $self->{bykey}{$key} ? $self->{bykey}{$key} : do {
        my $fifo = $self->{fifo};
        if( @$fifo >= $self->{size} ) {
            delete $self->{bykey}{ shift @$fifo };
        }
        push @$fifo, $key;
        return $self->{bykey}{$key} = $callback->($key);
    };
}


1;
