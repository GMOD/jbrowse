use strict;
use warnings;

use JBlibs;

use Test::More;

use File::Spec::Functions 'catfile';
use File::Temp;
use File::Copy::Recursive 'dircopy';

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp_tree';

my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
diag "using temp dir $tempdir";
dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

system $^X, 'bin/bam-to-json.pl', (
    '--out'        => $tempdir,
    '--bam'        => 'sample_data/raw/volvox/volvox-sorted.bam',
    '--trackLabel' => 'TestBAM',
    '--clientConfig' => '{ "foobee": 1 }',
);

ok( !$?, 'script ran ok' );

my $out = slurp_tree( $tempdir );
is( $out->{'trackList.json'}{tracks}[1]{label}, 'TestBAM',
           'BAM in the trackList', #kick it up a notch
         )
    or diag explain $out->{tracks};

is( ref(  $out->{ catfile(qw( tracks TestBAM ctgA lf-4.json  )) } ),
    'ARRAY',
    'BAM! got some features up in there',
  );

is( $out->{'trackList.json'}{tracks}[1]{style}{foobee}, 1, 'got some style' );
is( $out->{'trackList.json'}{tracks}[1]{style}{className}, 'basic', 'got default CSS class' );


#system "find $tempdir";

done_testing;
