use strict;
use warnings;

use File::Spec::Functions 'catfile';
use File::Temp;
use Test::More;

use File::Copy::Recursive 'dircopy';

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp';

my @testargs = ( ['--nolinks'], [] );

for my $args ( @testargs ) {

    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    diag "using temp dir $tempdir";

    dircopy( 'tests/data/base_pairing/mahoney_formatted', $tempdir );

    system $^X, 'bin/draw-basepair-track.pl', (
        '--out'        => $tempdir,
        '--gff'        => 'tests/data/base_pairing/XdecoderStructure.gff',
        '--trackLabel' => 'foo',
        '--key'        => 'Fooish Test Data',
        @$args,
    );

    ok( ! $?, 'script ran ok' );

    #system "find $tempdir -type f";

    ok( scalar glob("$tempdir/tracks/foo/mahoney/*/*.png"), 'made some pngs' );
    ok( -f catfile( $tempdir, qw( tracks foo mahoney trackData.json ) ), 'made trackData' );
    my $tracklist = slurp( $tempdir, qw( trackList.json ) );
    is_deeply(
        $tracklist,
        {
          'formatVersion' => 1,
          'tracks' => [
            {
              'config' => {
                'chunkSize' => 20000,
                'urlTemplate' => 'seq/{refseq}/'
              },
              'key' => 'DNA',
              'label' => 'DNA',
              'type' => 'SequenceTrack'
            },
            {
              'config' => {
                'compress' => 0,
                'urlTemplate' => 'tracks/foo/{refseq}/trackData.json'
              },
              'key' => 'Fooish Test Data',
              'label' => 'foo',
              'type' => 'ImageTrack'
            }
          ]
        },
        'made the right tracklist'
     ) or diag explain $tracklist;

}

done_testing;
