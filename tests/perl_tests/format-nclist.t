use strict;
use warnings;

use Bio::JBrowse::local_libs;

use File::Temp 'tempdir';

use Test::More;
use App::Cmd::Tester;


use Bio::JBrowse;

my $tempdir = tempdir();
my $result = test_app( 'Bio::JBrowse' => [qw(
    format-nclist
    --force
    tests/data/au9_scaffold_subset.gff3
    --out ), $tempdir
 ]);

is( $result->stderr, '', 'nothing on stderr' );

done_testing;
