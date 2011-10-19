package FeatureTrack;

use strict;
use warnings;
use File::Path qw(remove_tree);
use File::Spec;

use IntervalStore;
use JsonFileStorage;

sub new {
    my ($class, $trackDirTemplate, $label, $config, $key) = @_;

    $config->{compress} = $config->{compress} || 0;
    my $self = {
                trackDirTemplate => $trackDirTemplate,
                label => $label,
                key => $key || $label,
                trackDataFilename => "trackData" . ($config->{compress} ?
                                                    ".jsonz" : ".json"),
                config => $config
               };
    bless $self, $class;

    return $self;
}

sub label { return shift->{label}; }
sub key { return shift->{key}; }
sub type { return "FeatureTrack"; }
sub config { return shift->{config}; }

=head2 startLoad

 Title   : startLoad
 Usage   : $ivalStore = $featureTrack->startLoad("chr4");
           $ivalStore->addSorted($feat1);
 Function: starts loading for a given refseq
 Returns : an IntervalStore object
 Args    : refSeq: the name of the reference sequence that's about to get loaded

=cut
sub startLoad {
    my ($self, $refSeq, $chunkBytes, $classes) = @_;

    (my $outDir = $self->{trackDirTemplate}) =~ s/\{refseq\}/$refSeq/g;
    remove_tree($outDir) if (-d $outDir);

    my $jsonStore = JsonFileStorage($outDir, $self->config->{compress});
    my $intervalStore = IntervalStore->new({store => $jsonStore,
                                            classes => $classes });

    # add 1 for the comma between features in the JSON arrays
    my $measure = sub { return $jsonStore->encodedSize($_[0]) + 1; };
    $intervalStore->startLoad($measure, $chunkBytes);
    return $intervalStore;
}

sub finishLoad {
    my ($self, $ivalStore) = @_;
    $ivalStore->finishLoad();
    my $trackData = {
                     featureCount => $ivalStore->count,
                     intervals => $ivalStore->descriptor,
                     histograms => $self->writeHistograms($ivalStore),
                     formatVersion => 1
                    };
    $ivalStore->store->put($self->{trackDataFilename}, $trackData);
}

sub writeHistograms {
    my ($self, $ivalStore) = @_;
    #this series of numbers is used in JBrowse for zoom level relationships
    my @multiples = (1, 2, 5, 10, 20, 50, 100, 200, 500,
                     1000, 2000, 5000, 10_000, 20_000, 50_000,
                     100_000, 200_000, 500_000, 1_000_000);
    my $histChunkSize = 10_000;

    my $attrs = ArrayRepr($ivalStore->classes);
    my $getStart = $attrs->makeFastGetter("Start");
    my $getEnd = $attrs->makeFastGetter("End");

    my $jsonStore = $ivalStore->store;
    my $refEnd = $ivalStore->maxEnd;
    my $featureCount = $ivalStore->count;

    # $histBinThresh is the approximate the number of bases per
    # histogram bin at the zoom level where FeatureTrack.js switches
    # to the histogram view by default
    my $histBinThresh = ($refEnd * 2.5) / $featureCount;

    my $histBinBases = $multiples[0];
    foreach my $multiple (@multiples) {
        $histBinBases = $multiple;
        last if $multiple > $histBinThresh;
    }

    # initialize histogram arrays to all zeroes
    my @histograms;
    for (my $i = 0; $i <= $#multiples; $i++) {
        my $binBases = $histBinBases * $multiples[$i];
        $histograms[$i] = [(0) x ceil($refEnd / $binBases)];
        # somewhat arbitrarily cut off the histograms at 100 bins
        last if $binBases * 100 > $refEnd;
    }

    my $processFeat = sub {
        my ($feature) = @_;
        my $curHist;
        my $start = max(0, min($getStart->($feature), $refEnd));
        my $end = min($getEnd->($getEnd->($feature)), $refEnd);
        return if ($end < 0);

        for (my $i = 0; $i <= $#multiples; $i++) {
            my $binBases = $histBinBases * $multiples[$i];
            $curHist = $histograms[$i];
            last unless defined($curHist);

            my $firstBin = int($start / $binBases);
            my $lastBin = int($end / $binBases);
            for (my $bin = $firstBin; $bin <= $lastBin; $bin++) {
                $curHist->[$bin] += 1;
            }
        }
    };

    $ivalStore->overlapCallback($ivalStore->minStart, $ivalStore->maxEnd,
                                $processFeat);

    # find multiple of base hist bin size that's just over $histBinThresh
    my $i;
    for ($i = 1; $i <= $#multiples; $i++) {
        last if ($self->{histBinBases} * $multiples[$i]) > $histBinThresh;
    }

    my @histogramMeta;
    for (my $j = $i - 1; $j <= $#multiples; $j += 1) {
        my $curHist = $self->{hists}->[$j];
        last unless defined($curHist);
        my $histBases = $self->{histBinBases} * $multiples[$j];

        my $chunks = chunkArray($curHist, $histChunkSize);
        for (my $i = 0; $i <= $#{$chunks}; $i++) {
            $jsonStore->put($self->{outDir}
                            . "/hist-$histBases-$i."
                            . $jsonStore->ext,
                            $chunks->[$i]);
        }
        push @histogramMeta,
            {
                basesPerBin => $histBases,
                arrayParams => {
                    length => $#{$curHist} + 1,
                    urlTemplate => "hist-$histBases-{Chunk}." . $jsonStore->ext,
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

    return { meta => \@histogramMeta,
             stats => \@histStats };
}

1;

=head1 AUTHOR

Mitchell Skinner E<lt>jbrowse@arctur.usE<gt>

Copyright (c) 2007-2011 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
