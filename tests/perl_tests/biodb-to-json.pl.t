use strict;
use warnings;

use JBlibs;

use Test::More;

use JSON 2;

use File::Spec::Functions 'catfile';
use File::Temp;
use File::Copy::Recursive 'dircopy';

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp';


{ # test volvox

    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    my $read_json = sub { slurp( $tempdir, @_ ) };

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

    my $genes_trackdata = $read_json->(qw( tracks Genes ctgA trackData.json ));
    is_deeply( [ @{$genes_trackdata->{intervals}{nclist}[0]}[1..9] ],
        [
            1049,
            9000,
            1,
            'example',
            'ctgA',
            'EDEN',
            'EDEN',
            'protein kinase',
            'gene'
        ],
        'got the right genes trackdata'
      ) or diag explain $genes_trackdata->{intervals}{nclist}[0];

    my $tracklist = $read_json->('trackList.json');
    is( scalar( @{$tracklist->{tracks}} ), 12 );
    is( $tracklist->{tracks}[8]{style}{linkTemplate}, 'http://www.ncbi.nlm.nih.gov/gquery/?term={name}-{start}-{end}' );

    my $names_output = [ map JSON::from_json($_), split "\n", $read_json->(qw( tracks Transcript ctgA names.txt )) ];
    is_deeply( $names_output,
               [
                   [
                       [ 'Apple3' ],
                       'Transcript',
                       'Apple3',
                       'ctgA',
                       '17399',
                       '23000'
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
}



{ # test volvox compressed

    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    my $read_json = sub { slurp( $tempdir, @_ ) };

    dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

    diag "writing output to $tempdir";
    system $^X, 'bin/biodb-to-json.pl', (
        '--quiet',
        '--compress',
        '--conf'  => 'sample_data/raw/volvox.json',
        '--out'   => "$tempdir",
      );
    ok( ! $?, 'biodb-to-json.pl ran ok' );

    my $hist_output = $read_json->(qw( tracks Transcript ctgA hist-100000-0.jsonz ));
    is_deeply( $hist_output, [1], 'got right histogram output' ) or diag explain( $hist_output );

    my $genes_trackdata = $read_json->(qw( tracks Genes ctgA trackData.jsonz ));
    is_deeply( [ @{$genes_trackdata->{intervals}{nclist}[0]}[1..9] ],
        [
            1049,
            9000,
            1,
            'example',
            'ctgA',
            'EDEN',
            'EDEN',
            'protein kinase',
            'gene',
        ],
        'got the right genes trackdata'
      ) or diag explain $genes_trackdata->{intervals}{nclist}[0];

    my $names_output = [ map JSON::from_json($_), split "\n", $read_json->(qw( tracks Transcript ctgA names.txt )) ];
    is_deeply( $names_output,
               [
                   [
                       [ 'Apple3' ],
                       'Transcript',
                       'Apple3',
                       'ctgA',
                       '17399',
                       '23000'
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
}


{ # test yeast

    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    my $read_json = sub { slurp( $tempdir, @_ ) };

    system $^X, 'bin/prepare-refseqs.pl', (
        '--fasta' => 'sample_data/raw/yeast_scaffolds/chr1.fa.gz',
        '--fasta' => 'sample_data/raw/yeast_scaffolds/chr2.fa.gzip',
        '--out'   => "$tempdir",
        );

    system $^X, 'bin/biodb-to-json.pl', (
        '--quiet',
        '--conf'  => 'sample_data/raw/yeast.json',
        '--out'   => "$tempdir",
      );

    my $tracklist = $read_json->('trackList.json');
    is_deeply( $tracklist,
{
  'formatVersion' => 1,
  'tracks' => [
    {
      'chunkSize' => 20000,
      'key' => 'Reference sequence',
      'label' => 'DNA',
      'type' => 'SequenceTrack',
      'urlTemplate' => 'seq/{refseq_dirpath}/{refseq}-'
    },
    {
      'autocomplete' => 'all',
      'category' => 'Genes',
      'compress' => '0',
      'feature' => [
        'gene'
      ],
      'key' => 'Protein-coding genes',
      'label' => 'Genes',
      'style' => {
        'arrowheadClass' => 'transcript-arrowhead',
        'className' => 'feature5',
        'subfeatureClasses' => {
          'CDS' => 'transcript-CDS'
        }
      },
      'subfeatures' => bless( do{\(my $o = 1)}, 'JSON::XS::Boolean' ),
      'track' => 'Genes',
      'type' => 'FeatureTrack',
      'urlTemplate' => 'tracks/Genes/{refseq}/trackData.json'
    },
{
      'autocomplete' => 'all',
      'category' => 'Genes',
      'compress' => 0,
      'description' => 1,
      'feature' => [
        'mRNA'
      ],
      'key' => 'Exonerate predictions (misconfigured for test, and with a long description)',
      'label' => 'transcript_with_no_features',
      'style' => {
        'arrowheadClass' => 'transcript-arrowhead',
        'className' => 'transcript',
        'subfeatureClasses' => {
          'CDS' => 'transcript-CDS',
          'UTR' => 'transcript-UTR'
        }
      },
      'subfeatures' => bless( do{\(my $o = 1)}, 'JSON::XS::Boolean' ),
      'track' => 'transcript_with_no_features',
      'type' => 'FeatureTrack',
      'urlTemplate' => 'tracks/transcript_with_no_features/{refseq}/trackData.json'
    }
  ]
},
               'made right trackList.json',
             ) or diag explain $tracklist;
}

done_testing;
