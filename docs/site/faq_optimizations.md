---
id: faq_optimizations
title: Optimizations
---

## Can I speed up JBrowse load time with VCF and BAM files

If the BAM and VCF files you have are large, the BAM index or TABIX
index files can become large as well. Since the indexes must be fully
downloaded before any of the data can be displayed, you can break your
files up by chromosomes, and use {refseq} in a urlTemplate to break it
up into manageable chunks.

E.g.

`"urlTemplate": "myfile_{refseq}.bam"`

That would search for myfile\_chr1.bam and myfile\_chr1.bam.bai when you
open that track while browsing chr1

## Can I speed up generate-names.pl?

Try using --completionLimit 0 with the command. It will disable
autocompletion but still allow you to search exact matches.

Note that you can use generate-names with --completionLimit 20 on some
tracks and then generate-names with both --incremental and
--completionLimit 0 flags on very information dense tracks.


