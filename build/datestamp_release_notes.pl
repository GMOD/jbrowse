#!/usr/bin/env perl
use strict;
use warnings;

use DateTime;

my $datestring = DateTime
    ->from_epoch(
        epoch => time(),
        time_zone => DateTime::TimeZone->new(name => "UTC")
    )
    ->format_cldr(q|yyyy-MM-dd HH:mm:ss VVVV|);

my $release_version = shift;

while(<>) {
    s/\{\{\$NEXT\}\}\s*/# Release $release_version     $datestring\n/m;
    print;
}

