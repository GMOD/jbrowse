use strict;
use warnings;

use Test::More;
use File::Temp;
use File::Copy::Recursive 'dircopy';

my $tempdir = File::Temp->newdir;
dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

diag "writing output to $tempdir";
system $^X, 'bin/biodb-to-json.pl', (
    #'-q',
    '--conf'  => 'sample_data/raw/volvox.json',
    '--out'   => "$tempdir",
  );
ok( ! $?, 'biodb-to-json.pl ran ok' );

done_testing;
