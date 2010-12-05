package LazyNCList;

use strict;
use warnings;
#use List::Util qw(min max sum reduce);

sub new {
    my ($class, $start, $end, $sublistIndex, $lazyIndex,
        $measure, $output, $sizeThresh) = @_;

    my $self = { 'topList' => [],
                 'startIndex' => $start,
                 'endIndex' => $end,
		 'sublistIndex' => $sublistIndex,
                 'lazyIndex' => $lazyIndex,
                 'measure' => $measure,
                 'output' => $output,
                 'lazyStack' => [],
                 'lazyEnds' => [],
                 'chunkSizes' => [0],
                 'chunkNum' => 0,
                 'nclStack' => [],
                 'partialStack' => [[]],
                 'sizeThresh' => $sizeThresh };
    bless $self, $class;

    return $self;
}

sub nestedList {
    return shift->{topList};
}

sub addSorted {
    my ($self, $feat) = @_;
    # this method, the "finish" method, and NCList::_addSingle
    # have some strong similarities, but I don't see yet how to
    # nicely fold them into shared code.
    # If you change one, check the others.

    my $lastAdded = $self->{lastAdded};
    my $start = $self->{startIndex};
    my $end = $self->{endIndex};

    if (defined($lastAdded)) {
        # check that the input is sorted
        die "input not sorted: got start "
            . $lastAdded->[$start]
                . " before "
                    . $feat->[$start]
                        if ($lastAdded->[$start] > $feat->[$start]);

        die "input not sorted: got "
            . $lastAdded->[$start] . " .. " . $lastAdded->[$end]
                . " before "
                    . $feat->[$start] . " .. " . $feat->[$end]
                        if (($lastAdded->[$start] == $feat->[$start])
                                &&
                                    ($lastAdded->[$end] < $feat->[$end]));
    }

    $self->{lastAdded} = $feat;

    my $chunkSizes = $self->{chunkSizes};

    for (my $level = 0; $level <= $#{$self->{partialStack}}; $level++) {
        my $featSize = $self->{measure}->($feat);
        $chunkSizes->[$level] += $featSize;
        #print STDERR "chunksize at $level is now " . $chunkSizes->[$level] . "; (next chunk is " . $self->{chunkNum} . ")\n";

        # If this partial chunk is full,
        if ($chunkSizes->[$level] > $self->{sizeThresh}) {
            # then this "partial" chunk is now a complete chunk, so
            # create a new NCList to hold all the features in this chunk.
            my $newNcl = NCList->new($start,
                                     $end,
                                     $self->{sublistIndex});
            $newNcl->ID($self->{chunkNum});
            $self->{chunkNum} += 1;
            $newNcl->addFeatures($self->{partialStack}->[$level]);

            # start a new partial chunk with the current feature
            $self->{partialStack}->[$level] = [$feat];
            $chunkSizes->[$level] = $featSize;

            # create a lazy ("fake") feature to represent this chunk
            my $lazyFeat = [];
            $lazyFeat->[$start] = $newNcl->minStart;
            $lazyFeat->[$end] = $newNcl->maxEnd;
            $lazyFeat->[$self->{lazyIndex}] = {"chunk" => $newNcl->ID};

            # if there is a previous NCL at this level, and
            # if the new lazy feature is within the previous NCL,
            if (defined($self->{nclStack}->[$level])
                && $self->{nclStack}->[$level]->maxEnd > $newNcl->maxEnd) {
                # add it there
                $self->{nclStack}->[$level]->addFeatures([$lazyFeat]);
                last;
            } else {
                # otherwise, write out the previous NCL, if it exists
                if (defined($self->{nclStack}->[$level])) {
                    $self->{output}->($self->{nclStack}->[$level]->nestedList,
                                      $self->{nclStack}->[$level]->ID);
                }
                # and store the new NCL in its place
                $self->{nclStack}->[$level] = $newNcl;

                # and proceed to pass the new lazy feat up to the
                # higher levels of the stack
                $feat = $lazyFeat;

                # if we're already at the highest level,
                if ($level == $#{$self->{partialStack}}) {
                    # then we need to make a new level to have somewhere to put
                    # the new lazy feat
                    push @{$self->{partialStack}}, [];
                    push @$chunkSizes, 0;
                    #push @{$self->{nclStack}}, [];
                }
            }
        } else {
            # add the current feature the partial chunk at this level
            push @{$self->{partialStack}->[$level]}, $feat;
            last;
        }
    }
}

sub finish {
    my ($self) = @_;
    # see also: the addSorted method
    my $level;

    for ($level = 0; $level < $#{$self->{partialStack}}; $level++) {
        my $newNcl = NCList->new($self->{startIndex},
                                 $self->{endIndex},
                                 $self->{sublistIndex});
        $newNcl->ID($self->{chunkNum});
        $self->{chunkNum} += 1;
        $newNcl->addFeatures($self->{partialStack}->[$level]);

        # create a lazy ("fake") feature to represent this chunk
        my $lazyFeat = [];
        $lazyFeat->[$self->{startIndex}] = $newNcl->minStart;
        $lazyFeat->[$self->{endIndex}] = $newNcl->maxEnd;
        $lazyFeat->[$self->{lazyIndex}] = {"chunk" => $newNcl->ID};

        # if there is a previous NCL at this level, and
        # if the new lazy feature is within the previous NCL,
        if (defined($self->{nclStack}->[$level])
            && $self->{nclStack}->[$level]->maxEnd > $newNcl->maxEnd) {
            # add it there
            $self->{nclStack}->[$level]->addFeatures([$lazyFeat]);
        } else {
            # otherwise, write out the new NCL
            $self->{output}->($newNcl->nestedList, $newNcl->ID);
        }

        #write out the previous NCL, if it exists
        if (defined($self->{nclStack}->[$level])) {
            $self->{output}->($self->{nclStack}->[$level]->nestedList,
                              $self->{nclStack}->[$level]->ID);
        }

        # and proceed to pass the new lazy feat up to the
        # next higher level of the stack
        # (the loop ends one level before the highest level, so there
        # will always be at least one higher level)
        push @{$self->{partialStack}->[$level + 1]}, $lazyFeat;

        
        $self->{output}->($self->{nclStack}->[$level]->nestedList,
                          $self->{nclStack}->[$level]->ID);
    }

    # make sure there's a top-level NCL
    $level = $#{$self->{partialStack}};
    my $newNcl = NCList->new($self->{startIndex},
                             $self->{endIndex},
                             $self->{sublistIndex});
    $newNcl->ID($self->{chunkNum});
    $self->{chunkNum} += 1;
    $newNcl->addFeatures($self->{partialStack}->[$level]);
    print STDERR "top level NCL has " . scalar(@{$self->{partialStack}->[$level]}) . " features\n";
    $self->{nclStack}->[$level] = $newNcl;
}

sub topLevelList {
    return shift->{nclStack}->[-1]->nestedList;
}

=pod

    $chunkSizes[-1] += $self->{measure}->($feat);
    if ($chunkSizes[-1] > $self->{sizeThresh}) {
        my $newChunk = NCList->new($self->{startIndex},
                                   $self->{endIndex},
                                   $self->{sublistIndex},
                                   $self->{partialStack}->[-1]);
        my $lazyFeat = [];
        $lazyFeat[$self->{startIndex}] = $newChunk->minStart;
        $lazyFeat[$self->{endIndex}] = $newChunk->maxEnd;
        $lazyFeat->[$self->{lazyIndex}] = {"chunk" => $self->{chunkNum}};
        $self->{chunkNum} += 1;
        $self->{partialStack}->[-1] = [];
        
    } else {
        push @{$self->{curChunk}}, $feat;
    }











    my $lastAdded = $self->{lastAdded};
    my $containerStack = $self->{containerStack};
    my $curContainer = $containerStack->[$#{$containerStack}];
    my $lazyStack = $self->{lazyStack};
    my $curLazy = $lazyStack->[$#{$lazyStack}];
    my $lazySizes = $self->{lazySizes};
    #my $topList = $self->{topList};
    #my $curList = $self->{curList};
    my $start = $self->{startIndex};
    my $end = $self->{endIndex};
    my $sublistIndex = $self->{sublistIndex};

    if (!defined($lastAdded)) {
        $curLazy = [];
        $curLazy->[$start] = $feat->[$start];
        $curLazy->[$end] = $feat->[$end];
        $curLazy->[$sublistIndex] = [];
        $curLazy->[$lazyIndex] = {"chunk" => $self->{chunk}};
        $self->{chunk} += 1;
        push @$containerStack, $curLazy;
        push @$lazyStack, $curLazy;

        #$self->{topList} = [$feat];
    } else {
        # check that the input is sorted
        die "input not sorted: got start "
            . $lastAdded->[$start]
                . " before "
                    . $features->[$i]->[$start]
                        if ($lastAdded->[$start] > $feat->[$start]);

        die "input not sorted: got "
            . $lastAdded->[$start] . " .. " . $lastAdded->[$end]
                . " before "
                    . $feat->[$start] . " .. " . $feat->[$end]
                        if (($lastAdded->[$start] == $feat->[$start])
                                &&
                                    ($lastAdded->[$end] < $feat->[$end]));

        my ($container, $index) = $self->findContainer($feat, $curLazy);
        push @{$container->[$sublistIndex]}, $feat;
        $curLazy->[$end] = max($curLazy->[$end], $feat->[$end]);
        

        $lazySizes[$#lazySizes] += $self->{measure}->($feat);
        if ($lazySizes[$#lazySizes] > $self->{sizeThresh}) {
            my ($lazyContainer, $lazyIndex);
            if (0 == $#lazyStack) {
                
            } else {
                ($lazyContainer, $lazyIndex) =
                    $self->findContainer($curLazy,
                                         $lazyStack->[$#lazyStack - 1]);
            
        }
    }

    $self->{lastAdded} = $feat;
}

# searches through the sublistStack to find the right containing sublist
# for the given interval.
# doesn't go outside of the given lazy feature.
# return a reference to the sublist, and its index in the sublistStack
sub findContainer {
    my ($self, $feat, $lazy) = @_;
    my @sublistStack = @{$self->{sublistStack}};
    my $end = $self->{endIndex};
    my $curList;

    # go up the sublistStack, looking for the first containing feature
    for (my $i = $#sublistStack; $i >= 0; $i--) {
        $curList = $sublistStack[$i];

        # if this sublist is the current lazy feature, just return it
        # (don't want to move $feat out of the lazy feature)
        return ($curList, $i) if ($curList == $lazy);

        # if the last interval in $curList ends
        # after the end of the current interval,
        if ($topSublist->[$#{$topSublist}]->[$end]
                > $feat->[$end]) {
            # then curList is the first (deepest) sublist
            # that the current feature fits into, so
            # we return it.
            return $curList, $i;
        }
    }

    # should never get here, because the top of @sublistStack should always
    # be the outermost container
    use Data::Dumper;
    croak "couldn't find a container for "
        . $feat->[$self->{startIndex}] . " .. " . $feat->[$end] . "\n"
            . Dumper(\@sublistStack);
    #if we hit the top level list, return that
    #return $curList, 0;
}

=cut

1;

=pod
This used to be nice and simple
	#if this interval is contained in the previous interval,
        if ($feat->[$end] < $lastAdded->[$end]) {
            #create a new sublist starting with this interval
            $curList = [$feat];
            push @sublistStack, $curList;
            $lastAdded->[$sublistIndex] = $curList;
        } else {
            #find the right sublist for this interval
            while (1) {
                #if we're at the top level list,
                if ($#sublistStack < 0) {
                    #just add the current feature
                    push @$curList, $feat;
                    last;
                } else {
                    $topSublist = $sublistStack[$#sublistStack];
                    #if the last interval in the top sublist ends
                    #after the end of the current interval,
                    if ($topSublist->[$#{$topSublist}]->[$end]
                            > $feat->[$end]) {
                        #then curList is the first (deepest) sublist
                        #that the current feature fits into, and
                        #we add the current feature to curList
                        push @$curList, $feat;
                        last;
                    } else {
                        #move on to the next shallower sublist
                        $curList = pop @sublistStack;
                    }
                }
            }
        }

=cut

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
