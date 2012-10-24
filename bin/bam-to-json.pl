#!/usr/bin/env perl

=head1 NAME

bam-to-json.pl - format data from a BAM file for display by JBrowse

=head1 USAGE

  bam-to-json.pl                               \
      --bam <bam file>                         \
      --trackLabel <track identifier>          \
      [ --out <output directory> ]             \
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

=item --trackLabel <track identifier>

Unique identifier for this track.  Required.

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
use lib "$Bin/../src/perl5";
use JBlibs;

use Pod::Usage;
use Getopt::Long;

use JSON 2;
use Bio::DB::Sam;

use GenomeDB;
use NCLSorter;

my ($tracks, $cssClass, $arrowheadClass, $subfeatureClasses, $clientConfig,
    $bamFile, $trackLabel, $key, $nclChunk, $compress);
my $defaultClass = "basic";
$cssClass = $defaultClass;
my $outdir = "data";
my $help;
GetOptions("out=s" => \$outdir,
	   "tracklabel|trackLabel=s" => \$trackLabel,
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
pod2usage( 'Must pass a --trackLabel argument.' ) unless defined $trackLabel;

unless( defined $nclChunk ) {
    # default chunk size is 50KiB
    $nclChunk = 50000;
    # $nclChunk is the uncompressed size, so we can make it bigger if
    # we're compressing
    $nclChunk *= 4 if $compress;
}

my $gdb = GenomeDB->new( $outdir );

my @refSeqs = @{ $gdb->refSeqs }
  or die "Run prepare-refseqs.pl to define reference sequences before running this script.\n";

my %config = (
    style => { className => $cssClass },
    "key"    => $key || $trackLabel,
    compress => $compress,
   );

if( $cssClass eq $defaultClass ) {
    $config{style}->{featureCss} = "background-color: #668; height: 8px;";
    $config{style}->{histCss} = "background-color: #88F";
    $config{style}->{histScale} = 2;
}

$config{style} = { %{ $config{style} || {} }, %{ JSON::from_json($clientConfig) || {} } }
    if defined $clientConfig;

my $bam = Bio::DB::Bam->open( $bamFile );
# open the bam index, creating it if necessary
my $index = Bio::DB::Bam->index( $bamFile, 1 );
my $hdr = $bam->header;


my $track = $gdb->getTrack( $trackLabel, \%config, $config{key} )
            || $gdb->createFeatureTrack( $trackLabel,
                                         \%config,
                                         $config{key},
                                       );
my %refseqs_in_bam;
$refseqs_in_bam{$_} = 1 for @{$hdr->target_name || []};

foreach my $seqInfo (@refSeqs) {
    my $refseq_name = $seqInfo->{name};

    # Don't try parse_region for a ref seq that's not in there,
    # samtools returns plausible-looking garbage in this case.
    # perhaps coincidentally, samtools has no tests.  Could the
    # bugginess and the lack of tests be ... *related* to each other
    # in some way?  I would probably try to fix this bug in samtools
    # if it was not in svn, and had some tests.  As it is, it's way
    # easier for me to just code around it and write a snarky,
    # sarcastic, unhelpful comment. --rob
    next unless $refseqs_in_bam{$refseq_name};

    my ($tid, $start, $end) = $hdr->parse_region( $refseq_name );
    next unless defined $tid;

    $track->startLoad( $refseq_name,
                       $nclChunk,
                       [
                           {
                               attributes  => [qw[ Start End Strand ]],
                               isArrayAttr => { },
                           },
                       ],
                     );

    my $sorter = NCLSorter->new( 1, 2, sub { $track->addSorted( $_[0]) } );
    #$sorter->addSorted( [ 0, 23, 345, 1 ] );
    $index->fetch( $bam, $tid, $start, $end,
                   sub {
                       my $a = align2array( $_[0] );
                       $sorter->addSorted( $a ) if $a->[2] - $a->[1] > 1;
                   }
                  );
    $sorter->flush;
    $track->finishLoad;
}

$gdb->writeTrackEntry( $track );

exit;

############################

sub align2array {
    my $align = shift;

    my $a = [ 0,
              $align->pos,
              $align->calend + 1,
              $align->reversed ? -1 : 1
              ];
    $a->[2]--;
    return $a;
}

sub slurp {
    open my $f, '<', $_[0] or die "$! reading $_[0]";
    local $/;
    return <$f>;
}
