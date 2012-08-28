#!/usr/bin/env perl
use strict;
use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";
use JBlibs;

use Bio::JBrowse::Cmd::FlatFileToJson;

exit Bio::JBrowse::Cmd::FlatFileToJson->new(@ARGV)->run;

__END__

=head1 NAME

flatfile-to-json.pl - format data into JBrowse JSON format from an annotation file

=head1 USAGE

  flatfile-to-json.pl                                                         \
      ( --gff <GFF3 file> | --bed <BED file> )                                \
      --trackLabel <track identifier>                                         \
      [ --out <output directory> ]                                            \
      [ --key <human-readable track name> ]                                   \
      [ --className <CSS class name for displaying features> ]                \
      [ --getType ]                                                           \
      [ --getPhase ]                                                          \
      [ --getSubfeatures ]                                                    \
      [ --getLabel ]                                                          \
      [ --urltemplate "http://example.com/idlookup?id={id}" ]                 \
      [ --arrowheadClass <CSS class> ]                                        \
      [ --subfeatureClasses '{ JSON-format subfeature class map }' ]          \
      [ --clientConfig '{ JSON-format extra configuration for this track }' ] \
      [ --thinType <BAM -thin_type> ]                                         \
      [ --thicktype <BAM -thick_type>]                                        \
      [ --type <feature types to process> ]                                   \
      [ --nclChunk <chunk size for generated NCLs> ]                          \
      [ --compress ]                                                          \
      [ --sortMem <memory in bytes to use for sorting> ]                      \

=head1 ARGUMENTS

=head2 Required

=over 4

=item --gff <GFF3 file>

=item --bed <BED file>

Process a GFF3 or BED-format file containing annotation data.

NOTE: This script does not support GFF version 2 or GTF (GFF 2.5) input.

=item --trackLabel <track identifier>

Unique identifier for this track.  Required.

=back

=head2 Optional

=over 4

=item --help | -h | -?

Display an extended help screen.

=item --key '<text>'

Human-readable track name.

=item --out <output directory>

Output directory to write to.  Defaults to "data/".

=item --className <CSS class name for displaying features>

CSS class for features.  Defaults to "feature".

=item --getType

Include the type of the features in the JSON.

=item --getPhase

Include the phase of the features in the JSON.

=item --getSubfeatures

Include subfeatures in the JSON.

=item --getLabel

Include a label for the features in the JSON.

=item --urltemplate "http://example.com/idlookup?id={id}"

Template for a URL to be visited when features are clicked on.

=item --arrowheadClass <CSS class>

CSS class for arrowheads.

=item --subfeatureClasses '{ JSON-format subfeature class map }'

CSS classes for each subfeature type, in JSON syntax.  Example:

  --subfeatureClasses '{"CDS": "transcript-CDS", "exon": "transcript-exon"}'

=item --clientConfig '{ JSON-format extra configuration for this track }'

Extra configuration for the client, in JSON syntax.  Example:

  --clientConfig '{"featureCss": "background-color: #668; height: 8px;", "histScale": 2}'

=item --type <feature types to process>

Only process features of the given type.  Can take either single type
names, e.g. "mRNA", or type names qualified by "source" name, for
whatever definition of "source" your data file might have.  For
example, "mRNA:exonerate" will filter for only mRNA features that have
a source of "exonerate".

Multiple type names can be specified by separating the type names with
commas, e.g. C<--type mRNA:exonerate,ncRNA>.

=item --nclChunk <chunk size for generated NCLs>

NCList chunk size; if you get "json text or perl structure exceeds
maximum nesting level" errors, try setting this lower (default:
50,000).

=item --compress

Compress the output, making .jsonz (gzipped) JSON files.  This can
save a lot of disk space, but note that web servers require some
additional configuration to serve these correctly.

=item --sortMem <bytes>

Bytes of RAM to use for sorting features.  Default 512MB.

=back

=head2 BED-specific

=over 4

=item --thinType <type>

=item --thickType <type>

Correspond to C<<-thin_type>> and C<<-thick_type>> in
L<Bio::FeatureIO::bed>.  Do C<<perldoc Bio::FeatureIO::bed>> for
details.

=back

=head1 MEMORY USAGE

For efficient memory usage, it is very important that large GFF3 files
have C<###> lines in them periodically.  For details of what C<###> is
and how it is used, see the GFF3 specification at
L<http://www.sequenceontology.org/gff3.shtml>.

=cut
