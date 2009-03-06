#!/usr/bin/perl -w

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use File::Spec::Functions;
use Cwd qw/ abs_path /;
use File::Temp qw/ tempdir /;
use Fcntl ':mode';
use LazyPatricia;
use JSON;

my %trackHash;
my @trackList;

my $destDir = "names";
my $thresh = 200;
my $verbose = 0;
GetOptions("dir=s" => \$destDir,
           "thresh=i" => \$thresh,
           "verbose+" => \$verbose);

if (!@ARGV) {
    die <<USAGE;
USAGE: $0 [--dir <output directory>] [--thresh <n>] [--verbose] <JSON file(s)>

    --dir: defaults to "$destDir"

USAGE
}

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
my $OLDSEP = $/;
undef $/;
foreach my $infile (@ARGV) {
    open JSON, "<$infile"
      or die "couldn't open $infile: $!";
    my $names = JSON::from_json(<JSON>);
    close JSON
      or die "couldn't close $infile: $!";
    foreach my $nameinfo (@$names) {
        foreach my $alias (@{$nameinfo->[0]}) {
            my $track = $nameinfo->[1];
            if (!defined($trackHash{$track})) {
                $trackHash{$track} = $trackNum++;
                push @trackList, $track;
            }

            push @{$nameHash{lc $alias}}, [$trackHash{$track},
                                           @{$nameinfo}[2..$#{$nameinfo}]];
        }
    }
}
$/ = $OLDSEP;

my $trie = LazyPatricia::create(\%nameHash);
$trie->[0] = \@trackList;

my ($total, $thisChunk) =
  LazyPatricia::partition($trie, "", $thresh, \&partitionCallback);

print STDERR "$total total names, with $thisChunk in the root chunk\n" if $verbose;

writeJSON($trie, catfile($outDir, "root.json"));

# make output directory readable
chmod S_IRWXU|S_IRGRP|S_IXGRP|S_IROTH|S_IXOTH, $outDir;

my $tempDir = tempdir(DIR => $parentDir);
if (-e $destDir) {
    rename $destDir, $tempDir
      or die "couldn't rename $destDir to $tempDir: $!";
}
# race condition here, probably we should only have one generate-names.pl
# running at a time (loop the rename instead? or version?)
rename $outDir, $destDir
  or die "couldn't rename $outDir to $destDir: $!";

my @nameFiles = glob(catfile($tempDir, "*"));
if (@nameFiles) {
    unlink @nameFiles
      or die "couldn't unlink name files: $!";
}
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


=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
