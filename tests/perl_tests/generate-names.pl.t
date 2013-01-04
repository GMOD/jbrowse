use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use Test::More;

use File::Copy::Recursive 'dircopy';
use File::Path qw( rmtree );
use File::Temp;

use FileSlurping qw( slurp slurp_tree );

my $tempdir = new_volvox_sandbox();
system $^X, 'bin/generate-names.pl', (
    '--out'   => "$tempdir",
    );
ok( ! $?, 'generate-names.pl also ran ok on volvox test data' );
is_deeply( slurp_tree($tempdir), slurp_tree('tests/data/volvox_formatted_names') );

$tempdir = new_volvox_sandbox();
system $^X, 'bin/generate-names.pl', (
    '--dir'   => "$tempdir",
    '--tracks' => 'ExampleFeatures,NameTest',
    );
ok( ! $?, 'generate-names.pl also ran ok with the --tracks option' );
cmp_ok( -s "$tempdir", '>', 1000, 'the dir has some stuff in it' );

done_testing;


sub new_volvox_sandbox {
    my $tempdir = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    dircopy( 'tests/data/volvox_formatted_names', $tempdir );
    rmtree( "$tempdir/names" );
    return $tempdir;
}
