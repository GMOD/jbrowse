use strict;
use warnings;

use Test::More;
use File::Temp;

use lib 'tests/perl_tests/lib';

use_ok( 'FakeFasta' );
is( length FakeFasta->random_seq(10), 10 );

my $t = File::Temp->new;  $t->close;
my $spec =  [ { id => 'FooBar1', desc => ' a real fooish bar', length => 20 },
              { id => 'Sleepy_me', desc => ' real sleepy', length => 500    },
            ];
FakeFasta->fkfa_to_fasta(
    out_file => "$t",
    spec => $spec,
  );
like( slurp($t),
      qr/^>FooBar1 a real fooish bar\n[ACTGN]{20}\n>Sleepy_me real sleepy\n[ACTGN]{500}\n$/,
      'got the right fasta',
    );

is_deeply( FakeFasta->fasta_to_fkfa( $t ), $spec, 'got the right spec back out' );

done_testing;

###########
sub slurp { open my $f, '<', shift; local $/; <$f> }
