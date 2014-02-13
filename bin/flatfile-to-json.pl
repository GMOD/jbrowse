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
      ( --gff <GFF3 file> | --bed <BED file> | --gbk <GenBank file> )         \
      --trackLabel <track identifier>                                         \
      [ --trackType <JS Class> ]                                              \
      [ --out <output directory> ]                                            \
      [ --key <human-readable track name> ]                                   \
      [ --className <CSS class name for displaying features> ]                \
      [ --urltemplate "http://example.com/idlookup?id={id}" ]                 \
      [ --arrowheadClass <CSS class> ]                                        \
      [ --noSubfeatures ]                                                     \
      [ --subfeatureClasses '{ JSON-format subfeature class map }' ]          \
      [ --clientConfig '{ JSON-format style configuration for this track }' ] \
      [ --config '{ JSON-format extra configuration for this track }' ]       \
      [ --thinType <BAM -thin_type> ]                                         \
      [ --thicktype <BAM -thick_type>]                                        \
      [ --type <feature types to process> ]                                   \
      [ --nclChunk <chunk size for generated NCLs> ]                          \
      [ --compress ]                                                          \
      [ --sortMem <memory in bytes to use for sorting> ]                      \
      [ --maxLookback <maximum number of features to buffer in gff3 files> ]  \
      [ --nameAttributes "name,alias,id" ]                                    \

=head1 ARGUMENTS

=head2 Required

=over 4

=item --gff <GFF3 file>

=item --bed <BED file>

=item --gbk <GenBank file>

Process a GFF3, BED, or GenBank file containing annotation data.

This script does not support GFF version 2 or GTF (GFF 2.5) input.
GenBank input is limited to handling records for single genes.

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

=item --trackType JBrowse/View/Track/HTMLFeatures

Optional JavaScript class to use to display this track.  For backward
compatibility, this defaults to "HTMLFeatures".

Unless you have some reason to use HTMLFeatures tracks, though, it's
recommended to set this to "CanvasFeatures" to use the newer
canvas-based feature track type.

=item --className <CSS class name for displaying features>

CSS class for features.  Defaults to "feature".  Only used by HTMLFeatures tracks.

=item --urltemplate "http://example.com/idlookup?id={id}"

Template for a URL to be visited when features are clicked on.

=item --noSubfeatures

Do not format subfeature data.  Only include top-level features.

=item --arrowheadClass <CSS class>

CSS class for arrowheads.  Only used by HTMLFeatures tracks.

=item --subfeatureClasses '{ JSON-format subfeature class map }'

CSS classes for each subfeature type, in JSON syntax.  Example:

  --subfeatureClasses '{"CDS": "transcript-CDS", "exon": "transcript-exon"}'

Only used by HTMLFeatures tracks.

=item --clientConfig '{ JSON-format style configuration for this track }'

Extra configuration for the client, in JSON syntax.  Example:

  --clientConfig '{"featureCss": "background-color: #668; height: 8px;", "histScale": 2}'

For historical reasons, this is only merged into the C<style> section of the new track's configuration.

=item --config '{ JSON-format extra configuration for this track }'

Additional top-level configuration for the client, in JSON syntax.  Example:

  --config '{ "glyph": "ProcessedTranscript" }'

Unlike C<--clientConfig>, this is merged into the top level of the new track configuration.

=item --metadata '{ JSON metadata }'

Metadata about this track.  Example:

  --metadata '{"description": "Genes from XYZ pipeline.", "category": "Transcripts" }'

=item --type <feature types to process>

Only process features of the given type.  Can take either single type
names, e.g. "mRNA", or type names qualified by "source" name, for
whatever definition of "source" your data file might have.  For
example, "mRNA:exonerate" will filter for only mRNA features that have
a source of "exonerate".

Multiple type names can be specified by separating the type names with
commas, e.g. C<--type mRNA:exonerate,ncRNA>.

=item --nameAttributes "name,alias,id"

Comma-separated list of feature attributes (a.k.a. tags) that should
be treated as names for this features.  Case insensitive.  Defaults to
"name,alias,id".

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

The JSON NCList generation has to sort the features by reference
sequence, start coordinate, and end coordinate.  This is how much RAM
in bytes the sorting process is allowed to use.

=back

=head2 GFF3-specific

=over 4

=item --maxLookback <integer>

Maximum number of features to keep in memory when parsing GFF3 files.
Defaults to 10000.

If you receive "orphan features" errors when parsing a GFF3 file that
doesn't contain enough '###' directives (which are important for
parsing), you can try setting this higher if your machine has enough
memory.

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
