#!/usr/bin/env perl

=head1 NAME

ucsc-to-json.pl - format JBrowse JSON from a UCSC database dump

=head1 USAGE

  ucsc-to-json.pl                                    \
      --in <database dump dir>                       \
      [ --out <output directory> ]                   \
      [ --track <table name> ]                       \
      [ --cssClass <class> ]                         \
      [ --primaryName <name column> ]                \
      [ --arrowheadClass <class> ]                   \
      [ --subfeatureClasses <subfeature class map> ] \
      [ --clientConfig <JSON client config> ]        \
      [ --nclChunk <NCL chunk size in bytes> ]       \
      [ --compress ]                                 \
      [ --sortMem <sort memory size> ]

=head1 OPTIONS

=over 4

=item --in <dir>

directory containing the UCSC database dump (lots of .txt.gz and .sql files)

=item --out <dir>

output directory for JSON, defaults to "data/"

=item --track 'trackName'

name of the database table, e.g., "knownGene"

=item --primaryName 'name2'

name of the UCSC data column (e.g. "name2" in the case of the UCSC
"refGene" track) to use as the primary name of features in the JBrowse
display.  If this is set, the primaryName field will be swapped with
the name field in the output.  For example, C<--primaryName 'name2'>
will cause the output's C<name> to be the UCSC C<name2>, and C<name2>
will be the UCSC C<name>.

=item --cssClass 'classname'

CSS class to use for features in this track, defaults to "basic"

=item --arrowheadClass 'classname'

CSS class for arrowheads, e.g., "transcript-arrowhead"

=item --subfeatureClasses '{ JSON }'

CSS classes for each subfeature type, in JSON syntax, e.g.

  '{"CDS": "transcript-CDS", "exon": "transcript-exon"}'

=item --clientConfig '{ JSON }'

extra configuration for the client, in JSON syntax, e.g.

  '{"featureCss": "background-color: #668; height: 8px;", "histScale": 2}'

For historical reasons, this is only merged into the C<style> section of the new track's configuration.

=item --nclChunk <size in bp>

Size of the individual Nested Containment List chunks. Default 50,000
bp.

=item --compress

If passed, compress the output with gzip, making .jsonz files.  This
can save a lot of disk space on the server, but serving these files to
JBrowse requires some web server configuration.

=item --sortMem <bytes>

The amount of RAM in bytes to use for sorting.

=item --help | -h | -?

Display a help screen.

=item --quiet | -q

Do not print progress messages.

=back

=head1 EXAMPLE

  # format the 'knownGene' track from an hg19 dump from UCSC
  ucsc-to-json.pl --in path/to/hg19/database/ --track 'knownGene'             \
      --cssclass transcript                                                   \
      --subfeatureClasses '{"CDS":"transcript-CDS", "UTR": "transcript-UTR"}' \
      --arrowheadClass transcript-arrowhead

=cut

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../src/perl5";
use JBlibs;

use Pod::Usage;
use Getopt::Long;
use List::Util qw(min max);
use List::MoreUtils 'distinct';

use PerlIO::gzip;
use Bio::JBrowse::JSON;
use GenomeDB;
use NameHandler;
use Bio::JBrowse::ExternalSorter;

my $trackdb = "trackDb";
my ($indir, $tracks, $arrowheadClass, $subfeatureClasses, $clientConfig, $db,
    $nclChunk, $compress);
my $outdir = "data";
my $cssClass = "basic";
my $primaryNameColumn = 'name';
my $sortMem = 1024 * 1024 * 512;
my $help;
my $quiet;
GetOptions(
    "in=s"                => \$indir,
    "out=s"               => \$outdir,
    "track=s@"            => \$tracks,
    "cssClass=s"          => \$cssClass,
    "arrowheadClass=s"    => \$arrowheadClass,
    "subfeatureClasses=s" => \$subfeatureClasses,
    "clientConfig=s"      => \$clientConfig,
    "nclChunk=i"          => \$nclChunk,
    "primaryName=s"       => \$primaryNameColumn,
    "compress"            => \$compress,
    "sortMem=i"           => \$sortMem,
    "help|?|h"            => \$help,
    "q|quiet"             => \$quiet,
) or pod2usage();

pod2usage( -verbose => 2 ) if $help;
pod2usage() unless defined $indir;

if (!defined($nclChunk)) {
    # default chunk size is 50KiB
    $nclChunk = 50000;
    # $nclChunk is the uncompressed size, so we can make it bigger if
    # we're compressing
    $nclChunk *= 4 if $compress;
}

# the jbrowse NCList code requires that "start" and "end" be
# the first and second fields in the array; @defaultHeaders and %typeMaps
# are used to take the fields from the database and put them
# into the order specified by @defaultHeaders

my @defaultHeaders = ("Start", "End", "Strand", "Name", "Score", "itemRgb");
my %typeMaps =
    (
        "genePred" =>
            ["txStart", "txEnd", "strand", "name", "score", "itemRgb"],
        "bed" =>
            ["chromStart", "chromEnd", "strand", "name", "score", "itemRgb"]
        );

my @subfeatHeaders = ("Start", "End", "Strand", "Type");

my %skipFields = ("bin" => 1,
                  "chrom" => 1,
                  "cdsStart" => 1,
                  "cdsEnd" => 1,
                  "exonCount" => 1,
                  "exonStarts" => 1,
                  "exonEnds" => 1,
                  "blockCount" => 1,
                  "blockSizes" => 1,
                  "blockStarts" => 1,
                  "thickStart" => 1,
                  "chromStarts" => 1,
                  "thickEnd" => 1);

foreach my $tableName (@$tracks) {
    my %trackdbCols = name2column_map($indir . "/" . $trackdb);
    my $tableNameCol = $trackdbCols{tableName};
    my $trackRows = selectall($indir . "/" . $trackdb,
                              sub { $_[0]->[$tableNameCol] eq $tableName });
    if( ! $trackRows->[0] ) {
        die "Track $tableName not found in the UCSC track database ($trackdb.txt.gz) file.  Is it a real UCSC track?";
    }
    my $trackMeta = arrayref2hash($trackRows->[0], \%trackdbCols);
    my @settingList = split("\n", $trackMeta->{settings});
    my %trackSettings = map {split(" ", $_, 2)} @settingList;

    my @types = split(" ", $trackMeta->{type});
    my $type = $types[0];
    $typeMaps{$type}
        or die "Cannot convert $tableName track; this script is not capable of handling $type tracks.\n";

    # check that we have the data files for that track
    unless( -f "$indir/$tableName.sql" && -f "$indir/$tableName.txt.gz" ) {
        die "To format the $tableName track, you must have both files $indir/$tableName.sql and $indir/$tableName.txt.gz\n";
    }

    my %fields = name2column_map($indir . "/" . $trackMeta->{tableName});
    my ($converter, $headers, $subfeatures) = makeConverter(\%fields, $type, $primaryNameColumn);

    my $color = sprintf("#%02x%02x%02x",
                        $trackMeta->{colorR},
                        $trackMeta->{colorG},
                        $trackMeta->{colorB});

    my $trackConfig =
      {
       compress => $compress,
       style => {
                 "className" => $cssClass,
                 "featureCss" => "background-color: $color; height: 6px;",
                 "histCss" => "background-color: $color;"
                }
      };

    my $json = Bio::JBrowse::JSON->new;
    $trackConfig->{style}->{subfeatureClasses} =
       $json->decode( $subfeatureClasses )
       if defined($subfeatureClasses);
    $trackConfig->{style}->{arrowheadClass} = $arrowheadClass
      if defined($arrowheadClass);
    $trackConfig->{style} = {
                             %{$trackConfig->{style}},
                             # TODO: break out legacy combined config
                             $json->decode($clientConfig)
                            }
        if defined($clientConfig);

    if ($subfeatures) {
        $trackConfig->{style}->{className} = "generic_parent";
        $trackConfig->{style}->{histCss} = "background-color: $color;";
        $trackConfig->{hooks}->{modify} = <<ENDJS;
function(track, feat, elem) {
    var fType = feat.get("Type");
    if (fType) {
        elem.className = "basic";
        switch (fType) {
        case "CDS":
        case "thick":
            elem.style.height = "10px";
            elem.style.marginTop = "-3px";
            break;
        case "UTR":
        case "thin":
            elem.style.height = "6px";
            elem.style.marginTop = "-1px";
            break;
        }
        elem.style.backgroundColor = "$color";
    }
}
ENDJS
    }

    my $chromCol = $fields{chrom};
    my $startCol = $fields{txStart} || $fields{chromStart};
    my $endCol = $fields{txEnd} || $fields{chromEnd};
    my @nameCols = grep defined, distinct( $fields{ $primaryNameColumn }, @fields{grep /^(name|id|alias)\d*$/i, sort keys %fields} );
    my $compare = sub ($$) {
        $_[0]->[$chromCol] cmp $_[1]->[$chromCol]
            ||
        $_[0]->[$startCol] <=> $_[1]->[$startCol]
            ||
        $_[1]->[$endCol] <=> $_[0]->[$endCol]
    };

    my %chromCounts;
    my $sorter = Bio::JBrowse::ExternalSorter->new($compare, $sortMem);
    for_columns("$indir/" . $trackMeta->{tableName},
                sub { 
                    $chromCounts{$_[0]->[$chromCol]} += 1;
                    $sorter->add($_[0]);
                } );
    $sorter->finish();

    my $curChrom;
    my $gdb = GenomeDB->new($outdir);
    my $track = $gdb->getTrack($tableName, $trackConfig, $trackConfig->{shortLabel} );
    unless (defined($track)) {
        $track = $gdb->createFeatureTrack($tableName,
                                          $trackConfig,
                                          $trackConfig->{shortLabel});
    }
    my $nameHandler;
    while (1) {
        my $row = $sorter->get();

        # Features come out of the sorter in order (by $compare), so
        # to have one JsonGenerator for each refseq, we need to create
        # a new JsonGenerator at the beginning (!defined($curChrom)) and at
        # every refseq transition ($curChrom ne $row->[$chromCol]) thereafter.
        # We also need to finish the last refseq at the end (!defined($row)).
        if ( !defined $row
             || !defined $curChrom
             || $curChrom ne $row->[$chromCol]
           ) {
            if ( $track->hasFeatures ) {
                print STDERR "working on $curChrom\n" unless $quiet;
                $track->finishLoad;
            }

            if( defined $row ) {
                $curChrom = $row->[$chromCol];
                $track->startLoad($curChrom, $nclChunk,
                                  [
                                   {
                                      attributes => $headers,
                                      isArrayAttr => {Subfeatures => 1}
                                   },
                                   {
                                       attributes => \@subfeatHeaders,
                                       isArrayAttr => {}
                                   },
                                  ],
                                 );
            } else {
                last;
            }
        }
        my $jsonRow = $converter->($row, \%fields, $type);
        $track->addSorted($jsonRow);
        if ( @nameCols ) {
            $track->nameHandler->addName(
                [ [ @{$row}[@nameCols] ], # all the names
                  $tableName,             # track name
                  $row->[$nameCols[0]],   # the primary feature name
                  $row->[$chromCol],      # location refseq
                  $jsonRow->[1],          # location start
                  $jsonRow->[2]           # location end
                ]
            );
        }
    }

    $gdb->writeTrackEntry($track);
}

sub calcSizes {
    my ($starts, $ends) = @_;
    return undef unless (defined($starts) && defined($ends));
    return [map($ends->[$_] - $starts->[$_], 0..$#$starts)];
}

sub abs2rel {
    my ($start, $starts) = @_;
    return [map($_ - $start, @$starts)];
}

sub indexHash {
    my @list = @_;
    my %result;
    for (my $i = 0; $i <= $#list; $i++) {
        $result{$list[$i]} = $i;
    }
    return \%result;
}

sub maybeIndex {
    my ($ary, $index) = @_;
    return (defined $index) ? $ary->[$index] : undef;
}

sub splitNums {
    my ($ary, $index) = @_;
    return [] unless defined $index;
    return [map(int, split(",", $ary->[$index]))];
}

sub makeConverter {
    # $orig_fields should be a reference to a hash where
    # the keys are names of columns in the source, and the values
    # are the positions of those columns

    # returns a sub that converts a row from the source
    # into an array ready for adding to a JsonGenerator,
    # and a reference to an array of header strings that
    # describe the arrays returned by the sub
    my ($orig_fields, $type, $primaryNameColumn) = @_;
    my %fields = (%$orig_fields);

    if( $fields{name} && $fields{ $primaryNameColumn } && $fields{$primaryNameColumn} != $fields{name} ) {
        ( $fields{name}, $fields{$primaryNameColumn} ) = ( $fields{$primaryNameColumn}, $fields{name} );
    }

    my @headers;
    my $srcMap = $typeMaps{$type};
    my @indexMap;
    # map pre-defined fields
    for (my $i = 0; $i <= $#defaultHeaders; $i++) {
        last if $i > $#{$srcMap};
        my $srcName = $srcMap->[$i];
        if (exists($fields{$srcName})) {
            push @headers, $defaultHeaders[$i];
            push @indexMap, $fields{$srcName};
            delete $fields{$srcName};
        }
    }
    # map remaining fields
    foreach my $f (sort keys %fields) {
        next if $skipFields{$f};
        push @headers, $f;
        push @indexMap, $fields{$f};
    }

    my $destIndices = indexHash(@headers);
    my $strandIndex =
      defined($destIndices->{Strand}) ? $destIndices->{Strand} + 1 : undef;
    my $startIndex = $destIndices->{Start} + 1;
    my $endIndex = $destIndices->{End} + 1;

    my $extraProcessing;
    my $subfeatures;
    if (exists($fields{thickStart})) {
        push @headers, "Subfeatures";
        my $subIndex = $#headers + 1;
        $subfeatures = 1;
        $extraProcessing = sub {
            my ($dest, $src) = @_;
            $dest->[$subIndex] =
                makeSubfeatures(maybeIndex($dest, $strandIndex),
                                $dest->[$startIndex], $dest->[$endIndex],
                                maybeIndex($src, $fields{blockCount}),
                                splitNums($src, $fields{chromStarts}),
                                splitNums($src, $fields{blockSizes}),
                                maybeIndex($src, $fields{thickStart}),
                                maybeIndex($src, $fields{thickEnd}),
                                "thin", "thick");
        }
    } elsif (exists($fields{cdsStart})) {
        push @headers, "Subfeatures";
        my $subIndex = $#headers + 1;
        $subfeatures = 1;
        $extraProcessing = sub {
            my ($dest, $src) = @_;
            $dest->[$subIndex] =
                makeSubfeatures(maybeIndex($dest, $strandIndex),
                                $dest->[$startIndex], $dest->[$endIndex],
                                maybeIndex($src, $fields{exonCount}),
                                abs2rel($dest->[$startIndex], splitNums($src, $fields{exonStarts})),
                                calcSizes(splitNums($src, $fields{exonStarts}),
                                          splitNums($src, $fields{exonEnds})),
                                maybeIndex($src, $fields{cdsStart}),
                                maybeIndex($src, $fields{cdsEnd}),
                                "UTR", "CDS");
        }
    } else {
        $subfeatures = 0;
        $extraProcessing = sub {};
    }

    my $converter = sub {
        my ($row) = @_;
        # Copy fields that we're keeping into the array that we're keeping.
        # The 0 is because the top-level features use the 0th class in the
        # "classes" array.
        my $result = [(0, @{$row}[@indexMap])];
        # make sure start/end are numeric
        $result->[$startIndex] = int($result->[$startIndex]);
        $result->[$endIndex] = int($result->[$endIndex]);
        if (defined $strandIndex) {
            $result->[$strandIndex] =
                defined($result->[$strandIndex]) ?
                    ($result->[$strandIndex] eq '+' ? 1 : -1) : 0;
        }
        $extraProcessing->($result, $row);
        return $result;
    };

    return $converter, \@headers, $subfeatures;
}

sub makeSubfeatures {
    my ($strand, $start, $end,
        $block_count, $offset_list, $length_list,
        $thick_start, $thick_end,
        $thin_type, $thick_type) = @_;

    my @subfeatures;

    $thick_start = int($thick_start);
    $thick_end = int($thick_end);

    my $parent_strand = $strand;

    if (defined($block_count) && ($block_count > 0)) {
        if (($block_count != ($#$length_list + 1))
                || ($block_count != ($#$offset_list + 1)) ) {
            warn "expected $block_count blocks, got " . ($#$length_list + 1) . " lengths and " . ($#$offset_list + 1) . " offsets for feature at $start .. $end";
        } else {
            for (my $i = 0; $i < $block_count; $i++) {
                #block start and end, in absolute (sequence rather than feature)
                #coords.  These are still in interbase.
                my $abs_block_start = int($start) + int($offset_list->[$i]);
                my $abs_block_end = $abs_block_start + int($length_list->[$i]);

                #add a thin subfeature if this block extends
                # left of the thick zone
                if ($abs_block_start < $thick_start) {
                    # the 1 is because the subfeatures will use the 1st
                    # index in the "classes" array
                    push @subfeatures, [1,
                                        $abs_block_start,
                                        min($thick_start, $abs_block_end),
                                        $parent_strand,
                                        $thin_type];
                }

                #add a thick subfeature if this block overlaps the thick zone
                if (($abs_block_start < $thick_end)
                        && ($abs_block_end > $thick_start)) {
                    # the 1 is because the subfeatures will use the 1st
                    # index in the "classes" array
                    push @subfeatures, [1,
                                        max($thick_start, $abs_block_start),
                                        min($thick_end, $abs_block_end),
                                        $parent_strand,
                                        $thick_type];
                }

                #add a thin subfeature if this block extends
                #right of the thick zone
                if ($abs_block_end > $thick_end) {
                    # the 1 is because the subfeatures will use the 1st
                    # index in the "classes" array
                    push @subfeatures, [1,
                                        max($abs_block_start, $thick_end),
                                        $abs_block_end,
                                        $parent_strand,
                                        $thin_type];
                }
            }
        }
    } else {
        # the 1 is because the subfeatures will use the 1st
        # index in the "classes" array
        push @subfeatures, [1,
                            $thick_start,
                            $thick_end,
                            $parent_strand,
                            $thick_type];
    }
    return \@subfeatures;
}

# processes a table to find all the rows for which $filter returns true.
# returns a list of arrayrefs, where each arrayref represents a row.
sub selectall {
    my ($table, $filter) = @_;
    my @result;
    for_columns($table, sub { push @result, $_[0] if ($filter->($_[0])) });
    return \@result;
}

# converts an array ref of values and a hash ref with field name->index mappings
# into a hash of name->value mappings
sub arrayref2hash {
    my ($aref, $fields) = @_;
    my %result;
    foreach my $key (sort keys %$fields) {
        $result{$key} = $aref->[$fields->{$key}];
    }
    return \%result;
}

# subroutine to crudely parse a .sql table description file and return a map from column names to column indices
sub name2column_map {
    my ($table) = @_;
    my $sqlfile = "$table.sql";

    my @cols;
    local *SQL;
    local $_;
    open SQL, "<$sqlfile" or die "$! reading $sqlfile";
    while (<SQL>) { last if /CREATE TABLE/ }
    while (<SQL>) {
	last if /^\)/;
	if (/^\s*\`(\S+)\`/) { push @cols, $1 }
    }
    close SQL;

    return map (($cols[$_] => $_), 0..$#cols);
}

# subroutine to crudely parse a .txt.gz table dump, and, for each row,
# apply a given subroutine to a array ref that holds the values for the
# columns of that row
sub for_columns {
    my ($table, $func) = @_;

    # my $gzip = new IO::Uncompress::Gunzip "$table.txt.gz"
    #     or die "gunzip failed: $GunzipError\n";
    my $gzip;
    open $gzip, "<:gzip", "$table.txt.gz"
        or die "failed to open $table.txt.gz: $!\n";

    my $lines = 0;
    my $row = "";
    while (<$gzip>) {
	chomp;
	if (/\\$/) {
            # unescape newline
	    chop;
	    $row .= "$_\n";
	} else {
	    $row .= $_;
            
	    my @data = split /(?<!\\)\t/, $row; # split on unescaped tabs
            map { s/\\\t/\t/g } @data; # unescape escaped tabs
	    &$func (\@data);
	    $row = "";
	}
	if (++$lines % 100000 == 0) { warn "(processed $lines lines)\n" }
    }
    $gzip->close()
        or die "couldn't close $table.txt.gz: $!\n";
}
