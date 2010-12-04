#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use POSIX;
use Getopt::Long;
use JsonGenerator;
use FastaDatabase;

my $chunkSize = 20000;
my ($confFile, $noSeq, $gff, $fasta, $refs, $refids);
my $outDir = "data";
my $seqTrackName = "DNA";
GetOptions("out=s" => \$outDir,
           "conf=s" => \$confFile,
           "noseq" => \$noSeq,
           "gff=s" => \$gff,
           "fasta=s" => \$fasta,
	   "refs=s" => \$refs,
           "refids=s" => \$refids);
# $seqRel is the path relative to $outDir
my $seqRel = "seq";
my $seqDir = "$outDir/$seqRel";

if (!(defined($gff) || defined($confFile) || defined($fasta))) {
    print <<HELP;
USAGE:
       $0 --gff <GFF file>  [options]
   OR:
       $0 --fasta <FASTA file>  [options]
   OR:
       $0 --conf <JBrowse config file>  [options]

      Options:
          [--out <output directory>]
          [--seqdir <sequence data directory>]
          [--noseq]
          [--refs <list of refseq names> | --refids <list of refseq IDs>]

    <output directory>: defaults to "$outDir"
    <sequence data directory>: chunks of sequence go here;
                               defaults to "<output directory>/seq"
    --noseq: do not prepare sequence data for the client

    You can use a GFF file to describe the reference sequences; or
    you can use a JBrowse config file (pointing to a BioPerl database)
    or a FASTA file, together with a list of refseq names
    or a list of refseq IDs.  If you use a GFF file, it should
    contain ##sequence-region lines as described in the GFF specs.

    If you use a JBrowse config file or FASTA file, you can either
    provide a (comma-separated) list of refseq names, or
    (if the names aren't globally unique) a list of refseq IDs;
    or (for FASTA files only) you can omit the list of refseqs,
    in which case every sequence in the database will be used.

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

    die "found no sequence-region lines in GFF file" if ($#refSeqs < 0);

} elsif (defined($fasta) || defined($confFile)) {
    my $db;

    if (defined($fasta)) {
        $db = FastaDatabase->from_fasta ($fasta);

        die "IDs not implemented for FASTA database" if defined($refids);

        if (!defined($refs) && !defined($refids)) {
            $refs = join (",", $db->seq_ids);
        }

        die "found no sequences in FASTA file" if ("" eq $refs);

    } elsif (defined($confFile)) {
        my $config = JsonGenerator::readJSON($confFile);

        eval "require $config->{db_adaptor}; 1" or die $@;

        $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})}
          or warn $@;

        die "Could not open database: $@" unless $db;

        if (my $refclass = $config->{'reference class'}) {
            eval {$db->default_class($refclass)};
        }
        $db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
    }

    die "please specify which sequences to process using the --refs or --refids command line parameters\n"
      unless (defined($refids) || defined($refs));

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
                $refInfo->{"seqDir"} = $seqRel . "/" . $refInfo->{"name"};
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
                            sub {
                                #add new ref seqs while keeping the order
                                #of the existing ref seqs
                                my $old = shift;
                                my %refs;
                                $refs{$_->{name}} = $_ foreach (@refSeqs);
                                for (my $i = 0; $i <= $#{$old}; $i++) {
                                    $old->[$i] = delete $refs{$old->[$i]->{name}}
                                      if $refs{$old->[$i]->{name}};

                                }
                                foreach my $newRef (@refSeqs) {
                                    push @{$old}, $newRef
                                      if $refs{$newRef->{name}};
                                }
                                return $old;
                            });

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
                                       'url' => "$seqRel/{refseq}/",
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
