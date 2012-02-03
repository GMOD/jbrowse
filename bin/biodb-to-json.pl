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

Display a help screen.

=item --conf <conf file>

Required. Path to the configuration file to read.  File must be in JSON format.

=item --ref <ref seq names> | --refid <ref seq ids>

Optional.  Comma-separated list of either reference sequence names or
reference sequence ids for which to process data.

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
use JsonGenerator;
use BioperlFlattener;
use ExternalSorter;
use NameHandler;

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
pod2usage() unless defined $confFile;

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

my $config = JsonGenerator::readJSON($confFile);

eval "require $config->{db_adaptor}; 1" or die $@;

my $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})} or warn $@;
die "Could not open database: $@" unless $db;

if (my $refclass = $config->{'reference class'}) {
    eval {$db->default_class($refclass)};
}
$db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
$db->absolute(1)               if $db->can('absolute');

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.json", [], 1)};

if (defined $refid) {
    @refSeqs = grep { $_->{id} eq $refid } @refSeqs;
    die "Didn't find a refseq with ID $refid (have you run prepare-refseqs.pl to supply information about your reference sequences?)" if $#refSeqs < 0;
} elsif (defined $ref) {
    @refSeqs = grep { $_->{name} eq $ref } @refSeqs;
    die "Didn't find a refseq with name $ref (have you run prepare-refseqs.pl to supply information about your reference sequences?)" if $#refSeqs < 0;
}

die "run prepare-refseqs.pl first to supply information about your reference sequences" if $#refSeqs < 0;

foreach my $seg (@refSeqs) {
    my $segName = $seg->{name};
    print "\nworking on refseq $segName\n";

    mkdir("$trackDir/$segName") unless (-d "$trackDir/$segName");

    my @tracks;
    if (defined $onlyLabel) {
        @tracks = grep { $_->{"track"} eq $onlyLabel } @{$config->{tracks}};
    } else {
        @tracks = @{$config->{tracks}};
    }

    foreach my $track (@tracks) {
        print "working on track " . $track->{"track"} . "\n";
        my %style = ("key" => $track->{"track"},
                     %{$config->{"TRACK DEFAULTS"}},
                     %{$track});
        print "style: " . Dumper(\%style) if ($verbose);

        my @feature_types = @{$track->{"feature"}};
        print "searching for features of type: " . join(", ", @feature_types) . "\n" if ($verbose);
        if ($#feature_types >= 0) {
            my $jsonGen;

            my $trackDirForChrom = 
                sub { "$trackDir/" . $_[0] . "/" . $track->{"track"}; };
            my $nameHandler = NameHandler->new($trackDirForChrom);
            my $nameCallback = sub {
                $_[0]->[$NameHandler::chromIndex] = $segName;
                $nameHandler->addName($_[0]);
            };
            my $iterator = $db->get_seq_stream(-seq_id => $segName,
                                               -type   => \@feature_types);
            my $flattener = BioperlFlattener->new($track->{"track"},
                                                  \%style, [], [],
                                                  $nameCallback);

            my $startCol = BioperlFlattener->startIndex;
            my $endCol = BioperlFlattener->endIndex;

            my $sorter = ExternalSorter->new(
                sub ($$) {
                        $_[0]->[$startCol] <=> $_[1]->[$startCol]
                        ||
                        $_[1]->[$endCol] <=> $_[0]->[$endCol];
                }, $sortMem);

            my $featureCount = 0;
            while (defined(my $feature = $iterator->next_seq)) {
                $sorter->add($flattener->flatten($feature));
                $featureCount++;
            }
            $sorter->finish();
            $nameHandler->finish();

            print "got $featureCount features for " . $track->{"track"} . "\n";
            next unless $featureCount > 0;

            $jsonGen = JsonGenerator->new("$trackDir/$segName/"
                                              . $track->{"track"},
                                          $nclChunk,
                                          $compress, $track->{"track"},
                                          $seg->{name},
                                          $seg->{start},
                                          $seg->{end},
                                          \%style,
                                          $flattener->featureHeaders,
                                          $flattener->subfeatureHeaders,
                                          $featureCount
                                      );

            while (my $row = $sorter->get()) {
                $jsonGen->addFeature($row);
            }
            $jsonGen->generateTrack();

            my $ext = ($compress ? "jsonz" : "json");
            JsonGenerator::writeTrackEntry("$outdir/trackInfo.json",
                                           {
                                               'label' => $track->{"track"},
                                               'key' => $style{"key"},
                                               'url' => "$trackRel/{refseq}/"
                                                   . $track->{"track"}
                                                       . "/trackData.$ext",
                                               'type' => "FeatureTrack",
                                           });
        }
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
