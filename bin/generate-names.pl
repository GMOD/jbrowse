#!/usr/bin/env perl
use strict;
use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";
use JBlibs;

require Bio::JBrowse::Cmd::IndexNames;
exit Bio::JBrowse::Cmd::IndexNames->new(@ARGV)->run;

__END__

=head1 NAME

generate-names.pl - build a global index of feature names.  By
default, rebuilds the entire index from scratch at each run.

=head1 USAGE

  generate-names.pl                        \
      [ --out <output directory> ]         \
      [ --verbose ]

=head1 OPTIONS

=over 4

=item --out <directory>

Data directory to process.  Default 'data/'.

=item --tracks <trackname>[,...]

Comma-separated list of which tracks to include in the names index.  If
not passed, all tracks are indexed.

=item --compress

If passed, gzip the JSON files in the index, naming them *.jsonz
instead of *.json.  Like the --compress option for flatfile-to-json.pl
and prepare-refseqs.pl, if you use this option you must configure your
web server to serve these files with the correct Content-Encoding HTTP
header.  See the JBrowse Configuration Guide on the GMOD wiki for help
with this.

=item --incremental | -i

Do not completely rebuild the names index in the given location, only
insert new names into it.

=item --locationLimit <number>

Maximum number of distinct locations to store for a single name.  Default 100.

=item --mem <bytes>

Number of bytes of RAM we are allowed to use for caching memory.
Default 256000000 (256 MiB).  If your machine has enough RAM,
increasing this can speed up this script's running time significantly.

=item --workdir <dir>

Use the given location for building the names index, copying the index
over to the destination location when fully built.  By default, builds
the index in the output location.

Name indexing is a very I/O intensive operation, because the
filesystem is used to store intermediate results in order to keep the
RAM usage reasonable.  If a fast filesystem (e.g. tmpfs) is available
and large enough, indexing can be speeded up by using it to store the
intermediate results of name indexing.

=item --completionLimit <number>

Maximum number of name completions to store for a given prefix.
Default 20.  Set to 0 to disable auto-completion of feature names.
Note that the name index always contains exact matches for feature
names; this setting only disables autocompletion based on incomplete
names.

=item --verbose

Print more progress messages.

=item --help | -h | -?

Print a usage message.

=back

=cut
