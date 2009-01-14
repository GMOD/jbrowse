#!/usr/bin/perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use Bio::Graphics::Browser::Util;
use JsonGenerator;

my ($conf, $source, $gff, $refs, $refids);
my $outDir = "data";
GetOptions("out=s" => \$outDir,
           "conf=s" => \$conf,
           "src=s" => \$source,
           "gff=s" => \$gff,
	   "refs=s" => \$refs,
           "refids=s" => \$refids);

if (!(defined($gff) || defined($conf))) {
    print <<HELP;
USAGE:
       $0 [--out <output directory>] --gff <gff file describing refseqs>
   OR:
       $0 [--out <output directory>] --conf <GBrowse config dir> --src <GBrowse config source> --refs <list of refseq names> --refids <list of refseq IDs>
    <output directory>: defaults to "data"

    you can use a GFF file to describe the reference sequences, or you can use a GBrowse config file and a list of refseq names or a list of refseq IDs.  If you use a GFF file, it should contain ##sequence-region lines as described in the GFF specs.  If you use a GBrowse config file, you can either provide a (comma-separated) list of refseq names, or (if the names aren't globally unique) a list of refseq IDs.
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
} elsif (defined($conf)) {
    my $browser = open_config($conf);
    $browser->source($source) or die "ERROR: source $source not found (the choices are: " . join(", ", $browser->sources) . "\n";
    my $db = open_database($browser);

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
