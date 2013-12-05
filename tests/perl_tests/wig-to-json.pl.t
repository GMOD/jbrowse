use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use File::Spec::Functions 'catfile';
use File::Temp;
use Test::More;

use File::Copy::Recursive 'dircopy';

use FileSlurping 'slurp';

my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
diag "using temp dir $tempdir";
dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

system $^X, 'bin/wig-to-json.pl', (
      '--out' => $tempdir,
      '--wig' => 'sample_data/raw/volvox/volvox_microarray.wig',
    );
ok( ! $?, 'wig-to-json.pl ran OK' );

ok( -e catfile( $tempdir, qw( tracks volvox_microarray.wig ctgA 5 0.png )),
    'there is a PNG in there someplace' );

#system "find $tempdir -type f";

my $tracklist = slurp( $tempdir, 'trackList.json' );
is_deeply( $tracklist,
           {
               'formatVersion' => 1,
               'tracks' => [
                   {
                       'chunkSize' => 20000,
                       'urlTemplate' => 'seq/{refseq}/',
                       'key' => 'Reference sequence',
                       'category' => 'Reference sequence',
                       'label' => 'DNA',
                       'type' => 'SequenceTrack',
                       'storeClass' => 'JBrowse/Store/Sequence/StaticChunked',
                   },
                   {
                       'compress' => 0,
                       'style' => {
                           'className' => 'image',
                       },
                       'urlTemplate' => 'tracks/volvox_microarray.wig/{refseq}/trackData.json',
                       'key' => 'volvox_microarray.wig',
                       'label' => 'volvox_microarray.wig',
                       'type' => 'ImageTrack.Wiggle'
                   },
                 ],
               },
           'got the right tracklist',
         ) or diag explain $tracklist;

my $trackdata = slurp( $tempdir, 'tracks', 'volvox_microarray.wig', 'ctgA', 'trackData.json' );
is_deeply( $trackdata,
           {
               'stats' => {
                   'global_max' => 899,
                   'global_min' => 100
                   },
               'tileWidth' => 2000,
               'zoomLevels' => [
                   {
                       'basesPerTile' => 2000,
                       'height' => 100,
                       'urlPrefix' => '1/'
                       },
                   {
                       'basesPerTile' => 4000,
                       'height' => 100,
                       'urlPrefix' => '2/'
                       },
                   {
                       'basesPerTile' => 10000,
                       'height' => 100,
                       'urlPrefix' => '5/'
                       },
                   {
                       'basesPerTile' => 20000,
                       'height' => 100,
                       'urlPrefix' => '10/'
                       },
                   {
                       'basesPerTile' => 40000,
                       'height' => 100,
                       'urlPrefix' => '20/'
                       },
                   {
                       'basesPerTile' => 100000,
                       'height' => 100,
                       'urlPrefix' => '50/'
                       },
                   {
                       'basesPerTile' => 200000,
                       'height' => 100,
                       'urlPrefix' => '100/'
                       },
                   {
                       'basesPerTile' => 400000,
                       'height' => 100,
                       'urlPrefix' => '200/'
                       },
                   {
                       'basesPerTile' => 1000000,
                       'height' => 100,
                       'urlPrefix' => '500/'
                       },
                   {
                       'basesPerTile' => 2000000,
                       'height' => 100,
                       'urlPrefix' => '1000/'
                       },
                   {
                       'basesPerTile' => 4000000,
                       'height' => 100,
                       'urlPrefix' => '2000/'
                       },
                   {
                       'basesPerTile' => 10000000,
                       'height' => 100,
                       'urlPrefix' => '5000/'
                       },
                   {
                       'basesPerTile' => 20000000,
                       'height' => 100,
                       'urlPrefix' => '10000/'
                       },
                   {
                       'basesPerTile' => 40000000,
                       'height' => 100,
                       'urlPrefix' => '20000/'
                       },
                   {
                       'basesPerTile' => 100000000,
                       'height' => 100,
                       'urlPrefix' => '50000/'
                       },
                   {
                       'basesPerTile' => 200000000,
                       'height' => 100,
                       'urlPrefix' => '100000/'
                       }
                   ]
               },
           'got the right trackData.json for ctgA',
         ) or diag explain $trackdata;

done_testing;
