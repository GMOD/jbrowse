use strict;
use warnings;

use Test::More;

use JBlibs;

use Bio::JBrowse::PartialSorter;

my $ps = Bio::JBrowse::PartialSorter->new(
    size => 100,
    compare => sub($$) {
        $_[0]->[0] cmp $_[1]->[0]
    }
    );

my @alphabet = ( 'A'..'Z', 'a'..'z' );
my @rev_alphabet = reverse @alphabet;
my $result = snarf( $ps->sort( sub {
                                   my $d = shift @rev_alphabet or return;
                                   return [$d];
                               }
                             )
                  );

is_deeply( $result,
           [map {[$_]} @alphabet] )
  or diag explain $result;

done_testing;

sub snarf {
    my $s = shift;
    my @data;
    while( my $d = $s->() ) {
        push @data, $d;
    }
    return \@data;
}
