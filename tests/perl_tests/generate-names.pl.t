
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

my $tempdir = new_volvox_sandbox();
my $temp2 = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
my ( $stdout ) = run_with (
    '--out'   => "$tempdir",
    '--workdir' => $temp2,
#    '--verbose',
    '--hashBits' => 16,
    '--completionLimit' => 15
    );
{
    my $got = read_names($tempdir);
    # dircopy( $tempdir, 'tests/data/volvox_formatted_names'); # uncomment to rewrite expected data
    my $expected = read_names('tests/data/volvox_formatted_names');
    is_deeply( $got, $expected, 'got right data from volvox test data run' );
    #    or diag explain read_names($tempdir);
    #diag explain $got->{'c12/9.json'}{apple2}{exact};
    #diag explain $expected->{'c12/9.json'}{apple2}{exact};
}

#system "echo TEMPDIR IS $tempdir; cat $tempdir/names/2be/0.json; echo;";
run_with(
    '--out'   => "$tempdir",
    '--workdir' => $temp2,
    '--hashBits' => 16,
    '--incremental',
    '--safeMode', #< note that --safeMode does not actually do anything
    '--tracks' => 'ExampleFeatures,NameTest',
    '--completionLimit' => 15
    );
{
    my $got = read_names($tempdir);
    my $expected = read_names('tests/data/volvox_formatted_names');
    is_deeply( $got, $expected, 'same data after incremental run with --safeMode' );
    # or diag explain read_names($tempdir);
}

$tempdir = new_volvox_sandbox();
run_with (
    '--dir'   => "$tempdir",
    '--tracks' => 'ExampleFeatures,NameTest'
    );
my @files = glob("$tempdir/names/*");
is( scalar @files, 17 , 'the dir has some stuff in it' );

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
    copy( 'sample_data/raw/volvox/volvox.sort.gff3.gz.1',
          "$tempdir/volvox.sort.gff3.gz.1"
          ) or die $!;
    rmtree( "$tempdir/names" );
    return $tempdir;
}
