#!/usr/bin/env perl
use strict;
use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";
use JBlibs;

use Bio::JBrowse::Cmd::FormatSequences;

exit Bio::JBrowse::Cmd::FormatSequences->new(@ARGV)->run;

__END__

=head1 NAME

prepare-refseqs.pl - format reference sequences for use by JBrowse

=head1 USAGE

       prepare-refseqs.pl --gff <GFF file>  [options]
   # OR:
       prepare-refseqs.pl --fasta <file1> --fasta <file2>  [options]
   # OR:
       prepare-refseqs.pl --conf <JBrowse config file>  [options]

=head1 DESCRIPTION

This tool can read fasta files compressed with gzip, if they end in
.gz or .gzip.

You can use a GFF file to describe the reference sequences; or you can
use a JBrowse config file (pointing to a BioPerl database) or a FASTA
file, together with a list of refseq names or a list of refseq IDs.
If you use a GFF file, it should contain ##sequence-region lines as
described in the GFF specs, and/or it should be GFF version 3 with an
embedded FASTA section.

If you use a JBrowse config file or FASTA file, you can either provide
a (comma-separated) list of refseq names, or (if the names aren't
globally unique) a list of refseq IDs; or (for FASTA files only) you
can omit the list of refseqs, in which case every sequence in the
database will be used.

=head1 OPTIONS

=over 4

=item --out <output directory>

Optional directory to write to.  Defaults to data/.

=item --noseq

Do not write out the actual sequence bases, just the sequence metadata.

=item --refs <list of refseq names> | --refids <list of refseq IDs>

Output only sequences with the given names or (database-dependent) IDs.

=item --compress

If passed, compress the reference sequences with gzip, making the
chunks be .txt.gz.  NOTE: this requires a bit of additional web server
configuration to be served correctly.

=item --chunksize <num>

Size of sequence chunks to make, in base pairs.  Default 20kb.  This
is multiplied by 4 if --compress is passed, so that the compressed
sequence files are still approximately this size.

=item --nohash

Store sequences in a flat seq/$seqname/$chunk.txt structure, instead
of the new (more scalable) /seq/hash/hash/hash/$seqname-$chunk.txt
structure.

=back

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
