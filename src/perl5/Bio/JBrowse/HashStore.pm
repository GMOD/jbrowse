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

use File::Next ();
use File::Path ();
use File::Spec ();

use Digest::Crc32 ();
use DB_File ();
use IO::File ();
use POSIX ();

my $bucket_class = 'Bio::JBrowse::HashStore::Bucket';


=head2 open( dir => "/path/to/dir", hash_bits => 16, mem => 256 * 2**20 )

=cut

sub open {
    my $class = shift;

    # source of data: defaults, overridden by open args, overridden by meta.json contents
    my $self = bless {
        max_filehandles => 1000,
        mem => 256*2**20,
        @_
    }, $class;

    $self->{dir} or croak "dir option required";

    $self->empty if $self->{empty};

    $self->{meta} = $self->_read_meta;

    $self->{crc} = Digest::Crc32->new;

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

    $self->{cache_size} = int( $self->{mem} / 50000 / 2 );
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
    my $gzip = $self->{compress} ? ':gzip' : '';
    {
        my $hash_chars = $self->{hash_bits}/4;
        my $sort_log_chars = $hash_chars - int( log($self->{cache_size} )/log(16) );
        my $max_sort_log_chars = int( log( $self->{max_filehandles} )/log(16) );
        $sort_log_chars = 1 unless $sort_log_chars > 1;
        $sort_log_chars = $max_sort_log_chars unless $sort_log_chars <= $max_sort_log_chars;

        $hash_chars -= $sort_log_chars;
        my $zeroes = "0"x$hash_chars;

        print "Using $sort_log_chars chars for sort log names (".(16**$sort_log_chars)." sort logs)\n" if $self->{verbose};
        my $filehandle_cache = $self->_make_cache( size => $self->{max_filehandles} );
        my $progressbar = $estimated_op_count && $self->_make_progressbar( 'Sorting operations', $estimated_op_count );
        my $progressbar_next_update = 0;
        while ( my $op = $op_stream->() ) {
            my $hex = $self->_hex( $self->_hash( $op->[0] ) );

            substr( (my $log_hex = $hex), 0, $hash_chars, $zeroes );

            my $log_handle = $filehandle_cache->compute( $log_hex, sub {
                my ( $h ) = @_;
                my $pathinfo = $self->_hexToPath( $h );
                File::Path::mkpath( $pathinfo->{workdir} ) unless -d $pathinfo->{workdir};
                #warn "writing $pathinfo->{fullpath}.log\n";
                CORE::open( my $f, ">>$gzip", "$pathinfo->{workpath}.log" )
                    or die "$! opening bucket log $pathinfo->{workpath}.log";
                return $f;
            });

            Storable::store_fd( [$hex,$op], $log_handle );

            $ops_written++;
            if ( $progressbar && $ops_written >= $progressbar_next_update && $ops_written < $estimated_op_count ) {
                $progressbar_next_update = $progressbar->update( $ops_written );
            }
        }
        if ( $progressbar && $ops_written > $progressbar_next_update ) {
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
            CORE::open( my $log_fh, "<$gzip", $log_path ) or die "$! reading $log_path";
            #warn "reading $log_path\n";
            while ( my $rec = eval { Storable::fd_retrieve( $log_fh ) } ) {
                my ( $hex, $op ) = @$rec;
                my $bucket = $self->_getBucketFromHex( $hex );
                $bucket->{data}{$op->[0]} = $do_operation->( $op, $bucket->{data}{$op->[0]} );
                $bucket->{dirty} = 1;

                if ( $progressbar && ++$ops_played_back > $progressbar_next_update ) {
                    $progressbar_next_update = $progressbar->update( $ops_played_back );
                }
            }
            unlink $log_path;
        }

        if ( $progressbar && $ops_played_back > $progressbar_next_update ) {
            $progressbar->update( $ops_written );
        }
    }
}

sub _file_iterator {
    my ( $self, $filter ) = @_;
    return File::Next::files( { file_filter => $filter }, $self->{work_dir}||$self->{dir} );
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
Fix #563, don't destroy workdir, if specified

=cut

sub empty {
    my ( $self ) = @_;
    print "Removing existing contents of target dir $self->{dir}\n" if $self->{verbose};
    File::Path::rmtree( $self->{dir} );
#    File::Path::rmtree( $self->{work_dir} ) if defined $self->{work_dir};
    File::Path::mkpath( $self->{dir} );
    File::Path::mkpath( $self->{work_dir} ) if defined $self->{work_dir};
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
    $_[0]->{crc}->strcrc32( $_[1] ) & $_[0]->{hash_mask}
}

sub _hex {
    sprintf( $_[0]->{hash_sprintf_pattern}, $_[1] );
}

sub _hexToPath {
    my ( $self, $hex ) = @_;
    my @dir = ( $self->{dir}, $hex =~ /(.{1,3})/g );
    my @workdir = ( $self->{work_dir}||$self->{dir}, $hex =~ /(.{1,3})/g );
    my $file = (pop @dir).$self->{file_extension};
    my $workfile = (pop @workdir).$self->{file_extension};
    my $dir = File::Spec->catdir(@dir);
    my $workdir = File::Spec->catdir(@workdir);
    #warn "crc: $crc, fullpath: ".File::Spec->catfile( $dir, $file )."\n";
    return { dir => $dir, fullpath => File::Spec->catfile( $dir, $file ), workdir => $workdir, workpath => File::Spec->catfile( $workdir, $file ) };
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
