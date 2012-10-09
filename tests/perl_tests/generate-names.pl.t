use strict;
use warnings;

use JBlibs;

use Test::More;

use File::Temp;
use File::Copy::Recursive 'dircopy';

my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
dircopy( 'tests/data/volvox_formatted_names', $tempdir );

system $^X, 'bin/generate-names.pl', (
    '--out'   => "$tempdir",
    );
ok( ! $?, 'generate-names.pl also ran ok on volvox test data' );

done_testing;
