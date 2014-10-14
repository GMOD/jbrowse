=head1 NAME

FeatureTrack - a track containing "regular" interval features

=head1 DESCRIPTION

WARNING: currently only works for *loading* feature data.  Other
operations on the feature data are not supported by this module.

=head1 METHODS

=cut

package FeatureTrack;

use strict;
use warnings;
use File::Path qw( rmtree );
use File::Spec;
use List::Util qw( min max sum first );
use POSIX qw (ceil);

use IntervalStore;
use JsonFileStorage;
use NameHandler;

sub new {
    my ($class, $trackDirTemplate, $baseUrl, $label, $config, $key, $jsclass) = @_;

    $config->{compress} = $config->{compress} || 0;
    $config->{storeClass} = 'JBrowse/Store/SeqFeature/NCList';
    my $self = {
                trackDirTemplate => $trackDirTemplate,
                label => $label,
                key => $key || $label,
                trackDataFilename => "trackData" . ($config->{compress} ?
                                                    ".jsonz" : ".json"),
                config => $config,
                jsclass => $jsclass || 'FeatureTrack',
               };
    $config->{urlTemplate} = $baseUrl . "/" . $self->{trackDataFilename}
      unless defined($config->{urlTemplate});
    bless $self, $class;

    return $self;
}

sub label { return shift->{label}; }
sub key { return shift->{key}; }
sub type { return shift->{jsclass} }
sub config { return shift->{config}; }

=head2 startLoad( $refSeqName, $chunkBytes, \@classes )

Starts loading for a given refseq.  Takes the name of the reference
seq, the number of bytes in a chunk, and an arrayref containing the
L<ArrayRepr> definitions for each feature class.

Example:

  $featureTrack->startLoad("chr4");
  $featuretrack->addSorted( $_ ) for @sorted_features;

=cut

sub startLoad {
    my ($self, $refSeq, $chunkBytes, $classes) = @_;

    (my $outDir = $self->{trackDirTemplate}) =~ s/\{refseq\}/$refSeq/g;
    rmtree($outDir) if (-d $outDir);

    my $jsonStore = JsonFileStorage->new($outDir, $self->config->{compress});
    $self->_make_nameHandler;
    my $intervalStore = $self->{intervalStore} =
        IntervalStore->new({store => $jsonStore,
                            classes => $classes });

    # add 1 for the comma between features in the JSON arrays
    my $measure = sub { return $jsonStore->encodedSize($_[0]) + 1; };
    $intervalStore->startLoad($measure, $chunkBytes);

    $self->{loading} = 1;

    return;
}

sub _intervalStore { $_[0]->{intervalStore} }

=head2 addSorted( $feature )

Add a feature to this feature track.  Features must be passed to this
in sorted order.

=cut

sub addSorted { shift->_intervalStore->addSorted( @_ ) }

=head2 hasFeatures

Returns true if this track has features in it.

=cut

sub hasFeatures { $_[0]->_intervalStore && $_[0]->_intervalStore->hasIntervals }

=head2 finishLoad()

Finish loading this track, if it is loading.

=cut

sub finishLoad {
    my ( $self ) = @_;

    return unless $self->{loading};

    my $ivalStore = $self->_intervalStore;
    $ivalStore->finishLoad;
    $self->nameHandler->finish;

    my $trackData = {
        featureCount => $ivalStore->count,
        intervals => $ivalStore->descriptor,
        histograms => $self->writeHistograms($ivalStore),
        formatVersion => 1
        };

    $ivalStore->store->put($self->{trackDataFilename}, $trackData);

    %{ $self->{intervalStore}} = ();
    delete $self->{intervalStore};

    $self->{loading} = 0;

    return;
}

sub DESTROY { $_[0]->finishLoad }

=head2 nameHandler

Return a NameHandler object configured to generate name files for this
track.  Not available until startLoad() is called.

=cut

sub nameHandler { $_[0]->{nameHandler} }
sub _make_nameHandler {
    my ( $self ) = @_;
    (my $trackdir = $self->{trackDirTemplate});
    my @values=split(/\{refseq\}/,$trackdir);
    my $pass=quotemeta($values[0]).'$_[0]';
    $self->{nameHandler} = NameHandler->new( eval qq|sub { "$pass" }| );
}


sub writeHistograms {
    my ($self, $ivalStore) = @_;
    #this series of numbers is used in JBrowse for zoom level relationships
    my @multiples = (1, 2, 5, 10, 20, 50, 100, 200, 500,
                     1000, 2000, 5000, 10_000, 20_000, 50_000,
                     100_000, 200_000, 500_000, 1_000_000);
    my $histChunkSize = 10_000;

    my $attrs = ArrayRepr->new($ivalStore->classes);
    my $getStart = $attrs->makeFastGetter("Start");
    my $getEnd = $attrs->makeFastGetter("End");

    my $jsonStore = $ivalStore->store;
    my $refEnd = $ivalStore->lazyNCList->maxEnd || 0;
    my $featureCount = $ivalStore->count;

    # $histBinThresh is the approximate the number of bases per
    # histogram bin at the zoom level where FeatureTrack.js switches
    # to the histogram view by default
    my $histBinThresh = $featureCount ? ($refEnd * 2.5) / $featureCount : 999_999_999_999;
    my $histBinBases  = ( first { $_ > $histBinThresh } @multiples ) || $multiples[-1];

    # initialize histogram arrays to all zeroes
    my @histograms;
    for (my $i = 0; $i < @multiples; $i++) {
        my $binBases = $histBinBases * $multiples[$i];
        $histograms[$i] = [(0) x ceil($refEnd / $binBases)];
        # somewhat arbitrarily cut off the histograms at 100 bins
        last if $binBases * 100 > $refEnd;
    }

    my $processFeat = sub {
        my ($feature) = @_;
        my $curHist;
        my $start = max(0, min($getStart->($feature), $refEnd));
        my $end = min($getEnd->($feature), $refEnd);
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

    $ivalStore->overlapCallback($ivalStore->lazyNCList->minStart,
				$ivalStore->lazyNCList->maxEnd,
                                $processFeat);

    # find multiple of base hist bin size that's just over $histBinThresh
    my $i;
    for ($i = 1; $i <= $#multiples; $i++) {
        last if ($histBinBases * $multiples[$i]) > $histBinThresh;
    }

    my @histogramMeta;
    my @histStats;
    for (my $j = $i - 1; $j <= $#multiples; $j += 1) {
        my $curHist = $histograms[$j];
        last unless defined($curHist);
        my $histBases = $histBinBases * $multiples[$j];

        my $chunks = chunkArray($curHist, $histChunkSize);
        for (my $k = 0; $k <= $#{$chunks}; $k++) {
            $jsonStore->put("hist-$histBases-$k" . $jsonStore->ext,
                            $chunks->[$k]);
        }
        push @histogramMeta,
            {
                basesPerBin => $histBases,
                arrayParams => {
                    length => $#{$curHist} + 1,
                    urlTemplate => "hist-$histBases-{Chunk}" . $jsonStore->ext,
                    chunkSize => $histChunkSize
                }
            };
        push @histStats,
            {
                'basesPerBin' => $histBases,
                'max'  => @$curHist ? max( @$curHist ) : undef,
                'mean' => @$curHist ? ( sum( @$curHist ) / @$curHist ) : undef,
            };
    }

    return { meta => \@histogramMeta,
             stats => \@histStats };
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

1;

=head1 AUTHOR

Mitchell Skinner E<lt>jbrowse@arctur.usE<gt>

Copyright (c) 2007-2011 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
