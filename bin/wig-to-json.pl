#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use File::Basename;
use JsonGenerator;

my ($path, $trackLabel, $key, $cssClass);
my $outdir = "data";
my $tileRel = "tiles";
my $fgColor = "105,155,111";
my $bgColor = "255,255,255";
my $tileWidth = 2000;
my $trackHeight = 100;
my $min = "";
my $max = "";

my $wig2png = "$Bin/wig2png";
unless (-x $wig2png) {
    die "Can't find binary executable $wig2png (try typing 'make' in jbrowse root directory?)";
}

my $usage = <<USAGE;
 USAGE: $0 --wig <wiggle file> [--tile <tiles directory>] [--out <JSON directory>] [--tracklabel <track identifier>] [--key <human-readable track name>] [--bgcolor <R,G,B>] [--fgcolor <R,G,B>] [--width <tile width>] [--height <tile height>] [--min <min> --max <max>]

    --out: directory where the output will go (defaults to "$outdir")
    --tile: directory within the --out directory where tiles are stored
            (defaults to "$tileRel")
    --tracklabel: defaults to wiggle filename
    --key: defaults to track label
    --bgcolor: defaults to "$bgColor"
    --fgcolor: defaults to "$fgColor"
    --width: defaults to $tileWidth
    --height: defaults to $trackHeight
    --min: lowest value in wig file
    --max: highest value in wig file
        if min and max are not supplied, an extra pass through
        the wig file will be made to determine them
USAGE

GetOptions("wig=s" => \$path,
	   "tile=s" => \$tileRel,
	   "out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
	   "bgcolor=s" => \$bgColor,
	   "fgcolor=s" => \$fgColor,
	   "width=s" => \$tileWidth,
	   "height=s" => \$trackHeight,
           "min=f" => \$min,
           "max=f" => \$max);

if (!defined($path)) {
    die $usage;
}

my $trackRel = "tracks";
my $trackDir = "$outdir/$trackRel";

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};
die "run prepare-refseqs.pl first to supply information about your reference sequences" if $#refSeqs < 0;

$trackLabel = basename($path) unless defined $trackLabel;
my $tilesubdir = "$outdir/$tileRel/$trackLabel";

mkdir($outdir) unless (-d $outdir);
mkdir("$outdir/$tileRel") unless (-d "$outdir/$tileRel");
mkdir($tilesubdir) unless (-d $tilesubdir);
mkdir($trackDir) unless (-d $trackDir);

my $minopt = length($min) ? "--min-value $min" : "";
my $maxopt = length($max) ? "--max-value $max" : "";
system "$wig2png $path --outdir \"$outdir\" --png-dir \"$tileRel\" --json-dir \"$trackDir\" --track-label \"$trackLabel\" --tile-width $tileWidth --track-height $trackHeight --background-color $bgColor --foreground-color $fgColor $minopt $maxopt";

foreach my $seqInfo (@refSeqs) {
    my $seqName = $seqInfo->{"name"};
    print "\nworking on seq $seqName\n";
    mkdir("$tilesubdir/$seqName") unless (-d "$tilesubdir/$seqName");

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
			'key' => defined($key) ? $key : $trackLabel,
			'url' => "$trackRel/{refseq}/$trackLabel.json",
			'type' => "ImageTrack",
		       };
		     return $trackList;
		 });
}

=head1 AUTHORS

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Ian Holmes E<lt>ihh@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
