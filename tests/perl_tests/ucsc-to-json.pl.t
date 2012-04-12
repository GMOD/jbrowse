use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use Test::More;
use File::Spec;
use File::Temp;

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

#system "cp -r $tempdir/* tests/data/hg19_formatted/";

# make sure it has the right output
is_deeply(
    slurp_tree( $tempdir ),
    slurp_tree( 'tests/data/hg19_formatted/' ),
    'ucsc_to_json.pl made the right output',
  );

done_testing;

