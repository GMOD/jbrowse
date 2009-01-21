#!/usr/bin/perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use JsonGenerator;

my ($confFile, $gff, $refs, $refids);
my $outDir = "data";
GetOptions("out=s" => \$outDir,
           "conf=s" => \$confFile,
           "gff=s" => \$gff,
	   "refs=s" => \$refs,
           "refids=s" => \$refids);

if (!(defined($gff) || defined($confFile))) {
    print <<HELP;
USAGE:
       $0 [--out <output directory>] --gff <gff file describing refseqs>
   OR:
       $0 [--out <output directory>] --conf <JBrowse config file> --refs <list of refseq names> --refids <list of refseq IDs>
    <output directory>: defaults to "data"

    you can use a GFF file to describe the reference sequences, or you can use a JBrowse config file and a list of refseq names or a list of refseq IDs.  If you use a GFF file, it should contain ##sequence-region lines as described in the GFF specs.  If you use a JBrowse config file, you can either provide a (comma-separated) list of refseq names, or (if the names aren't globally unique) a list of refseq IDs.
HELP
exit;
}

mkdir($outDir) unless (-d $outDir);

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
    $db->absolute(1)               if $db->can('absolute');

    if (defined($refids)) {
        foreach my $refid (split ",", $refids) {
            my $seg = $db->segment(-db_id => $refid);
            push @refSeqs, {
                name => refName($seg),
                id => $refid, #keep ID for later querying
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length
            };
        }
    }

    if (defined($refs)) {
        foreach my $ref (split ",", $refs) {
            my $seg = $db->segment(-name => $ref);
            push @refSeqs, {
                name => refName($seg),
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length
            };
        }
    }
}

die "found no ref seqs" if ($#refSeqs < 0);

JsonGenerator::modifyJSFile("$outDir/refSeqs.js", "refSeqs",
                            sub { return \@refSeqs});
#JsonGenerator::writeJSON("$outDir/refSeqs.json", \@refSeqs);

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
