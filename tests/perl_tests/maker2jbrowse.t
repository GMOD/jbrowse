use strict;
use Test::More;

use JBlibs;

use File::Temp;

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp_tree';


my $tempdir = File::Temp->newdir;

my @cmd = (
    'bin/maker2jbrowse',
    -d => 'tests/data/maker_dmel_example/dpp_contig.maker.output/dpp_contig_master_datastore_index.log',
    '--out' => "$tempdir"
    );
#diag explain \@cmd;
system @cmd;

is( $?, 0, 'maker2jbrowse ran ok' );

my $output = slurp_tree( "$tempdir" );
is( scalar @{ $output->{'trackList.json'}{tracks} }, 8, 'got right number of tracks' );
my @names_files = grep m!^names/!, keys %$output;
cmp_ok( scalar @names_files, '>=', 10, 'got some names files' ) or diag explain \@names_files;

done_testing;

