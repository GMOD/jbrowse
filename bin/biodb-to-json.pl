#!/usr/bin/env perl
use strict;
use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";
use JBlibs;

use Bio::JBrowse::Cmd::BioDBToJson;

exit Bio::JBrowse::Cmd::BioDBToJson->new(@ARGV)->run;

__END__

=head1 NAME

biodb-to-json.pl - format JBrowse JSON as described in a configuration file

=head1 DESCRIPTION

Reads a configuration file, in a format currently documented in
docs/config.html, and formats JBrowse JSON from the data sources
defined in it.

=head1 USAGE

  bin/biodb-to-json.pl                               \
    --conf <conf file>                               \
    [--ref <ref seq names> | --refid <ref seq ids>]  \
    [--track <track name>]                           \
    [--out <output directory>]                       \
    [--compress]


  # format the example volvox track data
  bin/biodb-to-json.pl --conf docs/tutorial/conf_files/volvox.json

=head2 OPTIONS

=over 4

=item --help | -? | -h

Display an extended help screen.

=item --quiet | -q

Quiet.  Don't print progress messages.

=item --conf <conf file>

Required. Path to the configuration file to read.  File must be in JSON format.

=item --ref <ref seq name> | --refid <ref seq id>

Optional.  Single reference sequence name or id for which to process data.

By default, processes all data.

=item --out <output directory>

Directory where output should go.  Default: data/

=item --compress

If passed, compress the output with gzip (requires some web server configuration to serve properly).

=back

=cut
