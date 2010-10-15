#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use JsonGenerator;
use JSON 2;
use Bio::DB::Sam;


my ($tracks, $arrowheadClass, $subfeatureClasses, $clientConfig, $bamFile,
    $trackLabel, $key);
my $cssClass = "basic";
my $outdir = "data";
my $nclChunk = 2000;
GetOptions("out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
           "bam=s" => \$bamFile,
           "cssClass=s", \$cssClass,
           "clientConfig=s", \$clientConfig,
           "nclChunk=i" => \$nclChunk);

my $trackDir = "$outdir/tracks";
mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};

my $bam = Bio::DB::Bam->open($bamFile);
my $hdr = $bam->header();
# open the bam index, creating it if necessary
my $index = Bio::DB::Bam->index($bamFile, 1);

my @bamHeaders = ("start", "end");

my %style = ("class" => $cssClass,
             "key" => $key)

$style{clientConfig} = $clientConfig if (defined($clientConfig));

foreach my $seqInfo (@refSeqs) {
    my ($tid, $start, $end) = $hdr->parse_region($seqInfo->{"name"});
    if (defined($tid)) {
        my $jsonGen = JsonGenerator->new($trackLabel,
                                         $seqInfo->{"name"},
                                         \%style, \@bamHeaders);

        $index->fetch($bam, $tid, $start, $end
                      sub {
                          my $align = shift;
                          $jsonGen->addFeature(align2array($align));
                      });

        $jsonGen->generateTrack("$trackDir/"
                                    . $seqInfo->{name} . "/"
                                        . $trackLabel,
                                $nclChunk, $ref->{start}, $ref->{end});

    }
}

JsonGenerator::writeTrackEntry(
    "$outdir/trackInfo.js",
    {
        'label' => $trackLabel,
        'key' => $key,
        'url' => "$trackDir/{refseq}/" . $trackLabel . "/trackData.json",
        'type' => "FeatureTrack",
    }
);


sub align2array {
    my $align = shift;
    return [$align->pos,
            $align->calend + 1];
}
