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

my $histChunkSize = 10_000;

my %builtinDefaults =
  (
   "class"        => "feature"
  );

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
    my ($class, $outDir, $chunkBytes, $compress, $label, $segName,
        $refStart, $refEnd, $setStyle, $headers, $subfeatHeaders,
        $featureCount) = @_;

    my %style = ("key" => $label,
                 %builtinDefaults,
		 %$setStyle);

    evalSubStrings(\%style);

    my $self = {
        style          => \%style,
        label          => $label,
        outDir         => $outDir,
        chunkBytes     => $chunkBytes,
        compress       => $compress,
        sublistIndex   => $#{$headers} + 1,
        curMapHeaders  => $headers,
        subfeatHeaders => $subfeatHeaders,
        ext            => ($compress ? "jsonz" : "json"),
        refStart       => $refStart,
        refEnd         => $refEnd,
        count          => 0
    };

    # $featureCount is an optional parameter; if we don't know it,
    # then arbitrarily estimate that there's 0.25 features per base
    # (0.25 features/base is pretty dense, which gives us
    # a relatively high-resolution histogram; we can always throw
    # away the higher-resolution histogram data later, so a dense
    # estimate is conservative.  A dense estimate does cost more RAM, though)
    $featureCount = $refEnd * 0.25 unless defined($featureCount);

    # $histBinThresh is the approximate the number of bases per
    # histogram bin at the zoom level where FeatureTrack.js switches
    # to the histogram view by default
    my $histBinThresh = ($refEnd * 2.5) / $featureCount;
    $self->{histBinBases} = $multiples[0];
    foreach my $multiple (@multiples) {
        $self->{histBinBases} = $multiple;
        last if $multiple > $histBinThresh;
    }

    # initialize histogram arrays to all zeroes
    $self->{hists} = [];
    for (my $i = 0; $i <= $#multiples; $i++) {
        my $binBases = $self->{histBinBases} * $multiples[$i];
        $self->{hists}->[$i] = [(0) x ceil($refEnd / $binBases)];
        # somewhat arbitrarily cut off the histograms at 100 bins
        last if $binBases * 100 > $refEnd;
    }

    mkdir($outDir) unless (-d $outDir);
    unlink (glob $outDir . "/hist*");
    unlink (glob $outDir . "/lazyfeatures*");
    unlink $outDir . "/trackData.json";

    my $lazyPathTemplate = "$outDir/lazyfeatures-{chunk}." . $self->{ext};

    # $output writes out the feature JSON chunk file
    my $output = sub {
        my ($toWrite, $chunkId) = @_;
        #print STDERR "writing chunk $chunkId\n";
        (my $path = $lazyPathTemplate) =~ s/\{chunk\}/$chunkId/g;
        writeJSON($path,
                  $toWrite,
                  {pretty => 0, max_depth => MAX_JSON_DEPTH},
                  $compress);
    };

    # $measure measures the size of the feature in the final JSON
    my $measure = sub {
        # add 1 for the comma between features
        # (ignoring, for now, the extra characters for sublist brackets)
        return length(JSON::to_json($_[0])) + 1;
    };

    $self->{sublistIndex} += 1 if ($self->{sublistIndex} == $lazyIndex);
    $self->{features} = LazyNCList->new($startIndex, $endIndex,
                                        $self->{sublistIndex},
                                        $lazyIndex,
                                        $measure,
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
    my $curHist;
    my $start = max(0, min($feature->[$startIndex], $self->{refEnd}));
    my $end = min($feature->[$endIndex], $self->{refEnd});
    return if ($end < 0);

    for (my $i = 0; $i <= $#multiples; $i++) {
        my $binBases = $self->{histBinBases} * $multiples[$i];
        $curHist = $histograms->[$i];
        last unless defined($curHist);

        my $firstBin = int($start / $binBases);
        my $lastBin = int($end / $binBases);
        for (my $bin = $firstBin; $bin <= $lastBin; $bin++) {
            $curHist->[$bin] += 1;
        }
    }
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

    my $ext = $self->{ext};
    my $features = $self->{features};
    $features->finish();

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
    for (my $j = $i - 1; $j <= $#multiples; $j += 1) {
        my $curHist = $self->{hists}->[$j];
        last unless defined($curHist);
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
    }

    my @histStats;
    for (my $j = $i - 1; $j <= $#multiples; $j++) {
        last unless defined($self->{hists}->[$j]);
        my $binBases = $self->{histBinBases} * $multiples[$j];
        push @histStats, {'bases' => $binBases,
                          arrayStats($self->{hists}->[$j])};
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
                         $self->{subfeatHeaders},
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
