use strict;
use warnings;

use Test::More;

use File::Spec::Functions 'catfile';
use File::Temp;
use Capture::Tiny 'capture';

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp_tree';

my $tempdir = File::Temp->newdir;

## check behavior for missing ref seqs

my ( $stdout, $stderr ) = capture {
    system $^X, 'bin/prepare-refseqs.pl', (
        '--conf' => 'sample_data/raw/yeast_genbank.json',
        '--refs' => 'DOES NOT EXIST',
        '--out'  => $tempdir,
        );
};
ok( ! $?, 'script succeeded for nonexistent ref' );
like( $stderr, qr/DOES NOT EXIST.+not found/i, 'warning message looks right' );

## check basic formatting of volvox sequence

$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    #'--refs'  => 'ctgA',
    '--fasta' => 'sample_data/raw/volvox/volvox.fa',
    '--out'   => $tempdir,
   );

my $output = slurp_tree( $tempdir );
is_deeply( $output,
           slurp_tree('tests/data/volvox_formatted_refseqs'),
           'got the right volvox formatted sequence',
          )
#    or diag explain $output
;

## check genbank formatting

$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--refs'  => 'NC_001133',
    '--conf' => 'sample_data/raw/yeast_genbank.json',
    '--out'   => $tempdir,
   );

ok( !$?, 'yeast genbank formatting ran OK' );

done_testing;

