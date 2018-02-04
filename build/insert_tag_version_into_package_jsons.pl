#!/usr/bin/env perl


# this is a little script that parses the TRAVIS_TAG env variable and, if it is like "1.x.x-release",
# inserts the version into the json files listed on the command line


use strict;
use warnings;

use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";

use JBlibs;

use JSON 2;

local $/;

my $release = $ENV{TRAVIS_TAG};
$release =~ s/\-release$//
    or die "no TRAVIS_TAG env var defined or it's malformed. expecting something like '1.12.4-release'.";

print "detected release tag $ENV{TRAVIS_TAG} for version $release\n";

my $json = JSON->new->pretty->canonical;
for my $filename (@ARGV) {
    print "inserting version $release into $filename\n";
    my $j = $json->decode( <> );
    $j->{version} = $release;
    open my $f, '>', $filename or die "$! writing $filename";
    $f->print( $json->encode($j) );
}
