use strict;
use warnings;

use Test::More;

use_ok('NCList');

my @features = (
    [ 123, 123 ],
    [ 123, 340 ],
);
my $list = NCList->new( sub { $_[0][0] }, sub { $_[0][1] }, sub { $_[0][2] = $_[1] }, \@features );
is_deeply(
    $list->nestedList,
    [[
        123,
        340,
        [
            [
                123,
                123
            ]
        ]
    ]],
    'got the right nested list'
  ) or diag explain $list->nestedList;

done_testing;
