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
{}
EOF
$t->close;

my $t2 = File::Temp->new;
$t2->close;

my $data = $j->decode( do { open my $f, '<', "$t" or die; local $/; scalar <$f> } );
is_deeply( $data, {}, 'got the right data before' );


my ( $stdout, $stderr ) = capture {
    system $^X, 'bin/add-bw-track.pl', (
        '--in' => $t->filename,
        '--out' => $t2->filename,
        '--label' => 'foo',
        '--category' => 'My Test Category',
        '--bw_url' => '/foo/bar.bw'
    );
};
ok( ! $?, 'script succeeded' );
is( $stderr, '', 'nothing on stderr' );

$data = $j->decode( do { open my $f, '<', "$t2" or die; local $/; scalar <$f> } );
is_deeply( $data, {
   'tracks' => [
     {
       'autoscale' => 'local',
       'bicolor_pivot' => 'zero',
       'category' => 'My Test Category',
       'key' => 'foo',
       'label' => 'foo',
       'storeClass' => 'JBrowse/Store/SeqFeature/BigWig',
       'type' => 'JBrowse/View/Track/Wiggle/Density',
       'urlTemplate' => '/foo/bar.bw'
     }
   ]
}
, 'got the right tracklist data after' )
    or diag explain $data;

done_testing;
