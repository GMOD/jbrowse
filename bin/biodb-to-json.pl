#!/usr/bin/env perl

=head1 NAME

biodb-to-json.pl - format JBrowse JSON as described in a configuration file

=head1 DESCRIPTION

Reads a configuration file, in a format currently documented in
docs/config.html, and formats JBrowse JSON from the data sources
defined in it.

=head1 USAGE

  bin/biodb-to-json.pl                               \
    --conf <conf file>                               \
    [--ref <ref seq names> | --refid <ref seq ids>]  \
    [--track <track name>]                           \
    [--out <output directory>]                       \
    [--compress]


  # format the example volvox track data
  bin/biodb-to-json.pl --conf docs/tutorial/conf_files/volvox.json

=head2 OPTIONS

=over 4

=item --help | -? | -h

Display an extended help screen.

=item --conf <conf file>

Required. Path to the configuration file to read.  File must be in JSON format.

=item --ref <ref seq name> | --refid <ref seq id>

Optional.  Single reference sequence name or id for which to process data.

By default, processes all data.

=item --out <output directory>

Directory where output should go.  Default: data/

=item --compress

If passed, compress the output with gzip (requires some web server configuration to serve properly).

=back

=cut

use strict;
use warnings;

use FindBin qw($Bin);
use Pod::Usage;
use lib "$Bin/../lib";

use Getopt::Long;
use Data::Dumper;
use GenomeDB;
use BioperlFlattener;
use ExternalSorter;

my ($confFile, $ref, $refid, $onlyLabel, $verbose, $nclChunk, $compress);
my $outdir = "data";
my $sortMem = 1024 * 1024 * 512;
my $help;
GetOptions("conf=s" => \$confFile,
	   "ref=s" => \$ref,
	   "refid=s" => \$refid,
	   "track=s" => \$onlyLabel,
	   "out=s" => \$outdir,
           "v+" => \$verbose,
           "nclChunk=i" => \$nclChunk,
           "compress" => \$compress,
           "sortMem=i" =>\$sortMem,
           "help|?|h" => \$help,
) or pod2usage();

pod2usage( -verbose => 2 ) if $help;
pod2usage( 'must provide a --conf argument' ) unless defined $confFile;

if (!defined($nclChunk)) {
    # default chunk size is 50KiB
    $nclChunk = 50000;
    # $nclChunk is the uncompressed size, so we can make it bigger if
    # we're compressing
    $nclChunk *= 4 if $compress;
}

my $trackRel = "tracks";
my $trackDir = "$outdir/$trackRel";
mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

# read our conf file
die "conf file '$confFile' not found or not readable" unless -r $confFile;
my $config = JsonGenerator::readJSON($confFile);

# open and configure the db defined in the config file
eval "require $config->{db_adaptor}; 1" or die $@;
my $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})} or warn $@;
die "Could not open database: $@" unless $db;
if (my $refclass = $config->{'reference class'}) {
    eval {$db->default_class($refclass)};
}
$db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
$db->absolute(1)               if $db->can('absolute');

# determine which reference sequences we'll be operating on
my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.json", [], 1)};
if (defined $refid) {
    @refSeqs = grep { $_->{id} eq $refid } @refSeqs;
    die "Didn't find a refseq with ID $refid (have you run prepare-refseqs.pl to supply information about your reference sequences?)" if $#refSeqs < 0;
} elsif (defined $ref) {
    @refSeqs = grep { $_->{name} eq $ref } @refSeqs;
    die "Didn't find a refseq with name $ref (have you run prepare-refseqs.pl to supply information about your reference sequences?)" if $#refSeqs < 0;
}

die "run prepare-refseqs.pl first to supply information about your reference sequences" if $#refSeqs < 0;

my $gdb = GenomeDB->new( $outdir );

foreach my $seg (@refSeqs) {
    my $segName = $seg->{name};
    print "\nworking on refseq $segName\n";

    # get the list of tracks we'll be operating on
    my @tracks = defined $onlyLabel
                   ? grep { $_->{"track"} eq $onlyLabel } @{$config->{tracks}}
                   : @{$config->{tracks}};

    foreach my $trackCfg (@tracks) {
        my $trackLabel = $trackCfg->{'track'};
        print "working on track $trackLabel\n";

        my %mergedTrackCfg = (
            %{$config->{"TRACK DEFAULTS"}},
            "key" => $trackLabel,
            %$trackCfg,
            compress => $compress,
            );
        print "mergedTrackCfg: " . Dumper(\%mergedTrackCfg) if $verbose;

        my $track = $gdb->getTrack( $trackLabel )
                 || $gdb->createFeatureTrack( $trackLabel,
                                              \%mergedTrackCfg,
                                              $mergedTrackCfg{key},
                                             );

        my @feature_types = @{$trackCfg->{"feature"}};
        next unless @feature_types;

        print "searching for features of type: " . join(", ", @feature_types) . "\n" if $verbose;
        # get the stream of the right features from the Bio::DB
        my $iterator = $db->get_seq_stream( -seq_id => $segName,
                                            -type   => \@feature_types);


        # make the flattener, which converts bioperl features to arrayrefs
        my $flattener = BioperlFlattener->new(
                            $trackCfg->{"track"},
                            \%mergedTrackCfg,
                            [],
                            [],
                        );

        # start loading the track
        $track->startLoad(
             $segName,
             $nclChunk,
             [ {
                 attributes  => $flattener->featureHeaders,
                 isArrayAttr => { Subfeatures => 1 },
               },
               {
                 attributes  => $flattener->subfeatureHeaders,
                 isArrayAttr => {},
               },
             ],
            );


        # make a sorting object, incrementally sorts the
        # features according to the passed callback
        my $sorter =  do {
            my $startCol = BioperlFlattener->startIndex;
            my $endCol   = BioperlFlattener->endIndex;
            ExternalSorter->new(
                sub ($$) {
                    $_[0]->[$startCol] <=> $_[1]->[$startCol]
                  ||
                    $_[1]->[$endCol]   <=> $_[0]->[$endCol]
                },
                $sortMem
            );
        };

        # go through the features and put them in the sorter
        my $featureCount = 0;
        while( my $feature = $iterator->next_seq ) {

            # load the feature's name record into the track
            if( my $namerec = $flattener->flatten_to_name( $feature, $segName ) ) {
                $track->nameHandler->addName( $namerec );
            }

            # load the flattened feature itself into the sorted, so we
            # can load the actual feature data in sorted order below
            my $row = $flattener->flatten_to_feature( $feature );
            $sorter->add( $row );
            $featureCount++;
        }
        $sorter->finish();

        print "got $featureCount features for $trackCfg->{track}\n";
        next unless $featureCount > 0;

        # iterate through the sorted features in the sorter and
        # write them out
        while( my $row = $sorter->get ) {
            $track->addSorted( $row );
        }

        # finally, write the entry in the track list for the track we
        # just made
        $gdb->writeTrackEntry( $track );
    }
}

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
