package LazyNCList;

use strict;
use warnings;

=head2 new

 Title   : new
 Usage   : LazyNCList->new($start, $end, $setSublist, $makeLazy,
                           $measure, $output, $sizeThresh
 Function: create an LazyNCList
 Returns : an LazyNCList object
 Args    : $start is a reference to a sub that, given an arrayref representing
              an interval, returns the start position of the interval
           $end is a reference to a sub that, given an arrayref representing
              an interval, returns the end position of the interval
           $setSublist is a reference to a sub that, given an arrayref
              representing an interval, and a sublist reference, sets the
              "Sublist" attribute on the array to the sublist.
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
    my ($class, $start, $end, $setSublist, $makeLazy,
        $measure, $output, $sizeThresh) = @_;

    my $self = { 'start' => $start,
                 'end' => $end,
		 'setSublist' => $setSublist,
                 'makeLazy' => $makeLazy,
                 'measure' => $measure,
                 'output' => $output,
                 'sizeThresh' => $sizeThresh,
                 'chunkNum' => 1,
                 'chunkSizes' => [],
                 'partialStack' => []};
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
                        if (($start->($lastAdded) == $start($feat))
                                &&
                                    ($end->($lastAdded) < $end->($feat)));
    }

    $self->{lastAdded} = $feat;

    my $chunkSizes = $self->{chunkSizes};

    for (my $level = 0; $level <= $#{$self->{partialStack}}; $level++) {
        my $featSize = $self->{measure}->($feat);
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

sub topLevelList {
    return shift->{topLevelList};
}

1;

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2011 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
