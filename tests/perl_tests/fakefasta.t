use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use Test::More;

use FakeFasta;

my $fasta = <<'';
>foo
ACTGATAGATGCTAGA
>bar deescrip
ATCGAT
ATCGATC
A
>bee

my $correct_fkfa = [
  {
    'desc' => undef,
    'id' => 'foo',
    'length' => 16
  },
  {
    'desc' => ' deescrip',
    'id' => 'bar',
    'length' => 14
  },
  {
    'desc' => undef,
    'id' => 'bee',
    'length' => 0
  }
];

my $fkfa = FakeFasta->fasta_to_fkfa( do{ open my $f, '<', \$fasta; $f} );
is_deeply( $fkfa,
           $correct_fkfa,
           'fasta_to_fkfa is right'
         ) or diag explain $fkfa;

my $out = '';
FakeFasta->fkfa_to_fasta( spec => $correct_fkfa,
                          out_fh => do { open my $f, '>', \$out; $f },
                        );

is_deeply( FakeFasta->fasta_to_fkfa( do{ open my $f, '<', \$out; $f} ),
           $correct_fkfa,
           'fkfa_to_fasta was right'
         );

done_testing;
