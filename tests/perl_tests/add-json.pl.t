use strict;
use warnings;

use JBlibs;

use JSON 2;
use Test::More;

use File::Temp;
use Capture::Tiny 'capture';


my $j = JSON->new->pretty->relaxed;

my $t = File::Temp->new;
$t->print( <<EOF );
{ "foo": 1 }
EOF
$t->close;

my $data = $j->decode( do { open my $f, '<', "$t" or die; local $/; scalar <$f> } );
is_deeply( $data, { foo => 1 }, 'got the right data before' );


my ( $stdout, $stderr ) = capture {
    system $^X, 'bin/add-json.pl', (
        '{ "zaz":"zee", "foo":"bar"}',
        $t->filename
    );
};
ok( ! $?, 'script succeeded' );
is( $stderr, '', 'nothing on stderr' );

$data = $j->decode( do { open my $f, '<', "$t" or die; local $/; scalar <$f> } );
is_deeply( $data, { foo => 'bar', zaz => 'zee' }, 'got the right data after' );

done_testing;
