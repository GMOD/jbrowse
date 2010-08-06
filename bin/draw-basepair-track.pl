#!/usr/bin/env perl

use strict;
use warnings;

use POSIX qw (abs ceil);

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use File::Basename;

use ImageTrackRenderer;


my ($path, $trackLabel, $key, $cssClass);
my $outdir = "data";
my $tiledir = "tiles";
my $fgColor = "0,255,0";
my $bgColor = "255,255,255";
my $tileWidth = 2000;
my $trackHeight = 100;
my $thickness = 2;
my $nolinks = 0;

my $usage = <<USAGE;
 USAGE: $0 -gff <GFF file> [-tile <tiles directory>] [-out <JSON directory>] [-tracklabel <track identifier>] [-key <human-readable track name>] [-bgcolor <R,G,B>] [-fgcolor <R,G,B>] [-thickness <line thickness> [-width <tile width>] [-height <tile height>] [-nolinks]

    -tile: defaults to "$tiledir"
    -out: defaults to "$outdir"
    -tracklabel: defaults to wiggle filename
    -key: defaults to track label
    -bgcolor: defaults to "$bgColor"
    -fgcolor: defaults to "$fgColor"
    -thickness: defaults to $thickness
    -width: defaults to $tileWidth
    -height: defaults to $trackHeight
    -nolinks: prevents use of filesystem links to compress duplicate tiles
USAGE

GetOptions("gff=s" => \$path,
	   "tile=s" => \$tiledir,
	   "out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
	   "bgcolor=s" => \$bgColor,
	   "fgcolor=s" => \$fgColor,
	   "width=s" => \$tileWidth,
	   "height=s" => \$trackHeight,
	   "thickness=s" => \$thickness,
	   "nolinks" => \$nolinks);

if (!defined($path)) {
    die $usage;
}

if (!defined($trackLabel)) {
    $trackLabel = $path;
    $trackLabel =~ s/\//_/g;   # get rid of directory separators
}

# create color ranges
my @fg = split (/,/, $fgColor);
my @bg = split (/,/, $bgColor);

my $range = max (map(abs($fg[$_] - $bg[$_]), 0..2));
my @rgb;
for my $n (0..$range) {
    push @rgb, [map ($bg[$_] + ($fg[$_]-$bg[$_])*$n/$range, 0..2)];
}

# load GFF describing basepair locations & intensities; sort by seqname
my %gff;
local *GFF;
open GFF, "<$path" or die "Couldn't open $path : $!";
my ($maxscore, $minscore, $maxlen);
while (my $gffLine = <GFF>) {
    next if $gffLine =~ /^\s*\#/;
    next unless $gffLine =~ /\S/;
    my ($seqname, $source, $feature, $start, $end, $score, $strand, $frame, $group) = split /\t/, $gffLine, 9;
    next if grep (!defined(), $seqname, $start, $end, $score);
    $gff{$seqname} = [] unless exists $gff{$seqname};
    push @{$gff{$seqname}}, [$start, $end, $score];
    if ($score =~ /\d/) {
	$maxscore = $score if !defined($maxscore) || $score > $maxscore;
	$minscore = $score if !defined($minscore) || $score < $minscore;
    }
    my $len = $end - $start;
    $maxlen = $len if !defined($maxlen) || $len > $maxlen;
}
close GFF;

# convert GFF scores into color indices, then sort each sequence's GFF features by increasing color index
while (my ($seqname, $gffArray) = each %gff) {
    @$gffArray = map ([$_->[0], $_->[1], $_->[2]=~/\d/ ? int (.5 + $range * ($_->[2] - $minscore) / ($maxscore - $minscore)) : $range], @$gffArray);
    @$gffArray = sort { $a->[2] <=> $b->[2] } @$gffArray;
}

# create the renderer
my $renderer = ImageTrackRenderer->new ("datadir" => $outdir,
					"tiledir" => $tiledir,
					"tilewidth" => $tileWidth,
					"trackheight" => $trackHeight,
					"tracklabel" => $trackLabel,
					"key" => $key,
					"link" => !$nolinks,
					"drawsub" => sub {
					    my ($im, $seqInfo) = @_;
					    my $seqname = $seqInfo->{"name"};
					    my @color;
					    for my $rgb (@rgb) {
						push @color, $im->colorAllocate (@$rgb);
					    }
					    $im->setThickness ($thickness);
					    for my $gff (@{$gff{$seqname}}) {
						my $start = $im->base_xpos ($gff->[0]) + $im->pixels_per_base / 2;
						my $end = $im->base_xpos ($gff->[1]) + $im->pixels_per_base / 2;
						my $arcMidX = ($start + $end) / 2;
						my $arcWidth = $end - $start;
						my $arcHeight = 2 * $trackHeight * ($gff->[1] - $gff->[0]) / $maxlen;
						# warn "Drawing arc from $start to $end, height $arcHeight";
						$im->arc ($arcMidX, 0, $arcWidth, $arcHeight, 0, 180, $color[$gff->[2]]);
					    }
					});

# run the renderer
$renderer->render;

# all done
exit;


sub max {
    my ($x, @y) = @_;
    foreach my $y (@y) {
	$x = $y if $y > $x;
    }
    return $x;
}
