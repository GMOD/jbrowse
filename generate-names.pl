#!/usr/bin/perl -w

use strict;
use warnings;
use Getopt::Long;
use File::Spec::Functions;
use Cwd qw/ abs_path /;
use File::Temp qw/ tempdir /;
use LazyPatricia;
use JSON;

my %trackHash;
my @trackList;

my ($destDir, $rootFile);
my $thresh = 500;
my $verbose = 0;
GetOptions("dir=s" => \$destDir,
           "thresh=i" => \$thresh,
           "verbose+" => \$verbose);

my $parentDir = abs_path(catdir($destDir, updir()));
my $outDir = tempdir(DIR => $parentDir);
my $trackNum = 0;

sub partitionCallback {
    my ($subtreeRoot, $prefix, $thisChunk, $total) = @_;
    # output subtree
    writeJSON($subtreeRoot, catfile($outDir, "lazy-$prefix.json"));
    printf STDERR "subtree for %15s   has %10d  in chunk, %10d  total\n", $prefix, $thisChunk, $total if $verbose;
}

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

my ($total, $thisChunk) =
  LazyPatricia::partition($trie, "", $thresh, \&partitionCallback);

print STDERR "$total total names, with $thisChunk in the root chunk\n" if $verbose;

writeJSON($trie, catfile($outDir, "root.json"));

my $tempDir = tempdir(DIR => $parentDir);
rename $destDir, $tempDir
  or die "couldn't rename $destDir to $tempDir: $!";
# race condition here, probably we should only have one generate-names.pl
# running at a time (loop the rename instead?)
rename $outDir, $destDir
  or die "couldn't rename $outDir to $destDir: $!";

unlink glob(catfile($tempDir, "*"))
  or die "couldn't unlink name files: $!";
rmdir $tempDir
  or die "couldn't remove $tempDir: $!";


sub writeJSON {
    my ($root, $outFile) = @_;
    open OUTPUT,">$outFile"
      or die "couldn't open $outFile: $!";
    print OUTPUT JSON::to_json($root, {pretty => 0});
    close OUTPUT
      or die "couldn't close $outFile: $!";
}

