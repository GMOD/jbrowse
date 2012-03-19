use strict;
use warnings;

use Test::More;

use File::Spec::Functions 'catfile';
use File::Temp ();
use File::Copy::Recursive 'dircopy';

use JsonGenerator;

sub run_with(@) {
    system $^X, 'bin/flatfile-to-json.pl', @_;
    ok( ! $?, 'flatfile-to-json.pl ran ok' );
}

sub tempdir {
    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    #diag "using temp dir $tempdir";
    return $tempdir;
}

{  #diag "running on volvox";

    my $tempdir = tempdir();
    my $read_json = sub { JsonGenerator::readJSON( catfile( $tempdir, @_ ) ) };
    dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

    run_with (
        '--out' => $tempdir,
        '--bed' => 'sample_data/raw/volvox/volvox-remark.bed',
        '--trackLabel' => 'ExampleFeatures',
        '--key' => 'Example Features',
        '--autocomplete' => 'all',
        '--cssClass' => 'feature2',
        '--clientConfig' =>  '{"featureCss": "height: 8px;", "histScale": 2}',
        );

    run_with (
        '--out' => $tempdir,
        '--gff' => 'sample_data/raw/volvox/volvox.gff3',
        '--trackLabel' => 'CDS',
        '--key' => 'Predicted genes',
        '--type' => 'CDS:predicted,mRNA:exonerate,mRNA:predicted',
        '--autocomplete' => 'all',
        '--cssClass' => 'cds',
        '--getPhase',
        '--getSubfeatures',
        );

    my $hist_output = $read_json->(qw( tracks ExampleFeatures ctgA hist-10000-0.json ));
    is_deeply( $hist_output, [4,3,4,3,4,1], 'got right histogram output' ) or diag explain( $hist_output );

    my $names_output = $read_json->(qw( tracks ExampleFeatures ctgA names.json ));
    is_deeply( $names_output->[3],
               [
                 [
                   'f05'
                 ],
                 'ExampleFeatures',
                 'f05',
                 'ctgA',
                 4715,
                 5968,
                 undef
               ],
               'got the right names output'
               ) or diag explain $names_output;

    my $cds_trackdata = $read_json->(qw( tracks CDS ctgA trackData.json ));
    is( $cds_trackdata->{featureCount}, 3, 'got right feature count' ) or diag explain $cds_trackdata;
    is( ref $cds_trackdata->{intervals}{nclist}[2][9], 'ARRAY', 'exonerate mRNA has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[2][9]}, 5, 'exonerate mRNA has 5 subfeatures' );

    is_deeply( $read_json->('trackList.json')->{tracks}[1]{style},
               { featureCss => 'height: 8px;',
                 histScale => 2,
                 className => 'feature2',
               },
               '--clientConfig option seems to work'
             ) or diag explain $read_json->('trackList.json');

    #system "find $tempdir";
}

{#   diag "running on single_au9_gene.gff3, testing --type filtering";

    my $tempdir = tempdir();
    dircopy( 'tests/data/AU9', $tempdir );

    run_with (
        '--out' => $tempdir,
        '--gff' => "tests/data/AU9/single_au9_gene.gff3",
        '--trackLabel' => 'AU_mRNA',
        '--key' => 'AU mRNA',
        '--type' => 'mRNA',
        '--autocomplete' => 'all',
        '--cssClass' => 'transcript',
        '--getPhase',
        '--getSubfeatures',
        );

    #system "find $tempdir";

    my $read_json = sub { JsonGenerator::readJSON( catfile( $tempdir, @_ ) ) };
    my $cds_trackdata = $read_json->(qw( tracks AU_mRNA Group1.33 trackData.json ));
    is( $cds_trackdata->{featureCount}, 1, 'got right feature count' ) or diag explain $cds_trackdata;
    is( ref $cds_trackdata->{intervals}{nclist}[0][9], 'ARRAY', 'mRNA has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[0][9]}, 7, 'mRNA has 7 subfeatures' );
}

{   #diag "running on single_au9_gene.gff3, testing that we emit 2 levels of subfeatures";

    my $tempdir = tempdir();
    dircopy( 'tests/data/AU9', $tempdir );

    run_with (
        '--out' => $tempdir,
        '--gff' => "tests/data/AU9/single_au9_gene.gff3",
        '--trackLabel' => 'AU_mRNA',
        '--key' => 'AU mRNA',
        '--type' => 'gene',
        '--autocomplete' => 'all',
        '--cssClass' => 'transcript',
        '--getPhase',
        '--getSubfeatures',
        );

    #system "find $tempdir";

    my $read_json = sub { JsonGenerator::readJSON( catfile( $tempdir, @_ ) ) };
    my $cds_trackdata = $read_json->(qw( tracks AU_mRNA Group1.33 trackData.json ));
    is( $cds_trackdata->{featureCount}, 1, 'got right feature count' ) or diag explain $cds_trackdata;
    is( ref $cds_trackdata->{intervals}{nclist}[0][9], 'ARRAY', 'gene has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[0][9]}, 1, 'gene has 1 subfeature' );
    is( ref $cds_trackdata->{intervals}{nclist}[0][9][0][6], 'ARRAY', 'mRNA has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[0][9][0][6]}, 7, 'mRNA has 7 subfeatures' );
}

{ # add a test for duplicate lazyclasses bug found by Gregg

    my $tempdir = tempdir();
    dircopy( 'tests/data/AU9', $tempdir );
    run_with (
        '--out' => $tempdir,
        '--gff' => "tests/data/au9_scaffold_subset.gff3",
        '--arrowheadClass' => 'transcript-arrowhead',
        '--getSubfeatures',
        '--subfeatureClasses' => '{"CDS": "transcript-CDS", "UTR": "transcript-UTR", "exon":"transcript-exon", "three_prime_UTR":"transcript-three_prime_UTR", "five_prime_UTR":"transcript-five_prime_UTR", "stop_codon":null, "start_codon":null}',
        '--cssClass' => 'transcript',
        '--type' => 'mRNA',
        '--trackLabel' => 'au9_full1',
        );

    my $read_json = sub { JsonGenerator::readJSON( catfile( $tempdir, @_ ) ) };
    my $cds_trackdata = $read_json->(qw( tracks au9_full1 Group1.33 trackData.json ));
    is( $cds_trackdata->{featureCount}, 28, 'got right feature count' ) or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{classes}}, 3, 'got the right number of classes' )
        or diag explain $cds_trackdata->{intervals}{classes};

    #system "find $tempdir";
}

done_testing;
