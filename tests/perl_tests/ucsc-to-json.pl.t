use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use Test::More;
use File::Spec;
use File::Temp;

use Capture::Tiny 'capture';

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


# test a garbage track name
my ( $stdout, $stderr ) = capture {
    system $^X, 'bin/ucsc-to-json.pl', (
    '-q',
    '--compress',
    '--in'    => 'tests/data/hg19/database/',
    '--out'   => "$tempdir",
    '--track' => 'nonExistentTrack',
    '--cssclass' => 'transcript',
  );
};
like( $stderr, qr/not found/, qq|got a "not found" message when trying to format a track that is not in found in the UCSC dumps|);
diag $stderr;
is( $stdout, '', 'nothing on stdout' );

# test a track name that we don't have the files for
( $stdout, $stderr ) = capture {
    system $^X, 'bin/ucsc-to-json.pl', (
    '-q',
    '--compress',
    '--in'    => 'tests/data/hg19/database/',
    '--out'   => "$tempdir",
    '--track' => 'jaxQtlAsIs',
    '--cssclass' => 'transcript',
  );
};
like( $stderr, qr/must have both files/, "got an appropriate message when trying to format a track that we don't have the files for");
diag $stderr;
is( $stdout, '', 'nothing on stdout');

done_testing;

