
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
my $temp2 = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
system $^X, 'bin/generate-names.pl', (
    '--out'   => "$tempdir",
    '--workdir' => $temp2,
    '--completionLimit' => 15
    );
ok( ! $?, 'generate-names.pl also ran ok on volvox test data' );
is_deeply( read_names($tempdir), read_names('tests/data/volvox_formatted_names') ) or diag explain read_names($tempdir);

$tempdir = new_volvox_sandbox();
system $^X, 'bin/generate-names.pl', (
    '--dir'   => "$tempdir",
    '--tracks' => 'ExampleFeatures,NameTest',
    );
ok( ! $?, 'generate-names.pl also ran ok with the --tracks option' );
cmp_ok( -s "$tempdir", '>', 1000, 'the dir has some stuff in it' );

done_testing;

sub read_names {
    my $d = slurp_tree(shift);
    delete $d->{'names/meta.json'}{last_changed_entry};
    return $d;
}

sub new_volvox_sandbox {
    my $tempdir = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    dircopy( 'tests/data/volvox_formatted_names', $tempdir );
    rmtree( "$tempdir/names" );
    return $tempdir;
}
