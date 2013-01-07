#!/usr/bin/env perl

=head1 NAME

generate-names.pl - generate a global index of feature names

=head1 USAGE

  generate-names.pl                        \
      [ --out <output directory> ]         \
      [ --thresh <threshold> ]             \
      [ --verbose ]

=head1 OPTIONS

=over 4

=item --out <directory>

Data directory to process.  Default 'data/'.

=item --tracks <trackname>[,...]

Comma-separated list of which tracks to include in the names index.  If
not passed, all tracks are indexed.

=item --thresh <threshold>

Optional LazyPatricia chunking threshold, in bytes.  Default 100kb.  See
L<LazyPatricia> for details.

=item --completionLimit <number>

Maximum number of completions to store for a given prefix.  Default 50.

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
use IO::File;
use Pod::Usage;

use JSON 2;


use LazyPatricia;

use Bio::JBrowse::HashStore;
use GenomeDB;

use Data::Dumper;
$Data::Dumper::Indent = 1;

my %trackHash;
my @includedTrackNames;
my @tracksWithNames;

# TODO: change to hash-based storage, pre-generate prefixes

my $outDir = "data";
my $thresh = 100 * 2**10;
my $verbose = 0;
my $incremental;
my $help;
my $max_completions = 50;
GetOptions("dir|out=s" => \$outDir,
           "thresh=i" => \$thresh,
           "completionLimit=i" => \$max_completions,
           "verbose+" => \$verbose,
           "add"      => \$incremental,
           'tracks=s' => \@includedTrackNames,
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
my $nameStore = Bio::JBrowse::HashStore->open( dir => catdir( $outDir, "names" ) );

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


# clear out old data
$nameStore->empty unless $incremental;

# read the name list for each track that has one
my $trackNum = 0;

for my $ref (@refSeqs) {

    insert( $nameStore, $ref->{name}, [ @{$ref}{ qw/ name length name seqDir start end seqChunkSize/ }] );

    for my $track (@tracks) {
        my $dir = catdir( $outDir,
                          "tracks",
                          $track->{label},
                          $ref->{name}
                        );

        # read either names.txt or names.json files
        my $name_records_iterator;
        my $names_txt  = catfile( $dir, 'names.txt'  );
        if( -f $names_txt ) {
            $name_records_iterator = make_namestxt_iterator( $names_txt );
        }
        else {
            my $names_json = catfile( $dir, 'names.json' );
            if( -f $names_json ) {
                $name_records_iterator = make_namesjson_iterator( $names_json );
            }
            else {
                next;
            }
        }

        while( my $nameinfo = $name_records_iterator->() ) {
            foreach my $alias ( @{$nameinfo->[0]} ) {
                my $track = $nameinfo->[1];
                unless( defined $trackHash{$track} ) {
                    $trackHash{$track} = $trackNum++;
                    push @tracksWithNames, $track;
                }

                insert( $nameStore, $alias,
                        [ $alias,
                          $trackHash{$track},
                          @{$nameinfo}[2..$#{$nameinfo}]
                        ]
                      );
            }
        }
    }
}

# store the list of tracks that have names
$nameStore->set( 'JBROWSE_TRACKS_WITH_NAMES', \@tracksWithNames );

# set up the name store in the trackList.json
$gdb->modifyTrackList( sub {
    my ( $data ) = @_;
    $data->{names}{type} = 'Hash';
    $data->{names}{url}  = 'names/';
    return $data;
});

sub insert {
    my ( $store, $name, $record ) = @_;

    my $lc = lc $name;

    { # store the exact name match
        my $r = $store->get( $lc ) || { exact => [], prefix => [] };
        push @{ $r->{exact} }, $record;
        $store->set( $lc, $r );
    }

    # generate all the prefixes
    my @prefixes;
    chop $lc;
    while( $lc ) {
        push @prefixes, $lc;
        chop $lc;
    }

    # store the prefixes
    for my $prefix ( @prefixes ) {
        my $r = $store->get( $prefix ) || { exact => [], prefix => [] };
        if( @{ $r->{prefix} } < $max_completions ) {
            push @{ $r->{prefix } }, $record;
            $store->set( $prefix, $r );
        }
        elsif( @{ $r->{prefix} } == $max_completions ) {
            push @{ $r->{prefix} }, { name => 'too many matches', hitLimit => 1 };
            $store->set( $prefix, $r );
        }
    }
}


# each of these takes an input filename and returns a subroutine that
# returns name records until there are no more, for either names.txt
# files or old-style names.json files
sub make_namestxt_iterator {
    my ( $infile ) = @_;
    my $input_fh = open_names_file( $infile );
    # read the input json partly with low-level parsing so that we
    # can parse incrementally from the filehandle.  names.txt
    # files can be very big.
    return sub { <$input_fh> };
}
sub make_namesjson_iterator {
    my ( $infile ) = @_;
    my $input_fh = open_names_file( $infile );

    my $data = JSON::from_json(do {
        local $/;
        scalar <$input_fh>
    });

    return sub { shift @$data };
}
sub open_names_file {
    my ( $infile ) = @_;
    my $gzip = $infile =~ /\.(txt|json)z$/ ? ':gzip' : '';
    open my $fh, "<$gzip", $infile or die "$! reading $infile";
    return $fh;
}
