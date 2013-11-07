package Bio::JBrowse::Cmd::IndexNames;

=head1 NAME

Bio::JBrowse::Cmd::IndexNames - script module to create or update a
JBrowse names index from source files.  Main script POD is in generate-names.pl.

=cut

use strict;
use warnings;

use base 'Bio::JBrowse::Cmd';

use File::Spec ();
use POSIX ();
use DB_File ();
use Storable ();
use File::Temp ();
use List::Util ();

use GenomeDB ();
use Bio::JBrowse::HashStore ();

sub option_defaults {(
    dir => 'data',
    completionLimit => 20,
    locationLimit => 100,
    mem => 256 * 2**20,
    tracks => []
)}

sub option_definitions {(
"dir|out=s",
"completionLimit=i",
"locationLimit=i",
"verbose|v+",
"noSort",
"thresh=i",
"sortMem=i",
"mem=i",
"workdir=s",
'tracks=s@',
'hashBits=i',
'incremental|i',
"help|h|?",
)}

sub initialize {
    my ( $self ) = @_;

    # these are used in perf-critical tight loops, make them accessible faster
    $self->{max_completions} = $self->opt('completionLimit');
    $self->{max_locations} = $self->opt('locationLimit');

    $self->{stats} = {
        total_namerec_bytes => 0,
        namerecs_buffered   => 0,
        tracksWithNames => [],
        record_stream_estimated_count => 0,
        operation_stream_estimated_count => 0,
    };
}

sub run {
    my ( $self ) = @_;

    my $outDir = $self->opt('dir');
    -d $outDir or die "Output directory $outDir does not exist.\n";
    -w $outDir or die "Output directory $outDir is not writable.\n";

    my $gdb = GenomeDB->new( $outDir );

    my $refSeqs = $gdb->refSeqs;
    unless( @$refSeqs ) {
        die "No reference sequences defined in configuration, nothing to do.\n";
    }
    my @tracks = grep $self->track_is_included( $_->{label} ),
                      @{ $gdb->trackList || [] };
    unless( @tracks ) {
        die "No tracks. Nothing to do.\n";
    }

    $self->vprint( "Tracks:\n".join('', map "    $_->{label}\n", @tracks ) );

    # find the names files we will be working with
    my $names_files = $self->find_names_files( \@tracks, $refSeqs )
         or warn "WARNING: No feature names found for indexing,"
             ." only reference sequence names will be indexed.\n";

    # convert the stream of name records into a stream of operations to do
    # on the data in the hash store
    my $operation_stream = $self->make_operation_stream( $self->make_name_record_stream( $refSeqs, $names_files ), $names_files );

    # finally copy the temp store to the namestore
    $self->vprint( "Using ".$self->hash_bits."-bit hashing\n" );

    # make a stream of key/value pairs and load them into the HashStore
    $self->name_store->stream_set(
        $self->make_key_value_stream( $operation_stream ),
        $self->{stats}{key_count}
    );

    # store the list of tracks that have names
    $self->name_store->meta->{track_names} = $self->{stats}{tracksWithNames};

    # record the fact that all the keys are lowercased
    $self->name_store->meta->{lowercase_keys} = 1;

    # set up the name store in the trackList.json
    $gdb->modifyTrackList( sub {
                               my ( $data ) = @_;
                               $data->{names}{type} = 'Hash';
                               $data->{names}{url}  = 'names/';
                               return $data;
                           });

exit;
}

sub track_is_included {
    my ( $self, $trackname ) = @_;
    my $included = $self->{included_track_names} ||= do {
        my @tracks = @{ $self->opt('tracks') };
        my $inc = { map { $_ => 1 } map { split ',', $_ } @tracks };
        @tracks ? sub { $inc->{ shift() } } : sub { 1 };
    };
    return $included->( $trackname );
}

sub name_store {
    my ( $self ) = @_;
    return $self->{name_store} ||= Bio::JBrowse::HashStore->open(
        dir   => File::Spec->catdir( $self->opt('dir'), "names" ),
        work_dir => $self->opt('workdir'),
        empty => ! $self->opt('incremental'),
        mem => $self->opt('mem'),
        nosync => 1,

        hash_bits => $self->hash_bits,

        verbose => $self->opt('verbose')
    );
}

sub hash_bits {
    my $self = shift;
    # set the hash size to try to get about 5-10KB per file, at an
    # average of about 500 bytes per name record, for about 10 records
    # per file. if the store has existing data in it, this will be
    # ignored
    return $self->{hash_bits} ||= $self->opt('hashBits')
                 || ( $self->{stats}{record_stream_estimated_count}
                         ? sprintf( '%0.0f', List::Util::max( 4, List::Util::min( 32, 4*int( log( $self->{stats}{record_stream_estimated_count} / 10 )/ 4 / log(2)) )))
                      : 12
                    );
}

sub make_name_record_stream {
    my ( $self, $refseqs, $names_files ) = @_;
    my @names_files = @$names_files;

    my $name_records_iterator = sub {};
    my @namerecord_buffer;

    # insert a name record for all of the reference sequences
    for my $ref ( @$refseqs ) {
        $self->{stats}{name_input_records}++;
        $self->{stats}{namerecs_buffered}++;
        my $rec = [ @{$ref}{ qw/ name length name seqDir start end seqChunkSize/ }];
        $self->{stats}{total_namerec_bytes} += length join(",",$rec);
        push @namerecord_buffer, $rec;
    }

    my %trackHash;

    my $trackNum = 0;

    return sub {
        while( ! @namerecord_buffer ) {
            my $nameinfo = $name_records_iterator->() || do {
                my $file = shift @names_files;
                return unless $file;
                #print STDERR "Processing $file->{fullpath}\n";
                $name_records_iterator = $self->make_names_iterator( $file );
                $name_records_iterator->();
            } or return;
            my @aliases = map { ref($_) ? @$_ : $_ }  @{$nameinfo->[0]};
            foreach my $alias ( @aliases ) {
                    my $track = $nameinfo->[1];
                    unless ( defined $trackHash{$track} ) {
                        $trackHash{$track} = $trackNum++;
                        push @{$self->{stats}{tracksWithNames}}, $track;
                    }
                    $self->{stats}{namerecs_buffered}++;
                    push @namerecord_buffer, [
                        $alias,
                        $trackHash{$track},
                        @{$nameinfo}[2..$#{$nameinfo}]
                        ];
            }
        }
        return shift @namerecord_buffer;
    };
}

sub make_key_value_stream {
    my $self    = shift;
    my $workdir = $self->opt('workdir') || $self->opt('dir');

    my $tempfile = File::Temp->new( TEMPLATE => 'names-build-tmp-XXXXXXXX', DIR => $workdir, UNLINK => 1 );
    $self->vprint( "Temporary key-value DBM file: $tempfile\n" );

    # load a temporary DB_File with the completion data
    $self->_build_index_temp( shift, $tempfile ); #< use shift to free the $operation_stream after index is built

    # reopen the temp store with default cache size to save memory
    my $db_conf = DB_File::BTREEINFO->new;
    tie( my %temp_store, 'DB_File', "$tempfile", POSIX::O_RDONLY, 0666, DB_File::BTREEINFO->new );

    $self->{stats}{key_count} = scalar keys %temp_store;

    return sub {
        my ( $k, $v ) = each %temp_store;
        return $k ? ( $k, Storable::thaw($v) ) : ();
    };
}

sub _build_index_temp {
    my ( $self, $operation_stream, $tempfile ) = @_;

    my $db_conf = DB_File::BTREEINFO->new;
    $db_conf->{flags} = 0x1;    #< DB_TXN_NOSYNC
    $db_conf->{cachesize} = $self->opt('mem');
    tie( my %temp_store, 'DB_File', "$tempfile",POSIX::O_RDWR|POSIX::O_TRUNC, 0666, $db_conf );

    my $progressbar;
    my $progress_next_update = 0;
    if ( $self->opt('verbose') ) {
        print "Estimating $self->{stats}{operation_stream_estimated_count} index operations on $self->{stats}{record_stream_estimated_count} completion records\n";
        eval {
            require Term::ProgressBar;
            $progressbar = Term::ProgressBar->new({name  => 'Gathering locations, generating completions',
                                                   count => $self->{stats}{operation_stream_estimated_count},
                                                   ETA   => 'linear', });
            $progressbar->max_update_rate(1);
        }
    }

    # now write it to the temp store
    while ( my $op = $operation_stream->() ) {
        $self->do_hash_operation( \%temp_store, $op );
        $self->{stats}{operations_processed}++;

        if ( $progressbar && $self->{stats}{operations_processed} > $progress_next_update
             && $self->{stats}{operations_processed} < $self->{stats}{operation_stream_estimated_count}
           ) {
            $progress_next_update = $progressbar->update( $self->{stats}{operations_processed} );
        }
    }

    if ( $progressbar && $self->{stats}{operation_stream_estimated_count} >= $progress_next_update ) {
        $progressbar->update( $self->{stats}{operation_stream_estimated_count} );
    }
}


sub find_names_files {
    my ( $self, $tracks, $refseqs ) = @_;

    my @files;
    for my $track (@$tracks) {
        for my $ref (@$refseqs) {
            my $dir = File::Spec->catdir(
                $self->opt('dir'),
                "tracks",
                $track->{label},
                $ref->{name}
                );

            # read either names.txt or names.json files
            my $name_records_iterator;
            my $names_txt  = File::Spec->catfile( $dir, 'names.txt'  );
            if( -f $names_txt ) {
                push @files, { fullpath => $names_txt, type => 'txt' };
            }
            else {
                my $names_json = File::Spec->catfile( $dir, 'names.json' );
                if( -f $names_json ) {
                    push @files, { fullpath => $names_json, type => 'json' };
                }
            }
        }
    }
    return \@files;
}

sub make_operation_stream {
    my ( $self, $record_stream, $names_files ) = @_;

    $self->{stats}{namerecs_converted_to_operations} = 0;
    my @operation_buffer;
    # try to fill the operation buffer a bit to estimate the number of operations per name record
    {
        while( @operation_buffer < 50000 && ( my $name_record = $record_stream->()) ) {
            $self->{stats}{namerecs_converted_to_operations}++;
            push @operation_buffer, $self->make_operations( $name_record );
        }
    }

    # estimate the total number of name records we probably have based on the input file sizes
    #print "sizes: $self->{stats}{total_namerec_bytes}, buffered: $namerecs_buffered, b/rec: ".$total_namerec_sizes/$namerecs_buffered."\n";
    $self->{stats}{avg_record_text_bytes} = $self->{stats}{total_namerec_bytes}/($self->{stats}{namerecs_buffered}||1);
    $self->{stats}{total_input_bytes} = List::Util::sum( map { -s $_->{fullpath} } @$names_files ) || 0;
    $self->{stats}{record_stream_estimated_count} = int( $self->{stats}{total_input_bytes} / ($self->{stats}{avg_record_text_bytes}||1));;
    $self->{stats}{operation_stream_estimated_count} = $self->{stats}{record_stream_estimated_count} * int( @operation_buffer / ($self->{stats}{namerecs_converted_to_operations}||1) );

    if( $self->opt('verbose') ) {
        print "Sampled input stats:\n";
        while( my ($k,$v) = each %{$self->{stats}} ) {
            $k =~ s/_/ /g;
            printf( '%40s'." $v\n", $k );
        }
    }

    return sub {
        unless( @operation_buffer ) {
            if( my $name_record = $record_stream->() ) {
                #$self->{stats}{namerecs_converted_to_operations}++;
                push @operation_buffer, $self->make_operations( $name_record );
            }
        }
        return shift @operation_buffer;
    };
}

my $OP_ADD_EXACT  = 1;
my $OP_ADD_PREFIX = 2;

sub make_operations {
    my ( $self, $record ) = @_;

    my $lc_name = lc $record->[0];

    my @ops = ( [ $lc_name, $OP_ADD_EXACT, $record ] );

    if( $self->{max_completions} > 0 ) {
        # generate all the prefixes
        my $l = $lc_name;
        chop $l;
        while ( $l ) {
            push @ops, [ $l, $OP_ADD_PREFIX, $record->[0] ];
            chop $l;
        }
    }

    $self->{stats}{operations_made} += scalar @ops;

    return @ops;
}

my %full_entries;
sub do_hash_operation {
    my ( $self, $tempstore, $op ) = @_;

    my ( $lc_name, $op_name, $record ) = @$op;

    if( $op_name == $OP_ADD_EXACT ) {
        my $r = $tempstore->{$lc_name};
        $r = $r ? Storable::thaw($r) : { exact => [], prefix => [] };

        if( @{ $r->{exact} } < $self->{max_locations} ) {
            push @{ $r->{exact} }, $record;
            $tempstore->{$lc_name} = Storable::freeze( $r );
        }
        # elsif( $verbose ) {
        #     print STDERR "Warning: $name has more than --locationLimit ($self->{max_locations}) distinct locations, not all of them will be indexed.\n";
        # }
    }
    elsif( $op_name == $OP_ADD_PREFIX && ! exists $full_entries{$lc_name} ) {
        my $r = $tempstore->{$lc_name};
        $r = $r ? Storable::thaw($r) : { exact => [], prefix => [] };

        my $name = $record;

        my $p = $r->{prefix};
        if( @$p < $self->{max_completions} ) {
            if( ! grep $name eq $_, @$p ) {
                push @{ $r->{prefix} }, $name;
                $tempstore->{$lc_name} = Storable::freeze( $r );
            }
        }
        elsif( @{ $r->{prefix} } == $self->{max_completions} ) {
            push @{ $r->{prefix} }, { name => 'too many matches', hitLimit => 1 };
            $tempstore->{$lc_name} = Storable::freeze( $r );
            $full_entries{$lc_name} = 1;
        }
    }
}

# each of these takes an input filename and returns a subroutine that
# returns name records until there are no more, for either names.txt
# files or old-style names.json files
sub make_names_iterator {
    my ( $self, $file_record ) = @_;
    if( $file_record->{type} eq 'txt' ) {
        my $input_fh = $self->open_names_file( $file_record->{fullpath} );
        # read the input json partly with low-level parsing so that we
        # can parse incrementally from the filehandle.  names list
        # files can be very big.
        return sub {
            my $t = <$input_fh>;
            if( $t ) {
                $self->{stats}{name_input_records}++;
                $self->{stats}{total_namerec_bytes} += length $t;
                return eval { JSON::from_json( $t ) };
            }
            return undef;
        };
    }
    elsif( $file_record->{type} eq 'json' ) {
        # read old-style names.json files all from memory
        my $input_fh = $self->open_names_file( $file_record->{fullpath} );

        my $data = JSON::from_json(do {
            local $/;
            my $text = scalar <$input_fh>;
            $self->{stats}{total_namerec_bytes} += length $text;
            $text;
        });

        $self->{stats}{name_input_records} += scalar @$data;

        return sub { shift @$data };
    }
}

sub open_names_file {
    my ( $self, $infile ) = @_;
    my $gzip = $infile =~ /\.(txt|json)z$/ ? ':gzip' : '';
    open my $fh, "<$gzip", $infile or die "$! reading $infile";
    return $fh;
}


1;
