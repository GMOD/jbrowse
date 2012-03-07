use strict;
use warnings;

use Test::More;

use File::Spec::Functions 'catfile';
use File::Temp;
use File::Copy::Recursive 'dircopy';

use JsonGenerator;

my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
my $read_json = sub { JsonGenerator::readJSON( catfile( $tempdir, @_ ) ) };

dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

diag "writing output to $tempdir";
system $^X, 'bin/biodb-to-json.pl', (
    '--quiet',
    '--conf'  => 'sample_data/raw/volvox.json',
    '--out'   => "$tempdir",
  );
ok( ! $?, 'biodb-to-json.pl ran ok' );

my $hist_output = $read_json->(qw( tracks Transcript ctgA hist-100000-0.json ));
is_deeply( $hist_output, [1], 'got right histogram output' ) or diag explain( $hist_output );

my $tracklist = $read_json->('trackList.json');
is_deeply( $tracklist,
{
  'formatVersion' => 1,
  'tracks' => [
    {
      'config' => {
        'chunkSize' => 20000,
        'urlTemplate' => 'seq/{refseq}/'
      },
      'key' => 'DNA',
      'label' => 'DNA',
      'type' => 'SequenceTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        style => { 'className' => 'feature2' },
        'compress' => 0,
        'feature' => [
          'remark'
        ],
        'key' => 'Example Features',
        'track' => 'ExampleFeatures',
        'urlTemplate' => 'tracks/ExampleFeatures/{refseq}/trackData.json'
      },
      'key' => 'Example Features',
      'label' => 'ExampleFeatures',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        style => { 'className' => 'feature2' },
        'compress' => 0,
        'feature' => [
          'protein_coding_primary_transcript',
          'polypeptide'
        ],
        'key' => 'Name test track',
        'track' => 'NameTest',
        'urlTemplate' => 'tracks/NameTest/{refseq}/trackData.json'
      },
      'key' => 'Name test track',
      'label' => 'NameTest',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        'compress' => 0,
        'feature' => [
          'SNP'
        ],
        'key' => 'Test SNPs',
        'style' => {
          'className' => 'triangle hgred'
        },
        'track' => 'snps',
        'urlTemplate' => 'tracks/snps/{refseq}/trackData.json'
      },
      'key' => 'Test SNPs',
      'label' => 'snps',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        style => {'className' => 'feature3'},
        'compress' => 0,
        'description' => 1,
        'feature' => [
          'polypeptide_domain'
        ],
        'key' => 'Example motifs',
        'track' => 'Motifs',
        'urlTemplate' => 'tracks/Motifs/{refseq}/trackData.json'
      },
      'key' => 'Example motifs',
      'label' => 'Motifs',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        'category' => 'Alignments',
        style => { 'className' => 'feature4' },
        'compress' => 0,
        'feature' => [
          'match'
        ],
        'key' => 'Example alignments',
        'track' => 'Alignments',
        'urlTemplate' => 'tracks/Alignments/{refseq}/trackData.json'
      },
      'key' => 'Example alignments',
      'label' => 'Alignments',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        style => {'className' => 'feature5'},
        'compress' => 0,
        'feature' => [
          'gene'
        ],
        'key' => 'Protein-coding genes',
        'track' => 'Genes',
        'urlTemplate' => 'tracks/Genes/{refseq}/trackData.json'
      },
      'key' => 'Protein-coding genes',
      'label' => 'Genes',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        'category' => 'Genes',
        style => { 'className' => 'dblhelix' },
        'compress' => 0,
        'feature' => [
          'mRNA'
        ],
        'key' => 'Frame usage',
        'track' => 'ReadingFrame',
        'urlTemplate' => 'tracks/ReadingFrame/{refseq}/trackData.json'
      },
      'key' => 'Frame usage',
      'label' => 'ReadingFrame',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        'category' => 'Genes',
        style => { 'className' => 'cds' },
        'compress' => 0,
        'feature' => [
          'CDS:predicted',
          'mRNA:exonerate'
        ],
        'key' => 'Predicted genes',
        'phase' => 1,
        'track' => 'CDS',
        'urlTemplate' => 'tracks/CDS/{refseq}/trackData.json'
      },
      'key' => 'Predicted genes',
      'label' => 'CDS',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        'category' => 'Genes',
        'compress' => 0,
        'description' => 1,
        'feature' => [
          'mRNA:exonerate'
        ],
        'key' => 'Exonerate predictions',
        'style' => {
           'className' => 'transcript',
          'arrowheadClass' => 'transcript-arrowhead',
           'subfeatureClasses' => {
               'CDS' => 'transcript-CDS',
               'UTR' => 'transcript-UTR'
               },
        },
        'subfeatures' => 'true',
        'track' => 'Transcript',
        'urlTemplate' => 'tracks/Transcript/{refseq}/trackData.json'
      },
      'key' => 'Exonerate predictions',
      'label' => 'Transcript',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        style => {'className' => 'exon'},
        'compress' => 0,
        'description' => 1,
        'feature' => [
          'BAC'
        ],
        'key' => 'Fingerprinted BACs',
        'track' => 'Clones',
        'urlTemplate' => 'tracks/Clones/{refseq}/trackData.json'
      },
      'key' => 'Fingerprinted BACs',
      'label' => 'Clones',
      'type' => 'FeatureTrack'
    },
    {
      'config' => {
        'autocomplete' => 'all',
        style => {'className' => 'est'},
        'compress' => 0,
        'feature' => [
          'EST_match:est'
        ],
        'key' => 'ESTs',
        'track' => 'EST',
        'urlTemplate' => 'tracks/EST/{refseq}/trackData.json'
      },
      'key' => 'ESTs',
      'label' => 'EST',
      'type' => 'FeatureTrack'
    }
  ]
},
           'made right trackList.json',
         ) or diag explain $tracklist;

my $names_output = $read_json->(qw( tracks Transcript ctgA names.json ));
is_deeply( $names_output,
           [
               [
                   [ 'Apple3' ],
                   'Transcript',
                   'Apple3',
                   'ctgA',
                   '17399',
                   '23000',
                   '192'
               ]
           ],
           'got the right names output'
           ) or diag explain $names_output;

system $^X, 'bin/generate-names.pl', (
    '--dir'   => "$tempdir",
  );
ok( ! $?, 'generate-names.pl ran ok' );

system $^X, 'bin/generate-names.pl', (
    '--out'   => "$tempdir",
  );
ok( ! $?, 'generate-names.pl also ran ok with the --out option' );

done_testing;
