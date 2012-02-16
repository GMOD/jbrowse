#!/usr/bin/env perl

=head1 NAME

wig-to-json.pl - format graph images of Wiggle (.wig) data for use by JBrowse

=head1 USAGE

  wig-to-json.pl                            \
      --wig <wiggle file>                   \
      [ --tile <tiles directory> ]          \
      [ --out <JSON directory> ]            \
      [ --tracklabel <track identifier> ]   \
      [ --key <human-readable track name> ] \
      [ --bgcolor <R,G,B> ]                 \
      [ --fgcolor <R,G,B> ]                 \
      [ --width <tile width> ]              \
      [ --height <tile height> ]            \
      [ --min <min> --max <max> ]

=head1 OPTIONS

=over 4

=item --wig <file>

Required.  Wiggle file to process.

=item --out <dir>

Directory where the output will go.  Defaults to "data/".

=item --tile

Directory within the --out directory where tiles are stored.  Defaults
to "tiles".

=item --trackLabel <label>

Unique label for the track.  Defaults to wiggle filename.

=item --key <key>

Human-readable name for the track.  Defaults to the same value as the
--trackLabel.

=item --bgcolor <red>,<green>,<blue>

RGB color of wiggle track background, in the form of three
comma-separated numbers giving red, green, and blue color values
respectively, in the range 0-255.  Defaults to '255,255,255', which is
white.

Example:

  --bgcolor 255,255,255

=item --fgcolor <red>,<green>,<blue>

RGB color of wiggle track foreground (i.e. data graph).  Same format
as C<--bgcolor>, defaults to '105,155,111', which is sea green.

=item --width <num pixels>

Width of each image tile in pixels.  Defaults to 2000.

=item --height <num pixels>

Height of each image tile in pixels.  Defaults to 100.

=item --min <number>

=item --max <number>

Lowest and highest values in wig file.  If either are not supplied,
they will be calculated automatically, which takes a bit of extra
time.

=back

=cut

use strict;
use warnings;

use File::Basename;
use FindBin qw($Bin);
use Getopt::Long;
use Pod::Usage;

use lib "$Bin/../lib";

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
    die "Can't find binary executable $wig2png, did you compile it? (Hint: try typing 'make' in jbrowse root directory)\n";
}

my $help;
GetOptions("wig=s" => \$path,
	   "tile=s" => \$tileRel,
	   "out=s" => \$outdir,
	   "tracklabel|trackLabel=s" => \$trackLabel,
	   "key=s" => \$key,
	   "bgcolor=s" => \$bgColor,
	   "fgcolor=s" => \$fgColor,
	   "width=s" => \$tileWidth,
	   "height=s" => \$trackHeight,
           "min=f" => \$min,
           "max=f" => \$max,
           "help|h|?" => \$help,
) or pod2usage();

pod2usage( -verbose => 2 ) if $help;
pod2usage( 'Must provide a --wig argument.' ) unless defined $path;

my $trackRel = "tracks";
my $trackDir = "$outdir/$trackRel";

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.json", [], 1)};
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

    JsonGenerator::modifyJsonFile("$outdir/trackInfo.json",
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
			'url' => "$trackRel/$trackLabel/{refseq}.json",
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
