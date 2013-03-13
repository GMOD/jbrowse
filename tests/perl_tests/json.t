use strict;
use JBlibs;

use Test::More;

use File::Temp ();


use Bio::JBrowse::JSON;

eval { Bio::JBrowse::JSON->new->decode("'honk") };
like( $@, qr/^Error parsing JSON/, 'wraps parse errors' );

my $data;
eval { $data = Bio::JBrowse::JSON->new->decode(<<EOF) };
{ "zaz": "zoz",
  #comment
  "zee": "zoo"
}
EOF

ok( !$@, 'parses comments' ) or diag $@;
is_deeply( $data, { zaz => 'zoz', zee => 'zoo' }, 'parsed the right data' );

my $t = File::Temp->new;
$t->print( <<EOF );
{ "zaz": "zoz",
  #comment
  "zee": "zoo"
}
EOF
$t->close;

is_deeply(
    Bio::JBrowse::JSON->new->decode_file( $t->filename ),
    { zaz => 'zoz', zee => 'zoo' },
    'decode_file works'
    );

done_testing;
