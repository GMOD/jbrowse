---
id: prepare-refseqs.pl
title: prepare-refseqs.pl
---

The prepare-refseqs.pl script can load a reference sequence file from

- Indexed FASTA (e.g. .fa and .fai)
- TwoBit (e.g. UCSC .2bit file)
- FASTA (converts to JSON format)
- Chomosome sizes (e.g. just load hg19.chrom.sizes, without sequence data)

The simplest way to use it is with the --fasta option, which uses a single
sequence or set of reference sequences from a FASTA file:

    bin/prepare-refseqs.pl --fasta yourfile.fa

Indexed file formats are becoming much better, so we also suggest you look at
the [indexed file format tutorial](tutorial.html) and consider indexed fasta or
2bit

This script is used to format sequence data for use by JBrowse, and must be run
before adding other tracks. In addition to formatting the sequence data, this
script creates a track called "DNA" that displays the reference sequence. The
simplest way to use it is with the --fasta option, which uses a single sequence
or set of reference sequences from a [FASTA](/Glossary#FASTA 'wikilink') file:

`bin/prepare-refseqs.pl --fasta <fasta file> [options]`

If the file has multiple sequences (e.g. multiple chromosomes), each sequence
will become a reference sequence by default. You may switch between these
sequences by selecting the sequence of interest via the pull-down menu to the
right of the large "zoom in" button.

You may use any alphabet you wish for your sequences (i.e., you are not
restricted to the nucleotides A, T, C, and G; any alphanumeric character, as
well as several other characters, may be used). Hence, it is possible to browse
RNA and protein in addition to DNA. However, some characters should be avoided,
because they will cause the sequence to "split" - part of the sequence will be
cut off and and continue on the next line. These characters are the _hyphen_ and
_question mark_. Unfortunately, this prevents the use of hyphens to represent
gaps in a reference sequence.

In addition to reading from a fasta file, prepare-refseqs.pl can read sequences
from a gff file or a database. In order to read fasta sequences from a database,
a config file must be used.

Syntax used to import sequences from gff files:

`bin/prepare-refseqs.pl --gff <gff file with sequence information> [options]`

Syntax used to import sequences with a config file:

`bin/prepare-refseqs.pl --conf <config file that references a database with sequence information> --[refs|refid] <reference sequences> [options]`

Syntax used to import a indexed fasta(i.e. a fasta file where you run \`samtools
faidx yourfile.fa\` which outputs yourfile.fa.fai)

`bin/prepare-refseqs.pl --indexed_fasta yourfile.fa`

This will copy yourfile.fa and yourfile.fa.fai to the data directory

| Option                                            | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fasta, indexed_fasta, twobit, gff, sizes, or conf | Path to the file that JBrowse will use to import sequences. With the fasta and gff options, the sequence information is imported directly from the specified file. With the sizes option, a tab delimited file with chromosome names and lengths is used, but no sequence information is added. With the conf option, the specified config file includes the details necessary to access a database that contains the sequence information. Exactly one of these three options must be used. With indexed_fasta, the samtools faidx yourfile.fa must be run before hand. With twobit, the twobit file will automatically be copied into your data directory. |
| out                                               | A path to the output directory (default is 'data' in the current directory)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| seqdir                                            | The directory where the reference sequences are stored (default: \<output directory\>\/seq)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| noseq                                             | Causes no reference sequence track to be created. This is useful for reducing disk usage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| refs                                              | A comma-delimited list of the names of sequences to be imported as reference sequences. This option (or refid) is required when using the conf option. It is not required when the fasta or gff options are used, but it can be useful with these options, since it can be used to select which sequences JBrowse will import.                                                                                                                                                                                                                                                                                                                               |
| refids                                            | A comma-delimited list of the database identifiers of sequences to be imported as reference sequences. This option is useful when working with a [Chado](http://gmod.org/wiki/Chado) database that contains data from multiple different species, and those species have at least one chromosome with the same name (e.g. chrX). In this case, the desired chromosome cannot be uniquely identified by name, so it is instead identified by ID. This ID can be found in the 'feature_id' column of 'feature' table in a Chado database.                                                                                                                      |

Note: the `prepare-refseqs.pl --sizes chrom.sizes` option is maybe
underappreciated. You can technically run jbrowse without any sequence data
loaded, simply a set of chromosomes and their sizes. The chrom.sizes file simply
can contain two column tab seperated list of chromosome names and their lengths.

## prepare-refseqs.pl --help

    NAME
        prepare-refseqs.pl - format reference sequences for use by JBrowse

    USAGE
               prepare-refseqs.pl --gff <GFF file>  [options]
           # OR:
               prepare-refseqs.pl --fasta <file1> --fasta <file2>  [options]
           # OR:
               prepare-refseqs.pl --indexed_fasta <file>  [options]
           # OR:
               prepare-refseqs.pl --twobit <file>  [options]
           # OR:
               prepare-refseqs.pl --conf <biodb config file>  [options]
           # OR:
               prepare-refseqs.pl --sizes <sizes file>  [options]
           # OR:
               prepare-refseqs.pl --gff-sizes <gff file>  [options]

    DESCRIPTION
        Formats reference sequence data for use with JBrowse.

        This tool can also read fasta files compressed with gzip, if they end in
        .gz or .gzip.

        You can use a GFF file to describe the reference sequences; or you can use
        a JBrowse config file (pointing to a BioPerl database) or a FASTA file,
        together with a list of refseq names or a list of refseq IDs. If you use a
        GFF file, it should contain ##sequence-region lines as described in the
        GFF specs (for --gff-sizes), and/or it should be GFF version 3 with an
        embedded FASTA section (for --gff).

        If you use a JBrowse config file or FASTA file, you can either provide a
        (comma-separated) list of refseq names, or (if the names aren't globally
        unique) a list of refseq IDs; or (for FASTA files only) you can omit the
        list of refseqs, in which case every sequence in the database will be
        used.

    OPTIONS
        --noSort
            If using GFF or FASTA input, preserve the order of the reference
            sequences (sorts alphabetically by default).

        --conf <file>
            biodb-to-json.pl configuration file that defines a database from which
            to get reference sequence information.

        --out <output directory>
            Optional directory to write to. Defaults to data/.

        --noseq
            Do not store the actual sequence bases, just the sequence metadata
            (name, length, and so forth).

        --refs <comma-separated list of refseq names>
            Output only the sequences with the given names.
        --compress
            If passed, compress the reference sequences with gzip, making the
            chunks be .txt.gz. NOTE: this requires a bit of additional web server
            configuration to be served correctly.

        --chunksize <num>
            Size of sequence chunks to make, in base pairs. Default 20kb. This is
            multiplied by 4 if --compress is passed, so that the compressed
            sequence files are still approximately this size.

        --nohash
            Store sequences in a flat seq/$seqname/$chunk.txt structure, instead
            of the new (more scalable) /seq/hash/hash/hash/$seqname-$chunk.txt
            structure.

        --trackLabel <label>
            The unique name of the sequence track, default 'DNA'.

        --key <string>
            The displayed name of the sequence track, defaults to 'Reference
            sequence'.

        --seqType <string>
            The Name of the alphabet used for these reference sequences, usually
            either 'dna', 'rna', or 'protein'.

        --trackConfig '{ JSON-format extra configuration for this track }'
            Additional top-level configuration for the client, in JSON syntax.
            Example:

              --trackConfig '{ "glyph": "ProcessedTranscript" }'

    AUTHOR
        Mitchell Skinner <mitch_skinner@berkeley.edu>

        Copyright (c) 2007-2009 The Evolutionary Software Foundation

        This package and its accompanying libraries are free software; you can
        redistribute it and/or modify it under the terms of the LGPL (either
        version 2.1, or at your option, any later version) or the Artistic License
        2.0. Refer to LICENSE for the full license text.
