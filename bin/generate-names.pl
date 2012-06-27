#!/usr/bin/env perl

=head1 NAME

generate-names.pl - generate a global index of feature names

=head1 USAGE

  generate-names.pl                        \
      [ --out <output directory> ]         \
      [ --thresh <threshold> ]             \
      [ --verbose ]

=head1 OPTIONS

=over 4

=item --out <directory>

Data directory to process.  Default 'data/'.

=item --thresh <threshold>

Optional LazyPatricia chunking threshold.  Default 200.  See
L<LazyPatricia> for details.

=item --verbose

Print more progress messages.

=item --help | -h | -?

Print a usage message.

=back

=cut

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib/perl5";
use JBlibs;

use Fcntl ":flock";
use File::Spec::Functions;
use Getopt::Long;
use IO::File;
use Pod::Usage;

use JSON 2;


use LazyPatricia;
use GenomeDB;

use Data::Dumper;
$Data::Dumper::Indent = 1;

my %trackHash;
my @tracksWithNames;

my $outDir = "data";
my $thresh = 200;
my $verbose = 0;
my $help;
GetOptions("dir|out=s" => \$outDir,
           "thresh=i" => \$thresh,
           "verbose+" => \$verbose,
           "help|h|?" => \$help) or pod2usage();

pod2usage( -verbose => 2 ) if $help;

unless (-d $outDir) {
    die <<OUTDIR;
Can't find directory "$outDir".
Run this program from a different working directory,
or specify the location of the output directory with
the --dir command line option.
OUTDIR
}

my $gdb = GenomeDB->new( $outDir );
my $nameDir = catdir($outDir, "names");
mkdir($nameDir) unless (-d $nameDir);

my @refSeqs  = @{ $gdb->refSeqs   };
my @tracks   = @{ $gdb->trackList };

# open the root file; we lock this file while we're
# reading the name lists, deleting all the old lazy-*
# files, and writing new ones.
my $rootFile = catfile($nameDir, "root.json");
my $root = new IO::File $rootFile, O_WRONLY | O_CREAT
  or die "couldn't open $rootFile: $!";
flock $root, LOCK_EX;

# read the name list for each track that has one
my %nameHash;
my $trackNum = 0;
my @namearray;

foreach my $ref (@refSeqs) {
    push @{$nameHash{lc $ref->{name}}}, [ @{$ref}{ qw/ name length name seqDir start end seqChunkSize/ }];
    foreach my $track (@tracks) {
        my $infile = catfile( $outDir,
                              "tracks",
                              $track->{label},
                              $ref->{name},
                              "names.json");
        next unless -e $infile;

        my $names = do {
            local $/;
            open my $j, '<', $infile or die "$! reading $infile";
            JSON::from_json(<$j>);
        };

        foreach my $nameinfo ( @$names) {
            foreach my $alias ( @{$nameinfo->[0]} ) {
                my $track = $nameinfo->[1];
                unless( defined $trackHash{$track} ) {
                    $trackHash{$track} = $trackNum++;
                    push @tracksWithNames, $track;
                }

                push @{$nameHash{lc $alias}}, [ $alias,
                                                $trackHash{$track},
                                                @{$nameinfo}[2..$#{$nameinfo}]];
            }
        }
    }
}

# clear out old data
$root->seek(0, SEEK_SET);
$root->truncate(0);
if( my @lazyFiles = glob( catfile( $nameDir, "lazy-*" )) ) {
    unlink @lazyFiles
      or die "couldn't unlink name files: $!";
}

my $trie = LazyPatricia::create( \%nameHash );
$trie->[0] = \@tracksWithNames;

my ($total, $thisChunk) =
  LazyPatricia::partition( $trie, "", $thresh, sub {
      my ($subtreeRoot, $prefix, $thisChunk, $total) = @_;
      # output subtree
      writeJSON( catfile($nameDir, "lazy-$prefix.json"),
                 $subtreeRoot,
                 {pretty => 0} );
      printf STDERR ( "subtree for %15s   has %10d  in chunk, %10d  total\n",
                      $prefix, $thisChunk, $total )
          if $verbose;
  });

print STDERR "$total total names, with $thisChunk in the root chunk\n"
  if $verbose;

# write the root
$root->print( JSON::to_json($trie, {pretty => 0}) );

exit;

############

sub writeJSON {
    my ( $file, $contents, $opts ) = @_;
    open my $f, '>', $file or die "$! writing $file";
    print $f JSON::to_json( $contents, $opts || {} );
}


=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
