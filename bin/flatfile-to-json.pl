#!/usr/bin/perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use Bio::DB::SeqFeature::Store;
use Bio::DB::GFF;
use Bio::FeatureIO;
use JsonGenerator;
use JSON 2;

my ($gff, $gff2, $bed,
    $trackLabel, $key,
    $urlTemplate, $subfeatureClasses, $arrowheadClass, $clientConfig, 
    $thinType, $thickType,
    $types);
my $autocomplete = "none";
my $outdir = "data";
my $cssClass = "feature";
my ($getType, $getPhase, $getSubs, $getLabel) = (0, 0, 0, 0);
GetOptions("gff=s" => \$gff,
           "gff2=s" => \$gff2,
           "bed=s" => \$bed,
	   "out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
	   "cssclass=s" => \$cssClass,
	   "autocomplete=s" => \$autocomplete,
	   "getType" => \$getType,
	   "getPhase" => \$getPhase,
	   "getSubs" => \$getSubs,
	   "getLabel" => \$getLabel,
           "urltemplate=s" => \$urlTemplate,
           "arrowheadClass=s" => \$arrowheadClass,
           "subfeatureClasses=s" => \$subfeatureClasses,
           "clientConfig=s" => \$clientConfig,
           "thinType=s" => \$thinType,
           "thicktype=s" => \$thickType,
           "type=s@" => \$types);
my $trackDir = "$outdir/tracks";

if (!(defined($gff) || defined($gff2) || defined($bed))) {
    print <<USAGE;
USAGE: $0 [--gff <gff3 file> | --gff2 <gff2 file> | --bed <bed file>] [--out <output directory>] --tracklabel <track identifier> --key <human-readable track name> [--cssclass <CSS class for displaying features>] [--autocomplete none|label|alias|all] [--getType] [--getPhase] [--getSubs] [--getLabel] [--urltemplate "http://example.com/idlookup?id={id}"] [--subfeatureClasses <JSON-syntax subfeature class map>] [--clientConfig <JSON-syntax extra configuration for FeatureTrack>]

    --out: defaults to "data"
    --cssclass: defaults to "feature"
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
        e.g. '{"css": "background-color: black;", "histScale": 5}'
    --type: only process features of the given type
USAGE
exit(1);
}

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};

die "run prepare-refseqs.pl first to supply information about your reference sequences" if $#refSeqs < 0;

#default label-extracting function, for GFF
my $labelSub = sub {
    return $_[0]->display_name if ($_[0]->can('display_name') && defined($_[0]->display_name));
    if ($_[0]->can('attributes')) {
	return $_[0]->attributes('load_id') if $_[0]->attributes('load_id');
	return $_[0]->attributes('Alias') if $_[0]->attributes('Alias');
    }
    #return eval{$_[0]->primary_tag};
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
} else {
    die "please specify -gff, -gff2, or -bed";
}

mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

my %style = ("autocomplete" => $autocomplete,
             "type"         => $getType,
             "phase"        => $getPhase,
             "subfeatures"  => $getSubs,
             "class"        => $cssClass,
             "label"        => $getLabel ? $labelSub : 0,
             "key"          => defined($key) ? $key : $trackLabel,
             "urlTemplate"  => $urlTemplate,
             "arrowheadClass" => $arrowheadClass,
             "clientConfig" => $clientConfig);

$style{subfeature_classes} = JSON::from_json($subfeatureClasses)
    if defined($subfeatureClasses);

$style{clientConfig} = JSON::from_json($clientConfig)
    if defined($clientConfig);

my %perChromGens;
foreach my $seqInfo (@refSeqs) {
    $perChromGens{$seqInfo->{"name"}} = JsonGenerator->new($trackLabel,
                                                           $seqInfo->{"name"},
                                                           \%style, [], [],
                                                           $streaming);
}

if ($streaming) {
    my $jsonGen;

    while (my $feat = $stream->next_feature()) {
        $jsonGen = $perChromGens{$feat->seq_id};

        #ignore feature unless we already know about its ref seq
        next unless $jsonGen;

        $jsonGen->addFeature($feat);
    }
}

foreach my $seqInfo (@refSeqs) {
    my $seqName = $seqInfo->{"name"};
    mkdir("$trackDir/$seqName") unless (-d "$trackDir/$seqName");

    my $jsonGen = $perChromGens{$seqName};

    unless ($streaming) {
        print "\nworking on seq $seqName\n";
        my $segment = $db->segment("-name" => $seqName);
        if ($segment) {
            my @queryArgs;
            if (defined($types)) {
                @queryArgs = ("-types" => $types);
            }

            my @features = $segment->features(@queryArgs);

            $jsonGen->addFeature($_) foreach (@features);
        } else {
            print "Didn't find a segment with name $seqName\n";
        }
    }
    next if $jsonGen->featureCount == 0;

    print $seqName . "\t" . $jsonGen->featureCount . "\n";

    $jsonGen->generateTrack("$trackDir/$seqName/$trackLabel/", 5000);
}

JsonGenerator::modifyJSFile("$outdir/trackInfo.js", "trackInfo",
    sub {
        my $trackList = shift;
        my $i;
        for ($i = 0; $i <= $#{$trackList}; $i++) {
            last if ($trackList->[$i]->{'label'} eq $trackLabel);
        }
        $trackList->[$i] =
        {
            'label' => $trackLabel,
            'key' => $style{"key"},
            'url' => "$trackDir/{refseq}/$trackLabel/trackData.json",
            'type' => "FeatureTrack",
        };
        return $trackList;
    });

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
