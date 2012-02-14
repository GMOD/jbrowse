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

system $^X, 'bin/flatfile-to-json.pl', (
    '--out' => $tempdir,
    '--bed' => 'sample_data/raw/volvox/volvox-remark.bed',
    '--trackLabel' => 'ExampleFeatures',
    '--key' => 'Example Features',
    '--type' => 'remark',
    '--autocomplete' => 'all',
    '--cssClass' => 'feature2',
    );

ok( ! $?, 'flatfile-to-json.pl ran ok on the volvox gff' );

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

#system "find $tempdir";

done_testing;
