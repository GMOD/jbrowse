#!/usr/bin/env perl


# this is a little script that parses the TRAVIS_TAG env variable and, if it is like "1.x.x-release",
# inserts the version into the json files listed on the command line

use strict;
use warnings;

use JSON 2;

my $release = shift;
$release =~ s/\-release$//;
print "setting package versions to $release\n";

my $json = JSON->new->pretty->canonical;
for my $filename (@ARGV) {
    print "inserting version $release into $filename\n";
    my $text = do {
        local $/;
        open my $f, '<', $filename or die "$! reading $filename";
        <$f>
    };

    $text =~ s/"version"\s*:\s*"[^"]+"/"version": "$release"/
        or die "failed to insert version info $filename";
    
    open my $f, '>', $filename or die "$! writing $filename";
    $f->print( $text );
}
