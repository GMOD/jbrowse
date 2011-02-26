#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use Bio::DB::SeqFeature::Store;
use Bio::DB::GFF;
use Bio::FeatureIO;
use JsonGenerator;
use BioperlFlattener;
use ExternalSorter;
use NameHandler;
use JSON 2;

my ($gff, $gff2, $bed, $bam, $trackLabel, $key,
    $urlTemplate, $subfeatureClasses, $arrowheadClass,
    $clientConfig, $extraData, $thinType, $thickType,
    $types, $nclChunk);
my $autocomplete = "none";
my $outdir = "data";
my $cssClass = "feature";
my ($getType, $getPhase, $getSubs, $getLabel, $compress) = (0, 0, 0, 0, 0);
my $sortMem = 1024 * 1024 * 512;
GetOptions("gff=s" => \$gff,
           "gff2=s" => \$gff2,
           "bed=s" => \$bed,
           "bam=s" => \$bam,
	   "out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
	   "cssClass=s" => \$cssClass,
	   "autocomplete=s" => \$autocomplete,
	   "getType" => \$getType,
	   "getPhase" => \$getPhase,
	   "getSubs" => \$getSubs,
	   "getLabel" => \$getLabel,
           "urltemplate=s" => \$urlTemplate,
           "extraData=s" => \$extraData,
           "arrowheadClass=s" => \$arrowheadClass,
           "subfeatureClasses=s" => \$subfeatureClasses,
           "clientConfig=s" => \$clientConfig,
           "thinType=s" => \$thinType,
           "thicktype=s" => \$thickType,
           "type=s@" => \$types,
           "nclChunk=i" => \$nclChunk,
           "compress" => \$compress,
           "sortMem=i" =>\$sortMem);
# parent path of track-related dirs, relative to $outdir
my $trackRel = "tracks";

my %refSeqs =
    map {
        $_->{name} => $_
    } @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};

die "run prepare-refseqs.pl first to supply information about your reference sequences" unless (scalar keys %refSeqs);

if (!(defined($gff) || defined($gff2) || defined($bed) || defined($bam)) || !defined($trackLabel)) {
    print "The --tracklabel parameter is required\n"
        unless defined($trackLabel);
    print "You must supply either a --gff, -gff2, or --bed parameter\n"
        unless (defined($gff) || defined($gff2) || defined($bed) || defined($bam));
    print <<USAGE;
USAGE: $0 [--gff <gff3 file> | --gff2 <gff2 file> | --bed <bed file>] [--out <output directory>] --tracklabel <track identifier> --key <human-readable track name> [--cssClass <CSS class for displaying features>] [--autocomplete none|label|alias|all] [--getType] [--getPhase] [--getSubs] [--getLabel] [--urltemplate "http://example.com/idlookup?id={id}"] [--extraData <attribute>] [--subfeatureClasses <JSON-syntax subfeature class map>] [--clientConfig <JSON-syntax extra configuration for FeatureTrack>]

    --out: defaults to "data"
    --cssClass: defaults to "feature"
    --autocomplete: make these features searchable by their "label", by their "alias"es, both ("all"), or "none" (default).
    --getType: include the type of the features in the json
    --getPhase: include the phase of the features in the json
    --getSubs:  include subfeatures in the json
    --getLabel: include a label for the features in the json
    --urltemplate: template for a URL that clicking on a feature will navigate to
    --arrowheadClass: CSS class for arrowheads
    --subfeatureClasses: CSS classes for each subfeature type, in JSON syntax
        e.g. '{"CDS": "transcript-CDS", "exon": "transcript-exon"}'
    --clientConfig: extra configuration for the client, in JSON syntax
        e.g. '{"featureCss": "background-color: #668; height: 8px;", "histScale": 2}'
    --type: only process features of the given type
    --nclChunk: NCList chunk size; if you get "json text or perl structure exceeds maximum nesting level" errors, try setting this lower (default: $nclChunk)
    --extraData: a map of feature attribute names to perl subs that extract information from the feature object
        e.g. '{"protein_id" : "sub {shift->attributes(\"protein_id\");} "}'
    --compress: compress the output (requires some web server configuration)
    --sortMem: the amount of memory in bytes to use for sorting
USAGE
exit(1);
}

if (!defined($nclChunk)) {
    # default chunk size is 50KiB
    $nclChunk = 50000;
    # $nclChunk is the uncompressed size, so we can make it bigger if
    # we're compressing
    $nclChunk *= 4 if $compress;
}

#default label-extracting function, for GFF
my $labelSub = sub {
    return $_[0]->display_name if ($_[0]->can('display_name') && defined($_[0]->display_name));
    if ($_[0]->can('attributes')) {
	return $_[0]->attributes('load_id') if $_[0]->attributes('load_id');
	return $_[0]->attributes('Alias') if $_[0]->attributes('Alias');
    }
    #return eval{$_[0]->primary_tag};
};

my $idSub = sub {
    return $_[0]->load_id if ($_[0]->can('load_id') && defined($_[0]->load_id));
    return $_[0]->can('primary_id') ? $_[0]->primary_id : $_[0]->id;
};

my $streaming = 0;
my ($db, $stream);
if ($gff) {
    $db = Bio::DB::SeqFeature::Store->new(-adaptor => 'memory',
                                          -dsn     => $gff);
} elsif ($gff2) {
    $db = Bio::DB::GFF->new(-adaptor => 'memory',
                            -gff => $gff2);
} elsif ($bed) {
    $stream = Bio::FeatureIO->new(-format => 'bed', -file => $bed,
                                  ($thinType ? ("-thin_type" => $thinType) : ()),
                                  ($thickType ? ("-thick_type" => $thickType) : ()) );
    $streaming = 1;
    $labelSub = sub {
        #label sub for features returned by Bio::FeatureIO::bed
        return $_[0]->name;
    };
} elsif ($bam){
    die "BAM support has been moved to a separate program: bam-to-json.pl";
} else {
    die "please specify -gff, -gff2, or -bed";
}

mkdir($outdir) unless (-d $outdir);
mkdir("$outdir/$trackRel") unless (-d "$outdir/$trackRel");

my %style = ("autocomplete" => $autocomplete,
             "type"         => $getType,
             "phase"        => $getPhase,
             "subfeatures"  => $getSubs,
             "class"        => $cssClass,
             "label"        => ($getLabel || ($autocomplete ne "none")) ?
                                $labelSub : 0,
             "idSub"        => $idSub,
             "key"          => defined($key) ? $key : $trackLabel,
             "urlTemplate"  => $urlTemplate,
             "arrowheadClass" => $arrowheadClass,
             "clientConfig" => $clientConfig);

$style{subfeature_classes} = JSON::from_json($subfeatureClasses)
    if defined($subfeatureClasses);

$style{clientConfig} = JSON::from_json($clientConfig)
    if defined($clientConfig);
    
$style{extraData} = JSON::from_json($extraData)
    if defined($extraData);

my $trackDirForChrom = sub { "$outdir/$trackRel/" . $_[0] . "/$trackLabel"; };
my $nameHandler = NameHandler->new($trackDirForChrom);
my $nameCallback = sub { $nameHandler->addName($_[0]) };
my $flattener = BioperlFlattener->new($trackLabel,
                                      \%style, [], [],
                                      $nameCallback);

my $startIndex = BioperlFlattener->startIndex;
my $endIndex = BioperlFlattener->endIndex;

# The ExternalSorter will get [chrom, [start, end, ...]] arrays
my $sorter = ExternalSorter->new(
    sub ($$) {
        $_[0]->[0] cmp $_[1]->[0]
            ||
        $_[0]->[1]->[$startIndex] <=> $_[1]->[1]->[$startIndex]
            ||
        $_[1]->[1]->[$endIndex] <=> $_[0]->[1]->[$endIndex];
    }, $sortMem);

my %featureCounts;

if ($streaming) {
    while (my $feat = $stream->next_feature()) {
        my $chrom =
            ref($feat->seq_id) ? $feat->seq_id->value : $feat->seq_id;
        $featureCounts{$chrom} += 1;
        $sorter->add([$chrom, $flattener->flatten($feat)]);
    }
} else {
    my @queryArgs;
    if (defined($types)) {
        @queryArgs = ("-type" => $types);
    }

    my $iterator = $db->get_seq_stream(@queryArgs);
    while (my $feat = $iterator->next_seq) {
        my $chrom =
            ref($feat->seq_id) ? $feat->seq_id->value : $feat->seq_id;
        $featureCounts{$chrom} += 1;
        $sorter->add([$chrom, $flattener->flatten($feat)]);
    }
}
$sorter->finish();
$nameHandler->finish();

my $curChrom;
my $jsonGen;
my $totalMatches = 0;

while (1) {
    my $feat = $sorter->get();

    if ((!defined($feat))
        || (!defined($curChrom))
        || ($curChrom ne $feat->[0])) {

        if ($jsonGen && $jsonGen->hasFeatures && $refSeqs{$curChrom}) {
            print $curChrom . "\t" . $jsonGen->featureCount . "\n";
            $jsonGen->generateTrack();
        }

        if (defined($feat)) {
            $curChrom = $feat->[0];
            next unless defined($refSeqs{$curChrom});
            mkdir("$outdir/$trackRel/$curChrom")
                unless (-d "$outdir/$trackRel/$curChrom");
            $jsonGen = JsonGenerator->new("$outdir/$trackRel/$curChrom/$trackLabel",
                                          $nclChunk,
                                          $compress, $trackLabel,
                                          $curChrom,
                                          $refSeqs{$curChrom}->{start},
                                          $refSeqs{$curChrom}->{end},
                                          \%style, $flattener->featureHeaders,
                                          $flattener->subfeatureHeaders,
                                          $featureCounts{$curChrom});
        } else {
            last;
        }
    }
    next unless defined($refSeqs{$curChrom});
    $totalMatches++;
    $jsonGen->addFeature($feat->[1]);
}

my $ext = ($compress ? "jsonz" : "json");
JsonGenerator::writeTrackEntry("$outdir/trackInfo.js",
                               {
                                   'label' => $trackLabel,
                                   'key' => $style{"key"},
                                   'url' => "$trackRel/{refseq}/"
                                       . $trackLabel
                                       . "/trackData.$ext",
                                       'type' => "FeatureTrack",
                               });

# If no features are found, check for mistakes in user input
if(!$totalMatches && defined($types)) {
    print STDERR "No matches found for types\n";
    exit(1);
}

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
