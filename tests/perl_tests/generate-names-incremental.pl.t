
use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use Test::More;
use Test::Deep;
use Capture::Tiny 'tee';

use File::Copy 'copy';
use File::Copy::Recursive 'dircopy';
use File::Path qw( rmtree );
use File::Temp;

use FileSlurping qw( slurp slurp_tree );

use Bio::JBrowse::Cmd::IndexNames;

sub run_with {
    my @args = @_;
    return tee {
        Bio::JBrowse::Cmd::IndexNames->new( @args )->run;
    };
}
#system "echo TEMPDIR IS $tempdir; cat $tempdir/names/2be/0.json; echo;";
my $tempdir2 = new_volvox_sandbox();

run_with (
    '--out'   => "$tempdir2",
    '--hashBits' => 16,
    '--tracks' => 'ExampleFeatures,NameTest',
    '--completionLimit' => 15
    );
{
    my $got = read_names($tempdir2);
    my $expected = read_names('tests/data/volvox_formatted_names');
    ok( !eq_deeply( $got, $expected ), 'expected partial name index to not match full name index' );
}


run_with (
    '--out'   => "$tempdir2",
    '--hashBits' => 16,
    '--incremental',
    '--completionLimit' => 15
    );
{
    my $got = read_names($tempdir2);
    my $expected = read_names('tests/data/volvox_formatted_names');
    is_deeply( $got, $expected, 'incremental index of the previous partial names index matched' );
}
done_testing;

sub read_names {
    my $d = slurp_tree(shift.'/names');
    delete $d->{'meta.json'}{last_changed_entry};
    return $d;
}

sub new_volvox_sandbox {
    my $tempdir = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    dircopy( 'tests/data/volvox_formatted_names', $tempdir );
    copy( 'sample_data/raw/volvox/volvox.filtered.vcf.gz',
          "$tempdir/volvox.filtered.vcf.gz"
          ) or die $!;
    copy( 'sample_data/raw/volvox/volvox.test.vcf.gz',
          "$tempdir/volvox.test.vcf.gz"
          ) or die $!;
    rmtree( "$tempdir/names" );
    return $tempdir;
}
