#!/usr/bin/env perl

=head1 NAME

bam-to-json.pl - format data from a BAM file for display by JBrowse

=head1 USAGE

  bam-to-json.pl                               \
      --bam <bam file>                         \
      [ --out <output directory> ]             \
      [ --tracklabel <track identifier> ]      \
      [ --key <human-readable track name> ]    \
      [ --cssClass <class> ]                   \
      [ --clientConfig '{ JSON }' ]            \
      [ --nclChunk <NCL chunk size in bytes> ] \
      [ --compress]

=head1 OPTIONS

=over 4

=item --help | -h | -?

Display an extended help screen.

=item --bam <file>

Required.  BAM file to read and format.

=item --out <directory>

Output directory to write to.  Defaults to C<data/>.

=item --cssClass <class_name>

CSS class name for the resulting features.  Defaults to C<basic>.

=item --clientConfig '{ JSON configuration }'

Extra configuration for the client, in JSON syntax.  Example:

  --clientConfig '{"featureCss": "background-color: #668; height: 8px;", "histScale": 5}'

=item --nclChunk <bytes>

Size of the individual Nested Containment List chunks.  Default

=item --compress

If passed, compress the output .json file to gzip-compressed .jsonz.
Note that some additional web server configuration is required to
serve these correctly.

=back

=cut

use strict;
use warnings;

use FindBin qw($Bin);
use Pod::Usage;
use Getopt::Long;

use JSON 2;
use Bio::DB::Sam;

use lib "$Bin/../lib";
use JsonGenerator;
use NCLSorter;

my ($tracks, $cssClass, $arrowheadClass, $subfeatureClasses, $clientConfig,
    $bamFile, $trackLabel, $key, $nclChunk, $compress);
my $defaultClass = "basic";
$cssClass = $defaultClass;
my $outdir = "data";
my $help;
GetOptions("out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
           "bam=s" => \$bamFile,
           "cssClass=s", \$cssClass,
           "clientConfig=s", \$clientConfig,
           "nclChunk=i" => \$nclChunk,
           "compress" => \$compress,
           "help|h|?" => \$help,
) or pod2usage();

pod2usage( -verbose => 2 ) if $help;
pod2usage( 'Must pass a --bam argument.' ) unless defined $bamFile;

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

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.json", [], 1)};

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
    "$outdir/trackInfo.json",
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
