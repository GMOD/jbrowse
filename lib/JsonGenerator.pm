package JsonGenerator;

use base 'Exporter';
our @EXPORT_OK = qw/ readJSON writeJSON modifyJSFile /;

use strict;
use warnings;

use NCList;
use LazyNCList;
use JSON 2;
use IO::File;
use Fcntl ":flock";
use POSIX qw(ceil floor);
use List::Util qw(min max sum reduce);
use PerlIO::gzip;
use constant MAX_JSON_DEPTH => 2048;

#this series of numbers is used in JBrowse for zoom level relationships
my @multiples = (1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000,
                 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000);

my $startIndex = 0;
my $endIndex = 1;
#position of the lazy subfeature file name in the fake feature.
my $lazyIndex = 2;

my %builtinDefaults =
  (
   "class"        => "feature"
  );

sub unique {
    my %saw;
    return (grep(defined($_) && !$saw{$_}++, @_));
}

sub readJSON {
    my ($file, $default, $skipAssign, $compress) = @_;
    if (-s $file) {
        my $OLDSEP = $/;
        my $fh = new IO::File $file, O_RDONLY
            or die "couldn't open $file: $!";
        binmode($fh, ":gzip") if $compress;
        flock $fh, LOCK_SH;
        # optionally skip variable assignment line
        $fh->getline() if $skipAssign;
        undef $/;
        $default = JSON::from_json(<$fh>);
        $fh->close()
            or die "couldn't close $file: $!";
        $/ = $OLDSEP;
    }
    return $default;
}

sub writeJSON {
    my ($file, $toWrite, $opts, $compress) = @_;

    # create JSON object
    my $json = new JSON;
    # set opts
    if (defined($opts) and ref($opts) eq 'HASH') {
        for my $method (keys %$opts) {
            $json->$method( $opts->{$method} );
        }
    }

    # check depth
    #my $depth = findDepth($toWrite);
    #my $maxDepth = $json->get_max_depth;
    # if ($depth >= $maxDepth) {
    #     my @deepPath = @{deepestPath($toWrite)};
    #     my $warning = "WARNING: found deep path (depth = " . $depth . ", max depth allowed = " . $maxDepth . ")\n";
    #     warn $warning;
    #     for my $n (0..$#deepPath) {
    #         my $elem = $deepPath[$n];
    #         my $type = ref($elem);
    #         if ($type eq 'HASH') {
    #     	warn $n, ": { ", join(", ", map("$_ => $$elem{$_}", keys %$elem)), " }\n";
    #         } elsif ($type eq 'ARRAY') {
    #     	warn $n, ": [ ", join(", ", map(defined($_) ? $_ : "undef", @$elem)), " ]\n";
    #         } else {
    #     	warn $n, ": ", $elem, "\n";
    #         }
    #     }
    #     warn $warning;  # repeat the warning after printing the trace
    # }

    # write
    my $fh = new IO::File $file, O_WRONLY | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    $fh->seek(0, SEEK_SET);
    $fh->truncate(0);
    if ($compress) {
        binmode($fh, ":gzip")
            or die "couldn't set binmode: $!";
    }
    $fh->print($json->encode($toWrite));
    $fh->close()
      or die "couldn't close $file: $!";
}

sub modifyJSFile {
    my ($file, $varName, $callback) = @_;
    my ($data, $assign);
    my $fh = new IO::File $file, O_RDWR | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    # if the file is non-empty,
    if (($fh->stat())[7] > 0) {
        # get variable assignment line
        $assign = $fh->getline();
        # get data
        my $jsonString = join("", $fh->getlines());
        $data = JSON::from_json($jsonString) if (length($jsonString) > 0);
        # prepare file for re-writing
        $fh->seek(0, SEEK_SET);
        $fh->truncate(0);
    }
    # add assignment line
    $fh->print("$varName = \n");
    # modify data, write back
    $fh->print(JSON::to_json($callback->($data), {pretty => 1}));
    $fh->close()
      or die "couldn't close $file: $!";
}

sub writeTrackEntry {
    my ($file, $entry) = @_;
    modifyJSFile($file, "trackInfo",
        sub {
            my $origTrackList = shift;
            my @trackList = grep { exists($_->{'label'}) } @$origTrackList;
            my $i;
            for ($i = 0; $i <= $#trackList; $i++) {
                last if ($trackList[$i]->{'label'} eq $entry->{'label'});
            }
            $trackList[$i] = $entry;
            return \@trackList;
        });
}

# turn perl subs from the config file into callable functions
sub evalSubStrings {
    my $hashref = shift;
    foreach my $key (keys %{$hashref}) {
        next if ("CODE" eq (ref $hashref->{$key}));

        if ("HASH" eq (ref $hashref->{$key})) {
            evalSubStrings($hashref->{$key});
        } else {
            $hashref->{$key} = eval($hashref->{$key})
              if (defined($hashref->{$key}) && $hashref->{$key} =~ /^\s*sub\s*{.*}\s*$/);
        }
    }
}

sub new {
    my ($class, $outDir, $outRel, $chunkBytes, $compress, $label, $segName,
        $refStart, $refEnd, $setStyle, $headers, $subfeatHeaders) = @_;

    my %style = ("key" => $label,
                 %builtinDefaults,
		 %$setStyle);

    evalSubStrings(\%style);

    my $self = {
        style          => \%style,
        label          => $label,
        outDir         => $outDir,
        outRel         => $outRel,
        chunkBytes     => $chunkBytes,
        compress       => $compress,
        sublistIndex   => $#{$headers} + 1,
        curMapHeaders  => $headers,
        subfeatHeaders => $subfeatHeaders,
        names          => [],
        ext            => ($compress ? "jsonz" : "json"),
        refStart       => $refStart,
        refEnd         => $refEnd,
        count          => 0
    };

    # arbitrarily set the bin size of the the finest-grained histogram 
    # to one data point per 10 bases
    $self->{histBinBases} = 10;
    $self->{hists} = [];

    # initialize histogram arrays to all zeroes
    for (my $i = 0; $i <= $#multiples; $i++) {
        my $binBases = $self->{histBinBases} * $multiples[$i];
        $self->{hists}->[$i] = [(0) x ceil($refEnd / $binBases)];
        last if $binBases > $refEnd;
    }

    mkdir($outDir) unless (-d $outDir);
    unlink (glob $outDir . "/hist*");
    unlink (glob $outDir . "/lazyfeatures*");
    unlink $outDir . "/names.json";
    unlink $outDir . "/trackData.json";

    my $lazyPathTemplate = "$outDir/lazyfeatures-{chunk}." . $self->{ext};

    my $output = sub {
        my ($toWrite, $chunkId) = @_;
        print STDERR "writing chunk $chunkId\n";
        (my $path = $lazyPathTemplate) =~ s/\{chunk\}/$chunkId/g;
        writeJSON($path,
                  $toWrite,
                  {pretty => 0, max_depth => MAX_JSON_DEPTH},
                  $compress);
    };
        

    $self->{sublistIndex} += 1 if ($self->{sublistIndex} == $lazyIndex);
    $self->{features} = LazyNCList->new($startIndex, $endIndex,
                                        $self->{sublistIndex},
                                        $lazyIndex,
                                        sub { length(JSON::to_json($_[0])) },
                                        $output,
                                        $chunkBytes);

    bless $self, $class;
    return $self;
}

sub addFeature {
    my ($self, $feature) = @_;

    $self->{features}->addSorted($feature);
    $self->{count}++;

    my $histograms = $self->{hists};

    for (my $i = 0; $i <= $#multiples; $i++) {
        my $binBases = $self->{histBinBases} * $multiples[$i];
        last if $binBases > $self->{refEnd};

        my $firstBin = int($feature->[$startIndex] / $binBases);
        $firstBin = 0 if ($firstBin < 0);
        my $lastBin = int($feature->[$endIndex] / $binBases);
        return if ($lastBin < 0);
        for (my $bin = $firstBin; $bin <= $lastBin; $bin++) {
            $histograms->[$i]->[$bin] += 1;
        }
    }
}

sub addName {
    my ($self, $name) = @_;
    push @{$self->{names}}, $name;
}

sub featureCount {
    my ($self) = @_;
    return $self->{count};
}

sub hasFeatures {
    my ($self) = @_;
    return $self->{count} >= 0;
}

sub generateTrack {
    my ($self) = @_;

    $self->{features}->finish();

    my $ext = $self->{ext};

    writeJSON($self->{outDir} . "/names.json", $self->{names}, {pretty => 0, max_depth => MAX_JSON_DEPTH}, 0)
        if ($#{$self->{names}} >= 0);

    my $features = $self->{features};

    my $histChunkSize = 10_000;

    # approximate the number of bases per histogram bin at the zoom level where
    # FeatureTrack.js switches to histogram view, by default
    my $histBinThresh = ($self->{refEnd} * 2.5) / $self->{count};

    # find multiple of base hist bin size that's just over $histBinThresh
    my $i;
    for ($i = 1; $i <= $#multiples; $i++) {
        last if ($self->{histBinBases} * $multiples[$i]) > $histBinThresh;
    }

    my @histogramMeta;
    # Generate more zoomed-out histograms so that the client doesn't
    # have to load all of the histogram data when there's a lot of it.
    # Each successive histogram is 10-fold coarser (3 spots later
    # in @multiples) than the previous one.
    for (my $j = $i - 1; $j <= $#multiples; $j += 3) {
        my $curHist = $self->{hists}->[$j];
        my $histBases = $self->{histBinBases} * $multiples[$j];

        my $chunks = chunkArray($curHist, $histChunkSize);
        for (my $i = 0; $i <= $#{$chunks}; $i++) {
            writeJSON($self->{outDir} . "/hist-$histBases-$i.$ext",
                      $chunks->[$i],
                      {pretty => 0},
                      $self->{compress});
        }
        push @histogramMeta,
            {
                basesPerBin => $histBases,
                arrayParams => {
                    length => $#{$curHist} + 1,
                    urlTemplate => "hist-$histBases-{chunk}.$ext",
                    chunkSize => $histChunkSize
                }
            };
        last if ($#{$curHist} < $histChunkSize);
    }

    my @histStats;
    for (my $j = $i - 1; $j <= $#multiples; $j++) {
        my $binBases = $self->{histBinBases} * $multiples[$j];
        push @histStats, {'bases' => $binBases,
                          arrayStats($self->{hists}->[$j])};
        last if $binBases > $self->{refEnd};
    }

    my $trackData = {
                     'label' =>
                         $self->{label},
                     'key' =>
                         $self->{style}->{key},
                     'sublistIndex' =>
                         $self->{sublistIndex},
                     'lazyIndex' =>
                         $lazyIndex,
                     'headers' =>
                         $self->{curMapHeaders},
                     'featureCount' =>
                         $self->{count},
                     'type' =>
                         "FeatureTrack",
                     'className' =>
                         $self->{style}->{class},
                     'subfeatureClasses' =>
                         $self->{style}->{subfeature_classes},
                     'subfeatureHeaders' =>
                         $self->{style}->{subfeatureHeaders},
                     'arrowheadClass' =>
                         $self->{style}->{arrowheadClass},
                     'clientConfig' =>
                         $self->{style}->{clientConfig},
                     'featureNCList' =>
                         $self->{features}->topLevelList,
                     'lazyfeatureUrlTemplate' =>
                         "lazyfeatures-{chunk}.$ext",
                     'histogramMeta' =>
                         \@histogramMeta,
                     'histStats' =>
                         \@histStats
                    };
    $trackData->{urlTemplate} = $self->{style}->{urlTemplate}
      if defined($self->{style}->{urlTemplate});
    writeJSON($self->{outDir} ."/trackData.$ext",
              $trackData,
              {pretty => 0, max_depth => MAX_JSON_DEPTH},
              $self->{compress});
}

sub trimArray {
    my $arr = shift;
    pop @$arr until defined($arr->[-1]);
}

sub arrayStats {
    my $arr = shift;
    my $max = max(@$arr);
    my $sum = sum(@$arr);
    my $mean = $sum / ($#{$arr} + 1);
#    my $var = sum(map {($_ - $mean) ** 2} @$arr) / ($#{$arr} + 1);
#    return ('max' => $max, 'sum' => $sum,
#            'mean' => $mean, 'var' => $var,
#            'stddev' => sqrt($var));
    return ('max' => $max, 'mean' => $mean);
}

sub aggSumArray {
    my ($bigArray, $count) = @_;

    my @result;
    my $curSum = $bigArray->[0];
    for (my $i = 1; $i <= $#{$bigArray}; $i++) {
        if (0 == ($i % $count)) {
            push @result, $curSum;
            $curSum = 0;
        }
        $curSum += $bigArray->[$i];
    }
    push @result, $curSum;
    return \@result;
}

sub chunkArray {
    my ($bigArray, $chunkSize) = @_;

    my @result;
    for (my $start = 0; $start <= $#{$bigArray}; $start += $chunkSize) {
        my $lastIndex = $start + $chunkSize;
        $lastIndex = $#{$bigArray} if $lastIndex > $#{$bigArray};

        push @result, [@{$bigArray}[$start..$lastIndex]];
    }
    return \@result;
}

# findDepth returns the depth of the deepest element(s) in the structure
# the code is the iterative form of findDepth($obj) = 1 + max(map(findDepth($_), childArray($obj)))
# where childArray($obj) = values(%$obj) [for a hash], @$obj [for an array] or the empty list [for a scalar]
sub findDepth {
    my ($obj) = @_;
    my ($depth, $childArray, $childIndex);
    my @stack;

  FD_NEW_OBJ:
    my $type = ref($obj);
    $childArray = $type eq 'HASH' ? [values %$obj] : ($type eq 'ARRAY' ? $obj : []);
    $depth = 0;
    $childIndex = 0;
  FD_CHILD_LOOP:
    if ($childIndex < @$childArray) {
	push @stack, [$depth, $childArray, $childIndex];
	$obj = $childArray->[$childIndex];
	goto FD_NEW_OBJ;
    } elsif (@stack) {
	my $childDepth = $depth + 1;
	my $vars = pop @stack;
	($depth, $childArray, $childIndex) = @$vars;
	if ($childDepth > $depth) {
	    $depth = $childDepth;
	}
	++$childIndex;
	goto FD_CHILD_LOOP;
    }

    return $depth + 1;
}

# deepestPath returns the path to (the first of) the deepest element(s) in the structure
# the code is the iterative form of deepestPath($obj) = ($obj, longest(map(deepestPath($_), childArray($obj))))
# where childArray($obj) = values(%$obj) [for a hash], @$obj [for an array] or the empty list [for a scalar]
# and longest(@x1, @x2, ... @xn) returns the longest of the given arrays (or the first such, in the event of a tie)
sub deepestPath {
    my ($obj) = @_;
    my ($trace, $childArray, $childIndex);
    my @stack;

  DP_NEW_OBJ:
    my $type = ref($obj);
    $childArray = $type eq 'HASH' ? [values %$obj] : ($type eq 'ARRAY' ? $obj : []);
    $trace = [];
    $childIndex = 0;
  DP_CHILD_LOOP:
    if ($childIndex < @$childArray) {
	push @stack, [$obj, $trace, $childArray, $childIndex];
	$obj = $childArray->[$childIndex];
	goto DP_NEW_OBJ;
    } elsif (@stack) {
	my $childTrace = [$obj, @$trace];
	my $vars = pop @stack;
	($obj, $trace, $childArray, $childIndex) = @$vars;
	if (@$childTrace > @$trace) {
	    $trace = $childTrace;
	}
	++$childIndex;
	goto DP_CHILD_LOOP;
    }

    return [$obj, @$trace];
}

1;

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
