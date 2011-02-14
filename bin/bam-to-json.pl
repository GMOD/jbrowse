#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use JsonGenerator;
use NCLSorter;
use JSON 2;
use Bio::DB::Sam;


my ($tracks, $cssClass, $arrowheadClass, $subfeatureClasses, $clientConfig,
    $bamFile, $trackLabel, $key, $nclChunk, $compress);
my $defaultClass = "basic";
$cssClass = $defaultClass;
my $outdir = "data";
GetOptions("out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
           "bam=s" => \$bamFile,
           "cssClass=s", \$cssClass,
           "clientConfig=s", \$clientConfig,
           "nclChunk=i" => \$nclChunk,
           "compress" => \$compress);

if (!defined($bamFile)) {
    print <<HELP;
USAGE: $0 --bam <bam file> [--out <output directory] [--tracklabel <track identifier>] [--key <human-readable track name>] [--cssClass <class>] [--clientConfig <JSON client config>] [--nclChunk <NCL chunk size in bytes>] [--compress]

    --bam: bam file name
    --out: defaults to "data"
    --cssclass: defaults to "basic"
    --clientConfig: extra configuration for the client, in JSON syntax
        e.g. '{"featureCss": "background-color: #668; height: 8px;", "histScale": 5}'
    --nclChunk: size of the individual NCL chunks
    --compress: compress the output (requires some web server configuration)
HELP

    exit(1);
}

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

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};

my $bam = Bio::DB::Bam->open($bamFile);
my $hdr = $bam->header();
# open the bam index, creating it if necessary
my $index = Bio::DB::Bam->index($bamFile, 1);

my @bamHeaders = ("start", "end", "strand");
my $startIndex = 0;
my $endIndex = 1;

my %style = ("class" => $cssClass,
             "key" => $key);

$style{clientConfig} = JSON::from_json($clientConfig)
    if (defined($clientConfig));

if ($cssClass eq $defaultClass) {
    $style{clientConfig}->{featureCss} = "background-color: #668; height: 8px;"
        unless defined($style{clientConfig}->{featureCss});
    $style{clientConfig}->{histCss} = "background-color: #88F"
        unless defined($style{clientConfig}->{histCss});
    $style{clientConfig}->{histScale} = 2
        unless defined($style{clientConfig}->{histScale});
}

foreach my $seqInfo (@refSeqs) {
    my ($tid, $start, $end) = $hdr->parse_region($seqInfo->{name});
    mkdir("$trackDir/" . $seqInfo->{name})
        unless (-d "$trackDir/" . $seqInfo->{name});

    if (defined($tid)) {
        my $jsonGen = JsonGenerator->new("$trackDir/" . $seqInfo->{name}
                                         . "/" . $trackLabel,
                                         $nclChunk,
                                         $compress, $trackLabel,
                                         $seqInfo->{name},
                                         $seqInfo->{start},
                                         $seqInfo->{end},
                                         \%style, \@bamHeaders);

        my $sorter = NCLSorter->new(sub { $jsonGen->addFeature($_[0]) },
                                    $startIndex, $endIndex);

        $index->fetch($bam, $tid, $start, $end,
                      sub { $sorter->addSorted(align2array($_[0])) });
        $sorter->flush();

        $jsonGen->generateTrack();
    }
}

my $ext = ($compress ? "jsonz" : "json");
JsonGenerator::writeTrackEntry(
    "$outdir/trackInfo.js",
    {
        'label' => $trackLabel,
        'key' => $key,
        'url' => "$trackRel/{refseq}/" . $trackLabel . "/trackData.$ext",
        'type' => "FeatureTrack",
    }
);


sub align2array {
    my $align = shift;
    return [$align->pos,
            $align->calend + 1,
            $align->reversed ? -1 : 1];
}
