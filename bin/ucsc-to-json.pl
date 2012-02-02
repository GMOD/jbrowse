#!/usr/bin/env perl

=head1 NAME

ucsc-to-json.pl - format JBrowse JSON from a UCSC database dump

=head1 USAGE

  ucsc-to-json.pl                                    \
      --in <database dump dir>                       \
      [ --out <output directory> ]                   \
      [ --track <table name> ]                       \
      [ --cssClass <class> ]                         \
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

=item --nclChunk <size in bp>

Size of the individual Nested Containment List chunks. Default 50,000
bp.

=item --compress

If passed, compress the output with gzip, making .jsonz files.  This
can save a lot of disk space on the server, but serving these files to
JBrowse requires some web server configuration.

=item --sortMem <bytes>

The amount of RAM in bytes to use for sorting.

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
use Pod::Usage;

use lib "$Bin/../lib";

use PerlIO::gzip;
use Getopt::Long;
use List::Util qw(min max);
use JSON 2;
use GenomeDB;
use NameHandler;
use ExternalSorter;

my $trackdb = "trackDb";
my ($indir, $tracks, $arrowheadClass, $subfeatureClasses, $clientConfig, $db,
    $nclChunk, $compress);
my $outdir = "data";
my $cssClass = "basic";
my $sortMem = 1024 * 1024 * 512;
my $help;
GetOptions(
    "in=s"                => \$indir,
    "out=s"               => \$outdir,
    "track=s@"            => \$tracks,
    "cssClass=s"          => \$cssClass,
    "arrowheadClass=s"    => \$arrowheadClass,
    "subfeatureClasses=s" => \$subfeatureClasses,
    "clientConfig=s"      => \$clientConfig,
    "nclChunk=i"          => \$nclChunk,
    "compress"            => \$compress,
    "sortMem=i"           => \$sortMem,
    "help|?|h"            => \$help,
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

my $trackRel = "tracks";
my $trackDir = "$outdir/$trackRel";
mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

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
    my $trackMeta = arrayref2hash($trackRows->[0], \%trackdbCols);
    my @settingList = split("\n", $trackMeta->{settings});
    my %trackSettings = map {split(" ", $_, 2)} @settingList;

    my @types = split(" ", $trackMeta->{type});
    my $type = $types[0];
    die "type $type not implemented" unless exists($typeMaps{$type});

    my %fields = name2column_map($indir . "/" . $trackMeta->{tableName});

    my ($converter, $headers, $subfeatures) = makeConverter(\%fields, $type);

    my $color = sprintf("#%02x%02x%02x",
                        $trackMeta->{colorR},
                        $trackMeta->{colorG},
                        $trackMeta->{colorB});

    my $trackConfig =
      {
       compress => $compress,
       style => {
                 "className" => $cssClass,
                 "featureCss" => "background-color: $color; height: 8px;",
                 "histCss" => "background-color: $color;"
                }
      };

    $trackConfig->{style}->{subfeatureClasses} =
       JSON::from_json($subfeatureClasses)
       if defined($subfeatureClasses);
    $trackConfig->{style}->{arrowheadClass} = $arrowheadClass
      if defined($arrowheadClass);
    $trackConfig->{style} = {
                             %{$trackConfig->{style}},
                             # TODO: break out legacy combined config
                             JSON::from_json($clientConfig)
                            }
        if defined($clientConfig);

    if ($subfeatures) {
        $trackConfig->{style}->{className} = "generic_parent";
        $trackConfig->{style}->{histCss} = "background-color: $color;";
        $trackConfig->{hooks}->{modify} = <<ENDJS;
function(track, feat, attrs, elem) {
    var fType = attrs.get(feat, "Type");
    if (fType) {
        elem.className = "basic";
        switch (fType]) {
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
    my $nameCol = $fields{name};
    my $compare = sub ($$) {
        $_[0]->[$chromCol] cmp $_[1]->[$chromCol]
            ||
        $_[0]->[$startCol] <=> $_[1]->[$startCol]
            ||
        $_[1]->[$endCol] <=> $_[0]->[$endCol]
    };

    my %chromCounts;
    my $sorter = ExternalSorter->new($compare, $sortMem);
    for_columns("$indir/" . $trackMeta->{tableName},
                sub { 
                    $chromCounts{$_[0]->[$chromCol]} += 1;
                    $sorter->add($_[0]);
                } );
    $sorter->finish();

    my $curChrom;
    my $gdb = GenomeDB->new($outdir);
    my $track = $gdb->getTrack($tableName);
    unless (defined($track)) {
        $track = $gdb->createFeatureTrack($tableName,
                                          $trackConfig,
                                          $track->{shortLabel});
    }
    my $istore;
    my $nameHandler;
    while (1) {
        my $row = $sorter->get();

        # Features come out of the sorter in order (by $compare), so
        # to have one JsonGenerator for each refseq, we need to create
        # a new JsonGenerator at the beginning (!defined($curChrom)) and at
        # every refseq transition ($curChrom ne $row->[$chromCol]) thereafter.
        # We also need to finish the last refseq at the end (!defined($row)).
        if ((!defined($row))
                || (!defined($curChrom))
                    || ($curChrom ne $row->[$chromCol])) {
            if ($istore && $istore->hasIntervals) {
                print STDERR "working on $curChrom\n";
                $nameHandler->finish();
                $track->finishLoad($istore);
            }

            if (defined($row)) {
                $curChrom = $row->[$chromCol];
                # next unless defined($refSeqs{$curChrom});
                # mkdir("$trackDir/" . $curChrom)
                #     unless (-d "$trackDir/" . $curChrom);
                my $trackDirForChrom = 
                    sub { "$trackDir/" . $tableName . "/" . $_[0]; };
                $nameHandler = NameHandler->new($trackDirForChrom);
                $istore = $track->startLoad($curChrom, $nclChunk,
                                            [{
					      attributes => $headers,
					      isArrayAttr => {Subfeatures => 1}
					     },
					     {
					      attributes => \@subfeatHeaders,
					      isArrayAttr => {}
					     } ] );
                # $jsonGen = JsonGenerator->new("$trackDir/$curChrom/"
                #                               . $tableName,
                #                               $nclChunk,
                #                               $compress, $tableName,
                #                               $curChrom,
                #                               $refSeqs{$curChrom}->{start},
                #                               $refSeqs{$curChrom}->{end},
                #                               \%style, $headers,
                #                               \@subfeatHeaders,
                #                               $chromCounts{$curChrom});
            } else {
                last;
            }
        }
        # next unless defined($refSeqs{$curChrom});
        my $jsonRow = $converter->($row, \%fields, $type);
        $istore->addSorted($jsonRow);
        if (defined $nameCol) {
            $nameHandler->addName([ [$row->[$nameCol]],
                                    $tableName,
                                    $row->[$nameCol],
                                    $row->[$chromCol],
                                    $jsonRow->[1],
                                    $jsonRow->[2],
                                    $row->[$nameCol] ]);
        }
    }

    # my $ext = ($compress ? "jsonz" : "json");
    $gdb->writeTrackEntry($track);
        # "$outdir/trackInfo.json",
        #                            {
        #                                'label' => $tableName,
        #                                'key' => $style{"key"},
        #                                'url' => "$trackRel/{refseq}/"
        #                                    . $tableName
        #                                    . "/trackData.$ext",
        #                                    'type' => "FeatureTrack",
        #                            });
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
    my ($orig_fields, $type) = @_;
    my %fields = (%$orig_fields);
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
    foreach my $f (keys %fields) {
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

    my $parent_strand = $strand ? ($strand eq '+' ? 1 : -1) : 0;

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
    foreach my $key (keys %$fields) {
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
    open SQL, "<$sqlfile" or die "$sqlfile: $!";
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
