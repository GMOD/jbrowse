#!/usr/bin/perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use POSIX;
use Getopt::Long;
use JsonGenerator;

my $chunkSize = 20000;
my ($confFile, $noSeq, $seqDir, $gff, $refs, $refids);
my $outDir = "data";
my $seqTrackName = "DNA";
GetOptions("out=s" => \$outDir,
           "conf=s" => \$confFile,
           "noseq" => \$noSeq,
           "seqdir=s" => \$seqDir,
           "gff=s" => \$gff,
	   "refs=s" => \$refs,
           "refids=s" => \$refids);
$seqDir = "$outDir/seq" unless defined $seqDir;

if (!(defined($gff) || defined($confFile))) {
    print <<HELP;
USAGE:
       $0 [--out <output directory>] --gff <gff file describing refseqs>
   OR:
       $0 [--out <output directory>] [--noseq] [--seqdir <sequence data directory>] --conf <JBrowse config file> --refs <list of refseq names> --refids <list of refseq IDs>
    <output directory>: defaults to "data"
    <sequence data directory>: chunks of sequence go here; defaults to "<output directory>/seq"

    --noseq: do not prepare sequence data for the client.

    You can use a GFF file to describe the reference sequences, or
    you can use a JBrowse config file and a list of refseq names
    or a list of refseq IDs.  If you use a GFF file, it should
    contain ##sequence-region lines as described in the GFF specs.
    If you use a JBrowse config file, you can either provide a
    (comma-separated) list of refseq names, or (if the names
    aren't globally unique) a list of refseq IDs.
HELP
exit;
}

mkdir($outDir) unless (-d $outDir);
mkdir($seqDir) unless $noSeq || (-d $seqDir);

my @refSeqs;

sub refName {
    my $seg = shift;
    use Data::Dumper;
    my $segName = $seg->name;
    $segName = $seg->{'uniquename'} if $seg->{'uniquename'};
    $segName =~ s/:.*$//; #get rid of coords if any
    return $segName;
}

if (defined($gff)) {
    open GFF, "<$gff"
      or die "couldn't open GFF file $gff: $!";
    while (<GFF>) {
        if (/^\#\#\s*sequence-region\s+(\S+)\s+(-?\d+)\s+(-?\d+)/i) { # header line
            push @refSeqs, {
                            name => $1,
                            start => $2 - 1, 
                            end => int($3), 
                            length => ($3 - $2 + 1)
                           };
        }
    }
    close GFF
      or die "couldn't close GFF file $gff: $!";
} elsif (defined($confFile)) {
    my $config = JsonGenerator::readJSON($confFile, undef, 1);

    eval "require $config->{db_adaptor}; 1" or die $@;

    my $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})}
        or warn $@;
    die "Could not open database: $@" unless $db;

    if (my $refclass = $config->{'reference class'}) {
        eval {$db->default_class($refclass)};
    }
    $db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');

    if (defined($refids)) {
        foreach my $refid (split ",", $refids) {
            my $seg = $db->segment(-db_id => $refid);
            my $refInfo = {
                name => refName($seg),
                id => $refid, #keep ID for later querying
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length
            };

            unless ($noSeq) {
                my $refDir = $seqDir . "/" . $refInfo->{"name"};
                exportSeqChunks($refDir, $chunkSize, $db,
                                [-db_id => $refid],
                                $seg->start, $seg->end);
                $refInfo->{"seqDir"} = $refDir;
                $refInfo->{"seqChunkSize"} = $chunkSize;
            }

            push @refSeqs, $refInfo;
        }
    }

    if (defined($refs)) {
        foreach my $ref (split ",", $refs) {
            my $seg = $db->segment(-name => $ref);
            my $refInfo =  {
                name => refName($seg),
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length
            };

            unless ($noSeq) {
                my $refDir = $seqDir . "/" . $refInfo->{"name"};
                exportSeqChunks($refDir, $chunkSize, $db,
                                [-name => $ref],
                                $seg->start, $seg->end);
                $refInfo->{"seqDir"} = $refDir;
                $refInfo->{"seqChunkSize"} = $chunkSize;
            }

            push @refSeqs, $refInfo;
        }
    }
}

sub exportSeqChunks {
    my ($dir, $len, $db, $segDef, $start, $end) = @_;

    mkdir($dir) unless (-d $dir);
    $start = 1 if ($start < 1);
    $db->absolute(1)               if $db->can('absolute');

    my $chunkStart = $start;
    while ($chunkStart <= $end) {
        my $chunkEnd = $chunkStart + $len - 1;
        my $chunkNum = floor(($chunkStart - 1) / $chunkSize);
        my $path = "$dir/$chunkNum.txt";
        my $seg = $db->segment(@$segDef,
                               -start => $chunkStart,
                               -end => $chunkEnd,
                               -absolute => 1);
        die "requested $chunkStart .. $chunkEnd; got " . $seg->start . " .. " . $seg->end if ($seg->start != $chunkStart);
        $chunkStart = $chunkEnd + 1;
        next unless ($seg && $seg->seq && $seg->seq->seq);


        open CHUNK, ">$path"
          or die "couldn't open $path: $!";
        print CHUNK $seg->seq->seq;
        close CHUNK
          or die "couldn't open $path.txt: $!";
    }
}

die "found no ref seqs" if ($#refSeqs < 0);

JsonGenerator::modifyJSFile("$outDir/refSeqs.js", "refSeqs",
                            sub { return \@refSeqs});

unless ($noSeq) {
    JsonGenerator::modifyJSFile("$outDir/trackInfo.js", "trackInfo",
                                sub {
                                    my $trackList = shift;
                                    my $i;
                                    for ($i = 0; $i <= $#{$trackList}; $i++) {
                                        last if ($trackList->[$i]->{'label'}
                                                 eq
                                                 $seqTrackName);
                                    }
                                    $trackList->[$i] =
                                      {
                                       'label' => $seqTrackName,
                                       'key' => $seqTrackName,
                                       'url' => "$seqDir/{refseq}/",
                                       'type' => "SequenceTrack",
                                       'args' => {'chunkSize' => $chunkSize}
                                      };
                                    return $trackList;
                            });
}

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
