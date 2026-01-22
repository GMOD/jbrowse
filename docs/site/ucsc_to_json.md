---
id: ucsc-to-json.pl
title: ucsc-to-json.pl
---

### ucsc-to-json.pl

This script uses data from a local dump of the UCSC genome annotation MySQL
database. To reach this data, go to
[hgdownload.cse.ucsc.edu](http://hgdownload.cse.ucsc.edu/downloads.html) and
click the link for the genome of interest. Next, click the "Annotation Database"
link. The data relevant to ucsc-to-json.pl (\*.sql and \*.txt.gz files) can be
downloaded from either this page or the FTP server described on this page.

Together, a \*.sql and \*.txt.gz pair of files (such as cytoBandIdeo.txt.gz and
cytoBandIdeo.sql) constitute a database table. Ucsc-to-json.pl uses the \*.sql
file to get the column labels, and it uses the \*.txt.gz file to get the data
for each row of the table. For the example pair of files above, the name of the
database table is "cytoBandIdeo". This will become the name of the JBrowse track
that is produced from the data in the table.

In addition to all of the feature-containing tables that you want to use as
JBrowse tracks, you will also need to download the trackDb.sql and
trackDb.txt.gz files for the organism of interest.

Basic usage:

`bin/ucsc-to-json.pl --in <directory with files from UCSC> --track <database table name> [options]`

Hint: If you're using this approach, it might be convenient to also download the
sequence(s) from UCSC. These are usually available from the "Data set by
chromosome" link for the particular genome or from the FTP server.

For a full list of the options supported by ucsc-to-json.pl, run it with the
--help option, like:

`bin/ucsc-to-json.pl --help`
