use strict;
use warnings;

use File::Spec::Functions 'catfile';
use File::Temp;
use Test::More;

use File::Copy::Recursive 'dircopy';

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

done_testing;
