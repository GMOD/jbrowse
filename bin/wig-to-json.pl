#!/usr/bin/env perl

=head1 NAME

wig-to-json.pl - format graph images of Wiggle (.wig) data for use by JBrowse

=head1 USAGE

  wig-to-json.pl                              \
      --wig <wiggle file>                     \
      [ --out <JSON directory> ]              \
      [ --tracklabel <track identifier> ]     \
      [ --key <human-readable track name> ]   \
      [ --bgcolor <R,G,B> ]                   \
      [ --fgcolor <R,G,B> ]                   \
      [ --width <tile width> ]                \
      [ --height <tile height> ]              \
      [ --min <min> ]                         \
      [ --max <max> ]                         \
      [ --clientConfig '{ JSON-format extra configuration for this track }' ]

=head1 OPTIONS

=over 4

=item --wig <file>

Required.  Wiggle file to process.

=item --out <dir>

Directory where the output will go.  Defaults to "data/".

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

=item --clientConfig '{ JSON-format extra configuration for this track }'

Extra configuration for the client, in JSON syntax.  Example:

  --clientConfig '{"featureCss": "background-color: #668; height: 8px;", "histScale": 2}'

=back

=cut

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../src/perl5";
use JBlibs;

use File::Basename;
use Getopt::Long;
use Pod::Usage;

use JSON 2;

use GenomeDB;

my ($path, $trackLabel, $key, $cssClass);
my $outdir = "data";
my $fgColor = "105,155,111";
my $bgColor = "255,255,255";
my $tileWidth = 2000;
my $trackHeight = 100;
my $min = "";
my $max = "";
my $clientConfig;

my $wig2png = "$Bin/wig2png";
unless( -x $wig2png ) {
    die "Can't find binary executable $wig2png, did you compile it? (Type '(cd wig2png && ./configure && make; cd ..)' in the JBrowse root directory to compile it.)\n";
}

my $help;
GetOptions("wig=s"                   => \$path,
	   "out=s"                   => \$outdir,
	   "tracklabel|trackLabel=s" => \$trackLabel,
	   "key=s"                   => \$key,
	   "bgcolor=s"               => \$bgColor,
	   "fgcolor=s"               => \$fgColor,
	   "width=s"                 => \$tileWidth,
	   "height=s"                => \$trackHeight,
           "min=f"                   => \$min,
           "max=f"                   => \$max,
           "help|h|?"                => \$help,
           "clientConfig=s"          => \$clientConfig,
) or pod2usage();

pod2usage( -verbose => 2 ) if $help;
pod2usage( 'Must provide a --wig argument.' ) unless defined $path;

my $gdb = GenomeDB->new( $outdir );

my @refSeqs = @{ $gdb->refSeqs }
   or die "Run prepare-refseqs.pl first to supply information about your reference sequences.\n";

$trackLabel = basename( $path ) unless defined $trackLabel;
my $urlTemplate = "tracks/$trackLabel/{refseq}/trackData.json";

my %style = (
    "key"            => defined($key) ? $key : $trackLabel,
    "urlTemplate"    => $urlTemplate,
    style => {
        %{ $clientConfig || {} },
        "className"  => $cssClass || 'image',
    },
);

my $track = $gdb->getTrack( $trackLabel, \%style, $style{key}, 'ImageTrack.Wiggle' )
   || $gdb->createImageTrack( $trackLabel,
                              \%style,
                              $style{key},
                              'ImageTrack.Wiggle'
                            );
$track->startLoad;

system $wig2png, (
    $path,
    '--outdir'           => $track->outDir,
    '--tile-width'       => $tileWidth,
    '--track-height'     => $trackHeight,
    '--background-color' => $bgColor,
    '--foreground-color' => $fgColor,
    ( defined $min ? ("--min-value" => $min ) : () ),
    ( defined $max ? ("--max-value" => $max ) : () ),
  ) and die "Failed to run wig2png: $?\n";

$track->finishLoad;

$gdb->writeTrackEntry( $track );

=head1 AUTHORS

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Ian Holmes E<lt>ihh@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
