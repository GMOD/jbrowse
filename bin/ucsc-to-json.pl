#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

#use IO::Uncompress::Gunzip qw($GunzipError);
use PerlIO::gzip;
use Getopt::Long;
use List::Util qw(min max);
use JSON 2;
use JsonGenerator;
use NameHandler;
use ExternalSorter;

my $trackdb = "trackDb";
my ($indir, $tracks, $arrowheadClass, $subfeatureClasses, $clientConfig, $db,
    $nclChunk, $compress);
my $outdir = "data";
my $cssClass = "basic";
my $sortMem = 1024 * 1024 * 512;
GetOptions("in=s" => \$indir,
           "out=s" => \$outdir,
           "track=s@" => \$tracks,
           "cssClass=s", \$cssClass,
           "arrowheadClass=s", \$arrowheadClass,
           "subfeatureClasses=s", \$subfeatureClasses,
           "clientConfig=s", \$clientConfig,
           "nclChunk=i" => \$nclChunk,
           "compress" => \$compress,
           "sortMem=i" =>\$sortMem);

if (!defined($indir)) {
    print <<HELP;
USAGE: $0 --in <database dump dir> [--out <output directory] [--track <table name>] [--cssClass <class>] [--arrowheadClass <class>] [--subfeatureClasses <subfeature class map>] [--clientConfig <JSON client config>] [--nclChunk <NCL chunk size in bytes>] [--compress] [--sortMem <sort memory size>]

    --in: directory containing the UCSC database dump (lots of .txt.gz and .sql files)
    --out: defaults to "data"
    --track: name of the database table, e.g., "knownGene"
    --cssClass: defaults to "basic"
    --arrowheadClass: CSS class for arrowheads, e.g., "transcript-arrowhead"
    --subfeatureClasses: CSS classes for each subfeature type, in JSON syntax
        e.g. '{"CDS": "transcript-CDS", "exon": "transcript-exon"}'
    --clientConfig: extra configuration for the client, in JSON syntax
        e.g. '{"featureCss": "background-color: #668; height: 8px;", "histScale": 2}'
    --nclChunk: size of the individual NCL chunks
    --compress: compress the output (requires some web server configuration)
    --sortMem: the amount of memory in bytes to use for sorting
HELP

    exit(1);
}

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

my %refSeqs =
    map {
        $_->{name} => $_
    } @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};

# the jbrowse NCList code requires that "start" and "end" be
# the first and second fields in the array; @defaultHeaders and %typeMaps
# are used to take the fields from the database and put them
# into the order specified by @defaultHeaders

my @defaultHeaders = ("start", "end", "strand", "name", "score", "itemRgb");
my %typeMaps =
    (
        "genePred" =>
            ["txStart", "txEnd", "strand", "name", "score", "itemRgb"],
        "bed" =>
            ["chromStart", "chromEnd", "strand", "name", "score", "itemRgb"]
        );

my @subfeatHeaders = ("start", "end", "strand", "type");

my %skipFields = ("bin" => 1,
                  "chrom" => 1,
                  "cdsStart" => 1,
                  "cdsEnd" => 1,
                  "exonCount" => 1,
                  "exonStarts" => 1,
                  "exonEnds" => 1,
                  "blockCount" => 1,
                  "blockSizes" => 1,
                  "blockStarts" => 1);

my %defaultStyle = ("class" => $cssClass);

foreach my $tableName (@$tracks) {
    my %trackdbCols = name2column_map($indir . "/" . $trackdb);
    my $tableNameCol = $trackdbCols{tableName};
    my $trackRows = selectall($indir . "/" . $trackdb,
                              sub { $_[0]->[$tableNameCol] eq $tableName });
    my $track = arrayref2hash($trackRows->[0], \%trackdbCols);
    my @settingList = split("\n", $track->{settings});
    my %trackSettings = map {split(" ", $_, 2)} @settingList;
    $defaultStyle{subfeature_classes} = JSON::from_json($subfeatureClasses)
        if defined($subfeatureClasses);
    $defaultStyle{arrowheadClass} = $arrowheadClass if defined($arrowheadClass);
    $defaultStyle{clientConfig} = JSON::from_json($clientConfig)
        if defined($clientConfig);

    my @types = split(" ", $track->{type});
    my $type = $types[0];
    die "type $type not implemented" unless exists($typeMaps{$type});

    my %style = (
        %defaultStyle,
        "key" => $track->{shortLabel}
    );

    my %fields = name2column_map($indir . "/" . $track->{tableName});

    my ($converter, $headers, $subfeatures) = makeConverter(\%fields, $type);

    my $color = sprintf("#%02x%02x%02x",
                        $track->{colorR},
                        $track->{colorG},
                        $track->{colorB});

    if ($subfeatures) {
        $style{subfeatureHeaders} = \@subfeatHeaders;
        $style{class} = "generic_parent";
        $style{clientConfig}->{featureCallback} = <<ENDJS;
function(feat, fields, div) {
    if (fields.type) {
        div.className = "basic";
        switch (feat[fields.type]) {
        case "CDS":
        case "thick":
            div.style.height = "10px";
            div.style.marginTop = "-3px";
            break;
        case "UTR":
        case "thin":
            div.style.height = "6px";
            div.style.marginTop = "-1px";
            break;
        }
        div.style.backgroundColor = "$color";
    }
}
ENDJS
    } else {
        $style{clientConfig} = {
            "featureCss" => "background-color: $color; height: 8px;",
            "histCss" => "background-color: $color;"
        };
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
    for_columns("$indir/" . $track->{tableName},
                sub { 
                    $chromCounts{$_[0]->[$chromCol]} += 1;
                    $sorter->add($_[0]);
                } );
    $sorter->finish();

    my $curChrom;
    my $jsonGen;
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
            if ($jsonGen && $jsonGen->hasFeatures && $refSeqs{$curChrom}) {
                print STDERR "working on $curChrom\n";
                $nameHandler->finish();
                $jsonGen->generateTrack();
            }

            if (defined($row)) {
                $curChrom = $row->[$chromCol];
                next unless defined($refSeqs{$curChrom});
                mkdir("$trackDir/" . $curChrom)
                    unless (-d "$trackDir/" . $curChrom);
                my $trackDirForChrom = 
                    sub { "$trackDir/" . $_[0] . "/" . $tableName; };
                $nameHandler = NameHandler->new($trackDirForChrom);
                $jsonGen = JsonGenerator->new("$trackDir/$curChrom/"
                                              . $tableName,
                                              $nclChunk,
                                              $compress, $tableName,
                                              $curChrom,
                                              $refSeqs{$curChrom}->{start},
                                              $refSeqs{$curChrom}->{end},
                                              \%style, $headers,
                                              \@subfeatHeaders,
                                              $chromCounts{$curChrom});
            } else {
                last;
            }
        }
        next unless defined($refSeqs{$curChrom});
        my $jsonRow = $converter->($row, \%fields, $type);
        $jsonGen->addFeature($jsonRow);
        if (defined $nameCol) {
            $nameHandler->addName([ [$row->[$nameCol]],
                                    $tableName,
                                    $row->[$nameCol],
                                    $row->[$chromCol],
                                    $jsonRow->[0],
                                    $jsonRow->[1],
                                    $row->[$nameCol] ]);
        }
    }

    my $ext = ($compress ? "jsonz" : "json");
    JsonGenerator::writeTrackEntry("$outdir/trackInfo.js",
                                   {
                                       'label' => $tableName,
                                       'key' => $style{"key"},
                                       'url' => "$trackRel/{refseq}/"
                                           . $tableName
                                           . "/trackData.$ext",
                                           'type' => "FeatureTrack",
                                   });
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
    my $strandIndex = $destIndices->{strand};

    my $extraProcessing;
    my $subfeatures;
    if (exists($fields{thickStart})) {
        push @headers, "subfeatures";
        my $subIndex = $#headers;
        $subfeatures = 1;
        $extraProcessing = sub {
            my ($dest, $src) = @_;
            $dest->[$subIndex] =
                makeSubfeatures(maybeIndex($dest, $strandIndex),
                                $dest->[0], $dest->[1],
                                maybeIndex($src, $fields{blockCount}),
                                splitNums($src, $fields{chromStarts}),
                                splitNums($src, $fields{blockSizes}),
                                maybeIndex($src, $fields{thickStart}),
                                maybeIndex($src, $fields{thickEnd}),
                                "thin", "thick");
        }
    } elsif (exists($fields{cdsStart})) {
        push @headers, "subfeatures";
        my $subIndex = $#headers;
        $subfeatures = 1;
        $extraProcessing = sub {
            my ($dest, $src) = @_;
            $dest->[$subIndex] =
                makeSubfeatures(maybeIndex($dest, $strandIndex),
                                $dest->[0], $dest->[1],
                                maybeIndex($src, $fields{exonCount}),
                                abs2rel($dest->[0], splitNums($src, $fields{exonStarts})),
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
        # copy fields that we're keeping into the array that we're keeping
        my $result = [@{$row}[@indexMap]];
        # make sure start/end are numeric
        $result->[0] = int($result->[0]);
        $result->[1] = int($result->[1]);
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
                    push @subfeatures, [$abs_block_start,
                                        min($thick_start, $abs_block_end),
                                        $parent_strand,
                                        $thin_type];
                }

                #add a thick subfeature if this block overlaps the thick zone
                if (($abs_block_start < $thick_end)
                        && ($abs_block_end > $thick_start)) {
                    push @subfeatures, [max($thick_start, $abs_block_start),
                                        min($thick_end, $abs_block_end),
                                        $parent_strand,
                                        $thick_type];
                }

                #add a thin subfeature if this block extends
                #right of the thick zone
                if ($abs_block_end > $thick_end) {
                    push @subfeatures, [max($abs_block_start, $thick_end),
                                        $abs_block_end,
                                        $parent_strand,
                                        $thin_type];
                }
            }
        }
    } else {
        push @subfeatures, [$thick_start,
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
