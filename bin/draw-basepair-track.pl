#!/usr/bin/env perl

=head1 NAME

draw-basepair-track.pl - make a track that draws semicircular diagrams of DNA base pairing

=head1 USAGE

    bin/draw-basepair-track.pl              \
        --gff <GFF file>                     \
        [--out <JSON directory>]             \
        [--tracklabel <track identifier>]    \
        [--key <human-readable track name>]  \
        [--bgcolor <R,G,B>]                  \
        [--fgcolor <R,G,B>]                  \
        [--thickness <line thickness> ]      \
        [--width <tile width>]               \
        [--height <tile height>]             \
        [--nolinks]

=head1 OPTIONS

=over 4

=item --out <val>

Data directory to write to.  Defaults to C<data/>.

=item --trackLabel <val>

Unique name for the track.  Defaults to the wiggle filename.

=item --key <val>

Human-readable name for the track.  Defaults to be the same as the
C<--trackLabel>.

=item --bgcolor <R,G,B>

Background color for the image track.  Defaults to C<255,255,255>,
which is white.

=item --fgcolor <R,G,B>

Foreground color for the track, i.e. the color of the lines that are
drawn.  Defaults to C<0,255,0>, which is bright green.

=item --thickness <pixels>

Thickness in pixels of the drawn lines.  Defaults to 2.

=item --width <pixels>

Width in pixels of each image tile.  Defaults to 2000.

=item --height <pixels>

Height in pixels of the image track.  Defaults to 100.

=item --nolinks

If passed, do not use filesystem hardlinks to compress duplicate
tiles.

=back

=cut

use strict;
use warnings;

use POSIX qw (abs ceil);

use FindBin qw($Bin);
use File::Basename;
use Getopt::Long;
use Pod::Usage;

use lib "$Bin/../lib";
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
my $help;

GetOptions( "gff=s"        => \$path,
	    "tile=s"       => \$tiledir,
	    "out=s"        => \$outdir,
	    "tracklabel|trackLabel=s" => \$trackLabel,
	    "key=s"        => \$key,
	    "bgcolor=s"    => \$bgColor,
	    "fgcolor=s"    => \$fgColor,
	    "width=s"      => \$tileWidth,
	    "height=s"     => \$trackHeight,
	    "thickness=s"  => \$thickness,
	    "nolinks"      => \$nolinks,
            "help|h|?"     => \$help,
) or pod2usage();

pod2usage( -verbose => 2 ) if $help;
pod2usage( 'must provide a --gff file' ) unless defined $path;

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
