#!/usr/bin/perl -w

use strict;
use warnings;
use Getopt::Long;
use LazyPatricia;
use JSON;

my %trackHash;
my @trackList;

my ($outDir, $rootFile);
GetOptions("dir=s" => \$outDir);
my $trackNum = 0;

my %nameHash;
while (<>) {
    chomp;
    my ($name, $track, @fields) = split;
    if (!defined($trackHash{$track})) {
        $trackHash{$track} = $trackNum++;
        push @trackList, $track;
    }

    push @{$nameHash{$name}}, [$trackHash{$track}, @fields];
}

my $trie = LazyPatricia::create(\%nameHash);
$trie->[0] = \@trackList;

open OUTPUT, ">$outDir/root.json"
    or die "couldn't open name root file: $!";
print OUTPUT JSON::to_json($trie, {pretty => 1});
close OUTPUT
    or die "couldn't close name root file: $!";

