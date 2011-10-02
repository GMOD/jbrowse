package GenomeDB;

use strict;
use warnings;

sub new {
    my ($class, $dataDir) = @_;

    my $self = {
                dataDir => $dataDir
               };
    bless $self, $class;

    return $self;
}

sub startLoad {
    my ($self, $trackLabel, $refName, $chunkBytes,
        $compress, $classes) = @_;

    return TrackLoad->new($self, $trackLabel, $refName,
                          $chunkBytes, $compress, $classes);
}

sub finishLoad {
    my ($self, $trackLoad) = @_;
    my $trackData = {
                     featureCount => $self->{count},
                     intervals => $trackLoad->intervalStore->descriptor(),
                     histograms => $self->writeHistograms($trackLoad),
                     formatVersion => 1
                    };
}

sub writeHistograms {
    my ($self, $trackLoad) = @_;
    #this series of numbers is used in JBrowse for zoom level relationships
    my @multiples = (1, 2, 5, 10, 20, 50, 100, 200, 500,
                     1000, 2000, 5000, 10_000, 20_000, 50_000,
                     100_000, 200_000, 500_000, 1_000_000);
    my $histChunkSize = 10_000;

    my $attrs = ArrayRepr($trackLoad->classes);
    my $getStart = $attrs->makeFastGetter("Start");
    my $getEnd = $attrs->makeFastGetter("End");

    my $jsonStore = $trackLoad->jsonStore;
    my $ivalStore = $trackLoad->intervalStore;
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

    sub processFeat {
        my ($feature) = @_;
        my $curHist;
        my $start = max(0, min($getStart->($feature), $refEnd));
        my $end = min($getEnd->($feature->[$endIndex]), $refEnd);
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
    }

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

    return { meta => histogramMeta,
             stats => histStats };
}



package TrackLoad;

sub new {
    my ($class, $db, $trackLabel, $refName, $chunkBytes,
        $compress, $classes) = @_;

    my $outDir = Path::Spec->join($self->{dataDir}, "tracks",
                                  $trackLabel, $refName);
    # the client code interprets the lazy URL template
    # as being relative to the directory containing
    # the "trackData.json" file
    my $lazyTemplate => "lf-{Chunk}." . $store->ext,
    my $jsonStore = JsonFileStorage($outDir, $compress);
    my $intervalStore =
      IntervalStore->new({store => $jsonStore,
                          classes => $classes,
                          urlTemplate => $lazyTemplate});

    my $measure = sub { return $jsonStore->encodedSize($_[0]) + 1; };
    $intervalStore->startLoad($measure, $chunkBytes);

    my $self => {
                 db => $db,
                 outDir => $outDir,
                 jsonStore => $jsonStore,
                 classes => $classes,
                 intervalStore => $intervalStore,
                 urlTemplate =>
                     "tracks/$trackLabel/{refseq}/trackData." . $store->ext,
                 lazyTemplate => $lazyTemplate
                };

    bless $self, $class;
    return $self;
}

sub addSorted {
    my ($self, $feat) = @_;
    $self->{intervalStore}->addSorted($feat);
}

sub intervalStore {
    return shift->{intervalStore};
}

sub jsonStore {
    return shift->{jsonStore};
}

sub classes {
    return shift->{classes};
}

sub finish {
    my ($self) = @_;
    $self->{intervalStore}->finishLoad();
    $self->{db}->finishLoad($self);
}

1;
