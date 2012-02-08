use strict;
use warnings;

use Test::More;
use File::Temp;

use lib 'tests/perl_tests/lib';

use_ok( 'RandomSeq' );
is( length RandomSeq->random_seq(10), 10 );

my $t = File::Temp->new;
RandomSeq->random_fasta( file => "$t", length_plus_or_minus => 0 );
$t->close;

is( -s "$t", 12033 );

done_testing;
