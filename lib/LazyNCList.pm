package LazyNCList;

use strict;
use warnings;
use Carp;
use List::Util qw(max);

=head2 new

 Title   : new
 Usage   : LazyNCList->new($attrs, $makeLazy,
                           $measure, $output, $sizeThresh
 Function: create an LazyNCList
 Returns : an LazyNCList object
 Args    : $attrs is a reference to an ArrayRepr instance
           $makeLazy is a reference to a sub taking the arguments
              (start, end, ID), which returns a "lazy feature" with the
              given attributes
           $measure is a reference to a sub that takes a feature to be
              output, and returns the number of bytes that feature will
              take up in the output
           $output is a reference to a sub that, given a chunk ID and some data,
              will output that data under that chunk ID
           $sizeThresh is the target chunk size

=cut

sub new {
    my ($class, $attrs, $makeLazy, $loadChunk,
        $measure, $output, $sizeThresh) = @_;

    my $self = { start => $attrs->makeFastGetter("Start"),
                 end => $attrs->makeFastGetter("End"),
                 setSublist => $attrs->makeSetter("Sublist"),
                 makeLazy => $makeLazy,
                 loadChunk => $loadChunk,
                 measure => $measure,
                 output => $output,
                 sizeThresh => $sizeThresh,
                 count => 0,
                 minStart => undef,
                 maxEnd => undef,
                 chunkNum => 1,
                 chunkSizes => [],
                 partialStack => [] };
    bless $self, $class;

    $self->addNewLevel();

    return $self;
}

sub importExisting {
    my ($class, $attrs, $count, $minStart,
        $maxEnd, $loadChunk, $topLevelList) = @_;

    my $self = { start => $attrs->makeFastGetter("Start"),
                 end => $attrs->makeFastGetter("End"),
                 count => $count,
                 minStart => $minStart,
                 maxEnd => $maxEnd,
                 loadChunk => $loadChunk,
                 topLevelList => $topLevelList };
    bless $self, $class;

    $self->addNewLevel();

    return $self;
}

=head2 addSorted

 Title   : addSorted
 Usage   : $ncl->addSorted($feat)
 Function: Adds a single feature to the set of features in this LazyNCList;
           features passed to this method are accumulated into "chunks";
           once a chunk grows to sizeThresh, the chunk is output.
           The features given to addSorted must be sorted by the NCList sort.
 Returns : an NCList object
 Args    : $feat is the feature to be added;

=cut
sub addSorted {
    my ($self, $feat) = @_;

    $self->{count} += 1;
    my $lastAdded = $self->{lastAdded};
    my $start = $self->{start};
    my $end = $self->{end};

    if (defined($lastAdded)) {
        # check that the input is sorted
        die "input not sorted: got start "
            . $start->($lastAdded)
                . " before "
                    . $start->($feat)
                        if ($start->($lastAdded) > $start->($feat));

        die "input not sorted: got "
            . $start->($lastAdded) . " .. " . $end->($lastAdded)
                . " before "
                    . $start->($feat) . " .. " . $end->($feat)
                        if (($start->($lastAdded) == $start->($feat))
                                &&
                                    ($end->($lastAdded) < $end->($feat)));
    } else {
        # LazyNCList requires sorted input, so the start of the first feat
        # is the minStart
        $self->{minStart} = $start->($feat);
    }

    $self->{lastAdded} = $feat;

    my $chunkSizes = $self->{chunkSizes};

    for (my $level = 0; $level <= $#{$self->{partialStack}}; $level++) {
        my $featSize = $self->{measure}->($feat);
        # due to NCList nesting, among other things, it's hard to be exactly
        # precise about the size of the JSON serialization, but this will get
        # us pretty close.
        $chunkSizes->[$level] += $featSize;
        #print STDERR "chunksize at $level is now " . $chunkSizes->[$level] . "; (next chunk is " . $self->{chunkNum} . ")\n";

        # If this partial chunk is full,
        if ($chunkSizes->[$level] > $self->{sizeThresh} ){
            # then we're finished with the current "partial" chunk (i.e.,
            # it's now a "complete" chunk rather than a partial one), so
            # create a new NCList to hold all the features in this chunk.
            my $lazyFeat = $self->finishChunk($self->{partialStack}->[$level]);

            # start a new partial chunk with the current feature
            $self->{partialStack}->[$level] = [$feat];
            $chunkSizes->[$level] = $featSize;

            # and propagate $lazyFeat up to the next level
            $feat = $lazyFeat;

            # if we're already at the highest level,
            if ($level == $#{$self->{partialStack}}) {
                # then we need to make a new level to have somewhere to put
                # the new lazy feat
                $self->addNewLevel();
            }
        } else {
            # add the current feature the partial chunk at this level
            push @{$self->{partialStack}->[$level]}, $feat;
            last;
        }
    }
}

sub addNewLevel {
    my ($self) = @_;
    push @{$self->{partialStack}}, [];
    push @{$self->{chunkSizes}}, 0;
}

sub finishChunk {
    my ($self, $featList) = @_;
    my $newNcl = NCList->new($self->{start},
                             $self->{end},
                             $self->{setSublist},
                             $featList);
    my $chunkId = $self->{chunkNum};
    $self->{chunkNum} += 1;
    $self->{output}->($newNcl->nestedList, $chunkId);

    $self->{maxEnd} = $newNcl->maxEnd unless defined($self->{maxEnd});
    $self->{maxEnd} = max($self->{maxEnd}, $newNcl->maxEnd);

    $self->{maxEnd} = $newNcl->maxEnd unless defined($self->{maxEnd});
    $self->{maxEnd} = max($self->{maxEnd}, $newNcl->maxEnd);
    # return the lazy ("fake") feature representing this chunk
    return $self->{makeLazy}->($newNcl->minStart, $newNcl->maxEnd, $chunkId);
}

=head2 finish

 Title   : finish
 Usage   : $ncl->finish()
 Function: Once all features have been added (through addSorted),
           call "finish" to flush all of the partial chunks.
           After calling finish, you can access the "topLevelList" property.
 Returns : nothing

=cut
sub finish {
    my ($self) = @_;
    my $level;

    for ($level = 0; $level < $#{$self->{partialStack}}; $level++) {
        my $lazyFeat = $self->finishChunk($self->{partialStack}->[$level]);

        # pass $lazyFeat up to the next higher level.
        # (the loop ends one level before the highest level, so there
        # will always be at least one higher level)
        push @{$self->{partialStack}->[$level + 1]}, $lazyFeat;
    }

    # make sure there's a top-level NCL
    $level = $#{$self->{partialStack}};
    my $newNcl = NCList->new($self->{start},
                             $self->{end},
                             $self->{setSublist},
                             $self->{partialStack}->[$level]);
    #print STDERR "top level NCL has " . scalar(@{$self->{partialStack}->[$level]}) . " features\n";
    $self->{topLevelList} = $newNcl->nestedList;
}

sub binarySearch {
    my ($self, $arr, $item, $getter) = @_;

    my $low = -1;
    my $high = $#{$arr} + 1;
    my $mid;

    while ($high - $low > 1) {
        $mid = int(($low + $high) / 2);
        if ($getter->($arr->[$mid]) > $item) {
            $high = $mid;
        } else {
            $low = $mid;
        }
    }

    # if we're iterating rightward, return the high index;
    # if leftward, the low index
    if ($getter == $self->{end}) { return $high } else { return $low };
};

sub iterHelper {
    my ($self, $arr, $from, $to, $fun, $inc,
        $searchGet, $testGet, $path) = @_;
    my $len = $#{$arr} + 1;
    my $i = $self->binarySearch($arr, $from, $searchGet);
    my $getChunk = $self->{attrs}->makeGetter("Chunk");
    my $getSublist = $self->{attrs}->makeGetter("Sublist");

    while (($i < $len)
           && ($i >= 0)
           && (($inc * $testGet->($arr->[$i])) < ($inc * $to)) ) {

        if ($arr->[$i][0] == $self->{lazyClass}) {
            my $chunkNum = $getChunk->($arr->[$i]);
            my $chunk = $self->{loadChunk}->($chunkNum);
            $self->iterHelper($chunk, $from, $to, $fun, $inc,
                              $searchGet, $testGet, [$chunkNum]);
        } else {
            $fun->($arr->[$i], [@$path, $i]);
        }

        my $sublist = $getSublist->($arr->[$i]);
        if (defined($sublist)) {
            $self->iterHelper($sublist, $from, $to, $fun, $inc,
                              $searchGet, $testGet, [@$path, $i]);
        }
        $i += $inc;
    }
}

sub overlapCallback {
    my ($self, $from, $to, $fun) = @_;
    # calls the given function once for each of the
    # intervals that overlap the given interval
    # if from <= to, iterates left-to-right, otherwise iterates right-to-left

    croak "LazyNCList not loaded" unless defined($self->{topLevelList});

    # inc: iterate leftward or rightward
    my $inc = ($from > $to) ? -1 : 1;
    # searchGet: search on start or end
    my $searchGet = ($from > $to) ? $self->{start} : $self->{end};
    # testGet: test on start or end
    my $testGet = ($from > $to) ? $self->{end} : $self->{start};
    # treats the root chunk as number 0
    $self->iterHelper($self->{topLevelList}, $from, $to, $fun,
                      $inc, $searchGet, $testGet, [0]);
}

sub count { return shift->{count}; }

sub maxEnd { return shift->{maxEnd}; }

sub minStart { return shift->{minStart}; }

sub topLevelList { return shift->{topLevelList}; }

1;

=head1 AUTHOR

Mitchell Skinner E<lt>jbrowse@arctur.usE<gt>

Copyright (c) 2007-2011 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
