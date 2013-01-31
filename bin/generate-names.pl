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

=item --sortMem <bytes>

Number of bytes of RAM we are allowed to use for sorting memory.  Default 256 MB.

=item --completionLimit <number>

Maximum number of completions to store for a given prefix.  Default 20.

=item --totalNames <number>

Optional estimate of the total number of names that will go into this
names index.  Used to choose some parameters for how the name index is
built.  If not passed, tries to estimate this based on the size of the
input names files.

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

use PerlIO::gzip;

use JSON 2;

use Bio::JBrowse::HashStore;

use GenomeDB;

my @includedTrackNames;

my $outDir = "data";
my $verbose = 0;
my $help;
my $max_completions = 20;
my $max_locations = 100;
my $thresh;
my $sort_mem = 256 * 2**20;
my $est_total_name_records;
my $hash_bits;
GetOptions("dir|out=s" => \$outDir,
           "completionLimit=i" => \$max_completions,
           "locationLimit=i" => \$max_locations,
           "verbose+" => \$verbose,
           "thresh=i" => \$thresh,
           "sortMem=i" => \$sort_mem,
           "totalNames=i" => \$est_total_name_records,
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
    print STDERR "Tracks:\n".join('', map "    $_->{label}\n", @tracks );
}

# read the name list for each track that has one
my $trackNum = 0;

# find the names files we will be working with
my @names_files = find_names_files();
if( ! @names_files ) {
    warn "WARNING: No feature names found for indexing, only reference sequence names will be indexed.\n";
}

#print STDERR "Names files:\n", map "    $_->{fullpath}\n", @names_files;

# estimate the total number of name records we probably have based on the input file sizes
$est_total_name_records ||= int( (sum( map { -s $_->{fullpath} } @names_files )||0) / 70 );
if( $verbose ) {
    print STDERR "Estimated $est_total_name_records total name records to index.\n";
}

my $nameStore = Bio::JBrowse::HashStore->open(
    dir   => catdir( $outDir, "names" ),
    empty => 1,
    sort_mem => $sort_mem,

    # set the hash size to try to get about 50KB per file, at an
    # average of about 500 bytes per name record, for about 100
    # records per file. if the store has existing data in it, this
    # will be ignored
    hash_bits => $hash_bits || (
        $est_total_name_records
            ? sprintf('%0.0f',max( 4, min( 32, 4*int( log( ($est_total_name_records||0) / 100 )/ 4 / log(2)) )))
            : 12
    ),
);

if( $verbose ) {
    print STDERR "Using ".$nameStore->{hash_bits}."-bit hashing.\n";
}

# insert a name record for all of the reference sequences

my $name_records_iterator = sub {};
my @namerecord_buffer;
for my $ref ( @refSeqs ) {
    push @namerecord_buffer, [ @{$ref}{ qw/ name length name seqDir start end seqChunkSize/ }];
}


my %trackHash;
my @tracksWithNames;
my $record_stream = sub {
    while( ! @namerecord_buffer ) {
        my $nameinfo = $name_records_iterator->() || do {
            my $file = shift @names_files;
            return unless $file;
            #print STDERR "Processing $file->{fullpath}\n";
            $name_records_iterator = make_names_iterator( $file );
            $name_records_iterator->();
        } or return;
        foreach my $alias ( @{$nameinfo->[0]} ) {
            my $track = $nameinfo->[1];
            unless ( defined $trackHash{$track} ) {
                $trackHash{$track} = $trackNum++;
                push @tracksWithNames, $track;
            }
            push @namerecord_buffer, [
                $alias,
                $trackHash{$track},
                @{$nameinfo}[2..$#{$nameinfo}]
                ];
        }
    }
    return shift @namerecord_buffer;
};

# convert the stream of name records into a stream of operations to do
# on the data in the hash store
my @operation_buffer;
my $operation_stream = sub {
    unless( @operation_buffer ) {
        if( my $name_record = $record_stream->() ) {
            push @operation_buffer, make_operations( $name_record );
        }
    }
    return shift @operation_buffer;
};

# sort the stream by hash key to improve cache locality (very
# important for performance)
my $entry_stream = $nameStore->sort_stream( $operation_stream );

# now write it to the store
while( my $entry = $entry_stream->() ) {
    do_operation( $entry, $entry->data );
}

# store the list of tracks that have names
$nameStore->{meta}{track_names} = \@tracksWithNames;
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

use constant OP_ADD_EXACT  => 1;
use constant OP_ADD_PREFIX => 2;

sub make_operations {
    my ( $record ) = @_;

    my $lc_name = lc $record->[0];

    # generate all the prefixes
    my @prefixes;
    {
        my $l = $lc_name;
        chop $l;
        while( $l ) {
            push @prefixes, $l;
            chop $l;
        }
    }

    return (
        [ $lc_name, OP_ADD_EXACT, $record ],
        map [ $_, OP_ADD_PREFIX, $record->[0] ], @prefixes
    );
}


sub do_operation {
    my ( $store_entry, $op ) = @_;

    my ( $lc_name, $op_name, $record ) = @$op;

    my $r = $store_entry->get || { exact => [], prefix => [] };

    if( $op_name == OP_ADD_EXACT ) {
        if( $max_locations && @{ $r->{exact} } < $max_locations ) {
            push @{ $r->{exact} }, $record;
            $store_entry->set( $r );
        }
        # elsif( $verbose ) {
        #     print STDERR "Warning: $name has more than --locationLimit ($max_locations) distinct locations, not all of them will be indexed.\n";
        # }
    }
    elsif( $op_name == OP_ADD_PREFIX ) {
        my $name = $record;

        my $p = $r->{prefix};
        if( @$p < $max_completions ) {
            if( ! grep $name eq $_, @$p ) {
                push @{ $r->{prefix} }, $name;
                $store_entry->set( $r );
            }
        }
        elsif( @{ $r->{prefix} } == $max_completions ) {
            push @{ $r->{prefix} }, { name => 'too many matches', hitLimit => 1 };
            $store_entry->set( $r );
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
            return $t ? eval { JSON::from_json( $t ) } : undef;
        };
    }
    elsif( $file_record->{type} eq 'json' ) {
        # read old-style names.json files all from memory
        my $input_fh = open_names_file( $file_record->{fullpath} );

        my $data = JSON::from_json(do {
            local $/;
            scalar <$input_fh>
        });

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
