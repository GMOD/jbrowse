#!/usr/bin/env perl

=head1 NAME

generate-names.pl - generate a global index of feature names

=head1 USAGE

  generate-names.pl                        \
      [ --out <output directory> ]         \
      [ --verbose ]

=head1 OPTIONS

=over 4

=item --out <directory>

Data directory to process.  Default 'data/'.

=item --tracks <trackname>[,...]

Comma-separated list of which tracks to include in the names index.  If
not passed, all tracks are indexed.

=item --locationLimit <number>

Maximum number of distinct locations to store for a single name.  Default 100.

=item --mem <bytes>

Number of bytes of RAM we are allowed to use for caching memory.
Default 256000000 (256 MiB).  If you machine has enough RAM,
increasing this amount can speed up this script's running time
significantly.

=item --workdir <dir>

Use the given location for building the names index, copying the index
over to the destination location when fully built.  By default, builds
the index in the output location.

Name indexing is a very I/O intensive operation, because the
filesystem is used to store intermediate results in order to keep the
RAM usage reasonable.  If a fast filesystem (e.g. tmpfs) is available
and large enough, indexing can be speeded up by using it to store the
intermediate results of name indexing.

=item --completionLimit <number>

Maximum number of name completions to store for a given prefix.
Default 20.  Set to 0 to disable auto-completion of feature names.
Note that the name index always contains exact matches for feature
names; this setting only disables autocompletion based on incomplete
names.

=item --verbose

Print more progress messages.

=item --help | -h | -?

Print a usage message.

=back

=cut

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../src/perl5";
use JBlibs;

use Fcntl ":flock";
use File::Spec::Functions;
use Getopt::Long;
use Pod::Usage;
use List::Util qw/ sum min max /;

use Storable;
use POSIX;
use DB_File;
use File::Temp ();

use PerlIO::gzip;

use JSON 2;

use Bio::JBrowse::HashStore;

use GenomeDB;

my @includedTrackNames;

my $outDir = "data";
my $workDir;
my $verbose = 0;
my $help;
my $max_completions = 20;
my $max_locations = 100;
my $thresh;
my $no_sort = 0;
my $mem = 256 * 2**20;
my $hash_bits;
GetOptions("dir|out=s" => \$outDir,
           "completionLimit=i" => \$max_completions,
           "locationLimit=i" => \$max_locations,
           "verbose+" => \$verbose,
           "noSort" => \$no_sort,
           "thresh=i" => \$thresh,
           "sortMem=i" => \$mem,
           "mem=i" => \$mem,
           "workdir=s" => \$workDir,
           'tracks=s' => \@includedTrackNames,
           'hashBits=i' => \$hash_bits,
           "help|h|?" => \$help) or pod2usage();

my %includedTrackNames = map { $_ => 1 }
                         map { split ',', $_ }
                         @includedTrackNames;

pod2usage( -verbose => 2 ) if $help;

unless (-d $outDir) {
    die <<OUTDIR;
Can't find directory "$outDir".
Run this program from a different working directory,
or specify the location of the output directory with
the --dir command line option.
OUTDIR
}

my $gdb = GenomeDB->new( $outDir );

my @refSeqs  = @{ $gdb->refSeqs   };
unless( @refSeqs ) {
    die "No reference sequences defined in configuration, nothing to do.\n";
}
my @tracks   = grep { !%includedTrackNames || $includedTrackNames{ $_->{label} } }
               @{ $gdb->trackList || [] };
unless( @tracks ) {
    die "No tracks defined in configuration, nothing to do.\n";
}

if( $verbose ) {
    print "Tracks:\n".join('', map "    $_->{label}\n", @tracks );
}


# find the names files we will be working with
my @names_files = find_names_files();
if( ! @names_files ) {
    warn "WARNING: No feature names found for indexing, only reference sequence names will be indexed.\n";
}

#print STDERR "Names files:\n", map "    $_->{fullpath}\n", @names_files;

my %stats = (
    total_namerec_bytes => 0,
    namerecs_buffered   => 0,
    tracksWithNames => [],
    record_stream_estimated_count => 0,
    operation_stream_estimated_count => 0,
    );

# convert the stream of name records into a stream of operations to do
# on the data in the hash store
my $operation_stream = make_operation_stream( make_name_record_stream( \@refSeqs, \@names_files ) );

$hash_bits ||= $stats{record_stream_estimated_count}
  ? sprintf('%0.0f',max( 4, min( 32, 4*int( log( $stats{record_stream_estimated_count} / 100 )/ 4 / log(2)) )))
  : 12;

# finally copy the temp store to the namestore

print "Using $hash_bits-bit hashing.\n" if $verbose;

my $nameStore = Bio::JBrowse::HashStore->open(
    dir   => catdir( $outDir, "names" ),
    work_dir => $workDir,
    empty => 1,
    mem => $mem,
    nosync => 1,

    # set the hash size to try to get about 50KB per file, at an
    # average of about 500 bytes per name record, for about 100
    # records per file. if the store has existing data in it, this
    # will be ignored
    hash_bits => $hash_bits,

    verbose => $verbose
);

# make a stream of key/value pairs and load them into the HashStore
my $key_count; #< set as side effect of make_key_value_stream
$nameStore->stream_set( make_key_value_stream( $workDir || $outDir, $operation_stream ), $key_count );

# store the list of tracks that have names
$nameStore->{meta}{track_names} = $stats{tracksWithNames};
# record the fact that all the keys are lowercased
$nameStore->{meta}{lowercase_keys} = 1;

# set up the name store in the trackList.json
$gdb->modifyTrackList( sub {
    my ( $data ) = @_;
    $data->{names}{type} = 'Hash';
    $data->{names}{url}  = 'names/';
    return $data;
});

exit;

################ HELPER SUBROUTINES ##############################

sub make_name_record_stream {
    my ( $refseqs, $names_files ) = @_;
    my @names_files = @$names_files;

    my $name_records_iterator = sub {};
    my @namerecord_buffer;

    # insert a name record for all of the reference sequences
    for my $ref ( @$refseqs ) {
        $stats{name_input_records}++;
        $stats{namerecs_buffered}++;
        my $rec = [ @{$ref}{ qw/ name length name seqDir start end seqChunkSize/ }];
        $stats{total_namerec_bytes} += length join(",",$rec);
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
                $name_records_iterator = make_names_iterator( $file );
                $name_records_iterator->();
            } or return;
            my @aliases = map { ref($_) ? @$_ : $_ }  @{$nameinfo->[0]};
            foreach my $alias ( @aliases ) {
                    my $track = $nameinfo->[1];
                    unless ( defined $trackHash{$track} ) {
                        $trackHash{$track} = $trackNum++;
                        push @{$stats{tracksWithNames}}, $track;
                    }
                    $stats{namerecs_buffered}++;
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
    my $workdir = shift;

    my $tempfile = File::Temp->new( TEMPLATE => 'names-build-tmp-XXXXXXXX', DIR => $workdir, UNLINK => 1 );
    print "Temporary key-value DBM file: $tempfile\n" if $verbose;

    # load a temporary DB_File with the completion data
    _build_index_temp( shift, $tempfile ); #< use shift to free the $operation_stream after index is built

    # reopen the temp store with default cache size to save memory
    my $db_conf = DB_File::BTREEINFO->new;
    tie( my %temp_store, 'DB_File', "$tempfile", O_RDONLY, 0666, DB_File::BTREEINFO->new );

    $key_count = scalar keys %temp_store;

    return sub {
        my ( $k, $v ) = each %temp_store;
        return $k ? ( $k, Storable::thaw($v) ) : ();
    };
}

sub _build_index_temp {
    my ( $operation_stream, $tempfile ) = @_;

    my $db_conf = DB_File::BTREEINFO->new;
    $db_conf->{flags} = 0x1;    #< DB_TXN_NOSYNC
    $db_conf->{cachesize} = $mem;
    tie( my %temp_store, 'DB_File', "$tempfile",O_RDWR|O_TRUNC, 0666, $db_conf );

    my $progressbar;
    my $progress_next_update = 0;
    if ( $verbose ) {
        print "Estimating $stats{operation_stream_estimated_count} index operations on $stats{record_stream_estimated_count} completion records.\n";
        eval {
            require Term::ProgressBar;
            $progressbar = Term::ProgressBar->new({name  => 'Gathering locations, generating completions',
                                                   count => $stats{operation_stream_estimated_count},
                                                   ETA   => 'linear', });
            $progressbar->max_update_rate(1);
        }
    }

    # now write it to the temp store
    while ( my $op = $operation_stream->() ) {
        do_hash_operation( \%temp_store, $op );
        $stats{operations_processed}++;

        if ( $progressbar && $stats{operations_processed} > $progress_next_update
             && $stats{operations_processed} < $stats{operation_stream_estimated_count}
           ) {
            $progress_next_update = $progressbar->update( $stats{operations_processed} );
        }
    }

    if ( $progressbar && $stats{operation_stream_estimated_count} >= $progress_next_update ) {
        $progressbar->update( $stats{operation_stream_estimated_count} );
    }
}


sub find_names_files {
    my @files;
    for my $track (@tracks) {
        for my $ref (@refSeqs) {
            my $dir = catdir( $outDir,
                              "tracks",
                              $track->{label},
                              $ref->{name}
                            );

            # read either names.txt or names.json files
            my $name_records_iterator;
            my $names_txt  = catfile( $dir, 'names.txt'  );
            if( -f $names_txt ) {
                push @files, { fullpath => $names_txt, type => 'txt' };
            }
            else {
                my $names_json = catfile( $dir, 'names.json' );
                if( -f $names_json ) {
                    push @files, { fullpath => $names_json, type => 'json', namestxt => $names_txt };
                }
            }
        }
    }
    return @files;
}

sub make_operation_stream {
    my ( $record_stream ) = @_;

    $stats{namerecs_converted_to_operations} = 0;
    my @operation_buffer;
    # try to fill the operation buffer a bit to estimate the number of operations per name record
    {
        while( @operation_buffer < 50000 && ( my $name_record = $record_stream->()) ) {
            $stats{namerecs_converted_to_operations}++;
            push @operation_buffer, make_operations( $name_record );
        }
    }

    # estimate the total number of name records we probably have based on the input file sizes
    #print "sizes: $stats{total_namerec_bytes}, buffered: $namerecs_buffered, b/rec: ".$total_namerec_sizes/$namerecs_buffered."\n";
    $stats{avg_record_text_bytes} = $stats{total_namerec_bytes}/($stats{namerecs_buffered}||1);
    $stats{total_input_bytes} = sum( map { -s $_->{fullpath} } @names_files ) || 0;
    $stats{record_stream_estimated_count} = int( $stats{total_input_bytes} / ($stats{avg_record_text_bytes}||1));;
    $stats{operation_stream_estimated_count} = $stats{record_stream_estimated_count} * int( @operation_buffer / ($stats{namerecs_converted_to_operations}||1) );

    if( $verbose ) {
        print "Sampled input stats:\n";
        while( my ($k,$v) = each %stats ) {
            $k =~ s/_/ /g;
            printf( '%40s'." $v\n", $k );
        }
    }

    return sub {
        unless( @operation_buffer ) {
            if( my $name_record = $record_stream->() ) {
                #$stats{namerecs_converted_to_operations}++;
                push @operation_buffer, make_operations( $name_record );
            }
        }
        return shift @operation_buffer;
    };
}

use constant OP_ADD_EXACT  => 1;
use constant OP_ADD_PREFIX => 2;

sub make_operations {
    my ( $record ) = @_;

    my $lc_name = lc $record->[0];

    my @ops = ( [ $lc_name, OP_ADD_EXACT, $record ] );

    if( $max_completions > 0 ) {
        # generate all the prefixes
        my $l = $lc_name;
        chop $l;
        while ( $l ) {
            push @ops, [ $l, OP_ADD_PREFIX, $record->[0] ];
            chop $l;
        }
    }

    $stats{operations_made} += scalar @ops;

    return @ops;
}

my %full_entries;
sub do_hash_operation {
    my ( $tempstore, $op ) = @_;

    my ( $lc_name, $op_name, $record ) = @$op;

    if( $op_name == OP_ADD_EXACT ) {
        my $r = $tempstore->{$lc_name};
        $r = $r ? Storable::thaw($r) : { exact => [], prefix => [] };

        if( $max_locations && @{ $r->{exact} } < $max_locations ) {
            push @{ $r->{exact} }, $record;
            $tempstore->{$lc_name} = Storable::freeze( $r );
        }
        # elsif( $verbose ) {
        #     print STDERR "Warning: $name has more than --locationLimit ($max_locations) distinct locations, not all of them will be indexed.\n";
        # }
    }
    elsif( $op_name == OP_ADD_PREFIX && ! exists $full_entries{$lc_name} ) {
        my $r = $tempstore->{$lc_name};
        $r = $r ? Storable::thaw($r) : { exact => [], prefix => [] };

        my $name = $record;

        my $p = $r->{prefix};
        if( @$p < $max_completions ) {
            if( ! grep $name eq $_, @$p ) {
                push @{ $r->{prefix} }, $name;
                $tempstore->{$lc_name} = Storable::freeze( $r );
            }
        }
        elsif( @{ $r->{prefix} } == $max_completions ) {
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
    my ( $file_record ) = @_;
    if( $file_record->{type} eq 'txt' ) {
        my $input_fh = open_names_file( $file_record->{fullpath} );
        # read the input json partly with low-level parsing so that we
        # can parse incrementally from the filehandle.  names list
        # files can be very big.
        return sub {
            my $t = <$input_fh>;
            if( $t ) {
                $stats{name_input_records}++;
                $stats{total_namerec_bytes} += length $t;
                return eval { JSON::from_json( $t ) };
            }
            return undef;
        };
    }
    elsif( $file_record->{type} eq 'json' ) {
        # read old-style names.json files all from memory
        my $input_fh = open_names_file( $file_record->{fullpath} );


        my $data = JSON::from_json(do {
            local $/;
            my $text = scalar <$input_fh>;
            $stats{total_namerec_bytes} += length $text;
            $text;
        });

        $stats{name_input_records} += scalar @$data;

        open my $nt, '>', $file_record->{namestxt} or die;
        return sub {
            my $rec = shift @$data;
            if( $rec ) {
                $nt->print(JSON::to_json($rec)."\n");
            }
            return $rec;
        };
    }
}

sub open_names_file {
    my ( $infile ) = @_;
    my $gzip = $infile =~ /\.(txt|json)z$/ ? ':gzip' : '';
    open my $fh, "<$gzip", $infile or die "$! reading $infile";
    return $fh;
}
