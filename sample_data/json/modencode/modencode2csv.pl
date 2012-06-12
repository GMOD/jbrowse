#!/usr/bin/env perl
use strict;
use warnings;
use autodie ':all';
use 5.10.0;

use JSON 2;

my $data = from_json( do { local $/; open my $f, '<', $ARGV[0]; scalar <$f> } );

my @fields = qw( technique factor target principal_investigator submission label category type Developmental-Stage organism key );

say join ',', map "\"$_\"", @fields;

for my $item ( @{$data->{items}} ) {
    $item->{key} = $item->{label};
    no warnings 'uninitialized';
    for my $track ( @{$item->{Tracks}} ) {
        $item->{label} = $track;
        say join ',', map "\"$_\"", @{$item}{@fields};
    }
}
