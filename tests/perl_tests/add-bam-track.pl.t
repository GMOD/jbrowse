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
    system $^X, 'bin/add-bam-track.pl', (
        '--in' => $t->filename,
        '--out' => $t2->filename,
        '--label' => 'foo',
        '--key' => 'My BAM Track',
        '--category' => 'My Test Category',
        '--bam_url' => '/foo/bar.bammy',
        '--config' => '{ "zee": "zonker", "key": "My BAM Track Overridden" }'
    );
};
ok( ! $?, 'script succeeded' );
is( $stderr, '', 'nothing on stderr' );

$data = $j->decode( do { open my $f, '<', "$t2" or die; local $/; scalar <$f> } );
is_deeply( $data, {
   'tracks' => [
     {
       'category' => 'My Test Category',
       'key' => 'My BAM Track Overridden',
       'label' => 'foo',
       'storeClass' => 'JBrowse/Store/SeqFeature/BAM',
       'type' => 'JBrowse/View/Track/Alignments2',
       'urlTemplate' => '/foo/bar.bammy',
       'zee' => 'zonker'
     }
   ]
}
, 'got the right tracklist data after' )
    or diag explain $data;

done_testing;
