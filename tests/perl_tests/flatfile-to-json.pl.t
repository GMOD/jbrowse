use strict;
use warnings;

use Test::More;

use File::Spec::Functions 'catfile';
use File::Temp;
use File::Copy::Recursive 'dircopy';

use JsonGenerator;

my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
diag "using temp dir $tempdir";
my $read_json = sub { JsonGenerator::readJSON( catfile( $tempdir, @_ ) ) };
dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

system $^X, 'bin/flatfile-to-json.pl', (
    '--out' => $tempdir,
    '--bed' => 'sample_data/raw/volvox/volvox-remark.bed',
    '--trackLabel' => 'ExampleFeatures',
    '--key' => 'Example Features',
    '--autocomplete' => 'all',
    '--cssClass' => 'feature2',
    );

ok( ! $?, 'flatfile-to-json.pl ran ok on the volvox bed' );

system $^X, 'bin/flatfile-to-json.pl', (
    '--out' => $tempdir,
    '--gff' => 'sample_data/raw/volvox/volvox.gff3',
    '--trackLabel' => 'CDS',
    '--key' => 'Predicted genes',
    '--type' => 'CDS:predicted,mRNA:exonerate',
    '--autocomplete' => 'all',
    '--cssClass' => 'cds',
    '--getPhase',
    '--getSubfeatures',
    );

ok( ! $?, 'flatfile-to-json.pl ran ok on the volvox gff3' );

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
is( $cds_trackdata->{featureCount}, 5, 'got right feature count' ) or diag explain $cds_trackdata;
is_deeply( $cds_trackdata->{intervals}{nclist}[4][9], [], 'exonerate mRNA has its subfeatures' ) or diag explain $cds_trackdata;

#system "find $tempdir";

done_testing;
