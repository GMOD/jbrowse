use strict;
use warnings;

use Bio::JBrowse::local_libs;

use File::Temp 'tempdir';

use Test::More;
use App::Cmd::Tester;

use lib 'tests/perl_tests/lib';
use FileSlurping qw( slurp slurp_tree ); #< in tests/perl_tests/lib

use Bio::JBrowse;

my $tempdir = tempdir( CLEANUP => 1 );
my $result = test_app( 'Bio::JBrowse' => [qw(
    format-nclist
    --force
    --type mRNA
    tests/data/au9_scaffold_subset.gff3
    --out ), $tempdir
 ]);

is( $result->error, undef, 'no errors' );
is( $result->stderr, '', 'nothing on stderr' );

my $out = slurp_tree( $tempdir );
my $cds_trackdata = $out->{'Group1.33/trackData.json'};
is( $cds_trackdata->{featureCount}, 28, 'got right feature count' ) or diag explain $cds_trackdata;
is( scalar @{$cds_trackdata->{intervals}{classes}}, 5, 'got the right number of classes' )
   or diag explain $cds_trackdata->{intervals}{classes};
#diag explain $cds_trackdata;

done_testing;
