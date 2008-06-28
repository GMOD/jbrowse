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
    my ($name, $track, $start, $end, @fields) = split("\t");
    if (!defined($trackHash{$track})) {
        $trackHash{$track} = $trackNum++;
        push @trackList, $track;
    }

    push @{$nameHash{lc $name}}, [int($trackHash{$track}),
                                  int($start), int($end),
                                  @fields];
}

my $trie = LazyPatricia::create(\%nameHash);
$trie->[0] = \@trackList;

LazyPatricia::partition($trie, "", 500, \&partitionCallback);

writeJSON($trie, "$outDir/root.json");

sub writeJSON {
    my ($root, $outFile) = @_;
    open OUTPUT,">$outFile"
      or die "couldn't open $outFile: $!";
    print OUTPUT JSON::to_json($root, {pretty => 0});
    close OUTPUT
      or die "couldn't close $outFile: $!";
}

sub partitionCallback {
    my ($subtreeRoot, $prefix, $count) = @_;
    # output subtree
    writeJSON($subtreeRoot, "$outDir/lazy-$prefix.json");

    # prune subtree from parent
    $subtreeRoot->[1] = $subtreeRoot->[0];
    $subtreeRoot->[0] = int($count);
    $#{$subtreeRoot} = 1;
}
