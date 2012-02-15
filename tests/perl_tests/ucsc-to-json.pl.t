use strict;
use warnings;

use Test::More;
use File::Spec;
use File::Temp;

use lib 'tests/perl_tests/lib';

use FileSlurping 'slurp_tree';

my $tempdir = File::Temp->newdir( CLEANUP => 1 );
diag "writing output to $tempdir";

system $^X, 'bin/ucsc-to-json.pl', (
    '-q',
    '--compress',
    '--in'    => 'tests/data/hg19/database/',
    '--out'   => "$tempdir",
    '--track' => 'knownGene',
    '--cssclass' => 'transcript',
    '--subfeatureClasses' => qq|{"CDS":"transcript-CDS", "UTR": "transcript-UTR"}|,
    '--arrowheadClass' => 'transcript-arrowhead',
  );
ok( ! $?, 'ucsc-to-json.pl ran ok' );

is_deeply(
    slurp_tree( $tempdir ),
    slurp_tree( 'tests/data/hg19_formatted/' ),
    'ucsc_to_json.pl made the right output',
  );


# make sure it has the right output
done_testing;

