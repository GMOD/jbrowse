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
                   '191'
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
