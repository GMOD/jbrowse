use strict;
use warnings;

use File::Spec::Functions 'catfile';
use File::Temp;
use Test::More;

use File::Copy::Recursive 'dircopy';

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp';

my $tempdir = File::Temp->newdir;
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
                           'key' => 'volvox_microarray.wig',
                           'style' => {
                               'className' => 'image',
                               },
                           'urlTemplate' => 'tracks/volvox_microarray.wig/{refseq}/trackData.json'
                           },
                       'key' => 'volvox_microarray.wig',
                       'label' => 'volvox_microarray.wig',
                       'type' => 'ImageTrack'
                   },
                 ],
               },
           'got the right tracklist',
         ) or diag explain $tracklist;

done_testing;
