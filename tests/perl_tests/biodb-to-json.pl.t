use strict;
use warnings;

use Test::More;

use File::Spec::Functions 'catfile';
use File::Temp;
use File::Copy::Recursive 'dircopy';

use JsonGenerator;

my $tempdir = File::Temp->newdir( CLEANUP => defined $ENV{KEEP_ALL} ? $ENV{KEEP_ALL} : 1 );
dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

diag "writing output to $tempdir";
system $^X, 'bin/biodb-to-json.pl', (
    #'-q',
    '--conf'  => 'sample_data/raw/volvox.json',
    '--out'   => "$tempdir",
  );
ok( ! $?, 'biodb-to-json.pl ran ok' );

my $hist_output = JsonGenerator::readJSON(
    catfile( $tempdir,
             qw(
                   tracks
                   Transcript
                   ctgA
                   hist-100000-0.json
               )
             )
    );

is_deeply( $hist_output, [1], 'got right histogram output' ) or diag explain( $hist_output );

done_testing;
