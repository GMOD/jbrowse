#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use DBI;
use Getopt::Long;
use List::Util qw(min max);
use JSON 2;
use JsonGenerator;

my ($tracks, $arrowheadClass, $subfeatureClasses, $clientConfig, $db);
my $outdir = "data";
my $cssClass = "basic";
my $nclChunk = 500;
GetOptions("out=s" => \$outdir,
           "db=s" => \$db,
           "track=s@" => \$tracks,
           "cssClass=s", \$cssClass,
           "arrowheadClass=s", \$arrowheadClass,
           "subfeatureClasses=s", \$subfeatureClasses,
           "clientConfig=s", \$clientConfig,
           "nclChunk=i" => \$nclChunk);

die "please specify a database (e.g., hg19) with the --db parameter"
    unless defined($db);

my $trackDir = "$outdir/tracks";
mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};

my $dbh = DBI->connect("DBI:mysql:database=$db;host=genome-mysql.cse.ucsc.edu",
                       "genome");

#$sth = $dbh->prepare("select * from trackDb where ((type like 'bed %') or (type like 'genePred %')) and not (settings like '%compositeTrack on%')");
#my $trackDbFields = $sth->{NAME_hash};
#my $trackList = $sth->fetchall_arrayref();


# the jbrowse NCList code requires that "start" and "end" be
# the first and second fields in the array; @defaultHeaders and @srcMap
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

foreach my $shortLabel (@$tracks) {
    my $track = $dbh->selectrow_hashref(
        sprintf(
            "select * from trackDb where shortLabel = %s",
            $dbh->quote($shortLabel)
        ))
        or die "couldn't get track metadata";

    my %trackSettings = (map {split(" ", $_, 2)} split("\n", $track->{settings}));
    $defaultStyle{subfeature_classes} = JSON::from_json($subfeatureClasses)
        if defined($subfeatureClasses);
    $defaultStyle{arrowheadClass} = $arrowheadClass if defined($arrowheadClass);
    $defaultStyle{clientConfig} = JSON::from_json($clientConfig)
        if defined($clientConfig);

    my $featQuery = $dbh->prepare("select * from "
                                      . $dbh->quote_identifier($track->{tableName})
                                          . " where chrom=?");

    my @types = split(" ", $track->{type});
    my $type = $types[0];
    die "type $type not implemented" unless exists($typeMaps{$type});

    my %style = (
        %defaultStyle,
        "key" => $trackSettings{shortLabel}
    );

    foreach my $ref (@refSeqs) {
        mkdir("$trackDir/" . $ref->{name})
            unless (-d "$trackDir/" . $ref->{name});
        unless ($featQuery->execute($ref->{name})) {
            warn "query failed for table " . $track->{tableName};
            sleep 10;
            next;
        }
        my $fields = $featQuery->{NAME_hash};
        my ($converter, $headers, $subfeatures) = makeConverter($fields, $type);

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

        my @nameList;
        my $jsonGen = JsonGenerator->new($trackSettings{track},
                                         $ref->{name},
                                         \%style, $headers);
        while (my $row = $featQuery->fetchrow_arrayref()) {
            my $jsonRow = $converter->($row, $fields, $type);
            #print STDERR join(" ", @$jsonRow) . "\n";
            $jsonGen->addFeature($jsonRow);
            if ($fields->{name}) {
                $jsonGen->addName([$trackSettings{track},
                                   $row->[$fields->{name}],
                                   $ref->{name},
                                   $jsonRow->[0],
                                   $jsonRow->[1],
                                   $row->[$fields->{name}]]);
            }
        }
        if ($jsonGen->hasFeatures) {
            $jsonGen->generateTrack("$trackDir/"
                                        . $ref->{name} . "/" 
                                            . $trackSettings{track},
                                    $nclChunk, $ref->{start}, $ref->{end});
        }
    }

    JsonGenerator::modifyJSFile("$outdir/trackInfo.js", "trackInfo",
        sub {
            my $origTrackList = shift;
            my @trackList = grep { exists($_->{'label'}) } @$origTrackList;
            my $i;
            for ($i = 0; $i <= $#trackList; $i++) {
                last if ($trackList[$i]->{'label'} eq $trackSettings{track});
            }
            $trackList[$i] =
                {
                    'label' => $trackSettings{track},
                    'key' => $style{"key"},
                    'url' => "$trackDir/{refseq}/"
                        . $trackSettings{track}
                            . "/trackData.json",
                    'type' => "FeatureTrack",
                };
            return \@trackList;
        });
}

$dbh->disconnect();

sub calcSizes {
    my ($starts, $ends) = @_;
    return undef unless (defined($starts) && defined($ends));
    my @exonStarts = split (/,/, $starts);
    my @exonEnds = split (/,/, $ends);
    return join ("", map (($exonEnds[$_] - $exonStarts[$_]) . ",", 0..$#exonStarts));
}

sub abs2rel {
    my ($start, $starts) = @_;
    return join("", map {($_ - $start) . ","} split(",", $starts));
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
    #print STDERR "fields: " . join(" ", %fields) . "\n";
    my @headers;
    my $srcMap = $typeMaps{$type};
    my @indexMap;
    # map pre-defined fields
    for (my $i = 0; $i <= $#defaultHeaders; $i++) {
        last if $i > $#{$srcMap};
        my $srcName = $srcMap->[$i];
        #print STDERR "srcName: $srcName\n";
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
                                maybeIndex($src, $fields{chromStarts}),
                                maybeIndex($src, $fields{blockSizes}),
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
                makeSubfeatures(defined($strandIndex)
                                ? $dest->[$strandIndex]
                                : undef,
                                $dest->[0], $dest->[1],
                                $src->[$fields{exonCount}],
                                abs2rel($dest->[0], $src->[$fields{exonStarts}]),
                                calcSizes($src->[$fields{exonStarts}],
                                          $src->[$fields{exonEnds}]),
                                $src->[$fields{cdsStart}],
                                $src->[$fields{cdsEnd}],
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
        $block_count, $block_starts, $block_sizes,
        $thick_start, $thick_end,
        $thin_type, $thick_type) = @_;

    my @subfeatures;

    $thick_start = int($thick_start);
    $thick_end = int($thick_end);

    my $parent_strand = $strand ? ($strand eq '+' ? 1 : -1) : 0;

    if ($block_count > 0) {
        my @length_list = split(",", $block_sizes);
        my @offset_list = split(",", $block_starts);

        if (($block_count != ($#length_list + 1))
                || ($block_count != ($#offset_list + 1)) ) {
            warn "expected $block_count blocks, got " . ($#length_list + 1) . " lengths and " . ($#offset_list + 1) . " offsets for feature at $start .. $end";
        } else {
            for (my $i = 0; $i < $block_count; $i++) {
                #block start and end, in absolute (sequence rather than feature)
                #coords.  These are still in interbase.
                my $abs_block_start = int($start) + int($offset_list[$i]);
                my $abs_block_end = $abs_block_start + int($length_list[$i]);

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
