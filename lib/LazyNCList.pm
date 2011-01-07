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
                 'chunkSizes' => [0],
                 'chunkNum' => 0,
                 'nclStack' => [[]],
                 'partialStack' => [[]],
                 'precedingFeats' => [],
                 'sizeThresh' => $sizeThresh,
                 'sameStart' => 0 };
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

        # $precedingFeat is the last feature at this level
        # before the start of the current chunk
        my $precedingFeat = $self->{precedingFeats}->[$level];

        # If:
        #   * this partial chunk is full, or
        #   * this chunk starts at the same place as the feature
        #     immediately before it, and this feature would extend this chunk
        #     beyond that feature
        if (($chunkSizes->[$level] > $self->{sizeThresh})
            || (defined($precedingFeat)
                && ($precedingFeat->[$start]
                    == $self->{partialStack}->[$level]->[0]->[$start])
                && ($precedingFeat->[$end] < $feat->[$end]) ) ){
            # then we're finished with the current "partial" chunk (i.e.,
            # it's now a "complete" chunk rather than a partial one), so
            # create a new NCList to hold all the features in this chunk.
            my $newNcl = NCList->new($start,
                                     $end,
                                     $self->{sublistIndex});
            $newNcl->ID($self->{chunkNum});
            $self->{chunkNum} += 1;
            $newNcl->addFeatures($self->{partialStack}->[$level]);

            # set the previous feature at this level to the last feature in
            # the partialstack for this level
            $self->{precedingFeats}->[$level] =
                $self->{partialStack}->[$level]->[-1];

            # start a new partial chunk with the current feature
            $self->{partialStack}->[$level] = [$feat];
            $chunkSizes->[$level] = $featSize;

            # create a lazy ("fake") feature to represent this chunk
            my $lazyFeat = [];
            $lazyFeat->[$start] = $newNcl->minStart;
            $lazyFeat->[$end] = $newNcl->maxEnd;
            $lazyFeat->[$self->{lazyIndex}] = {"chunk" => $newNcl->ID};

            $feat = findContainingNcl($self->{nclStack}->[$level],
                                      $self->{output},
                                      $newNcl,
                                      $lazyFeat);

            # If $lazyFeat was contained in a feature in
            # $self->{nclStack}->[$level], then findContainingNcl will place
            # $lazyFeat within that container feature and return undef.
            # That means we don't have to proceed to higher levels of the
            # NCL stack to try and find a place to stick $feat.
            last unless defined($feat);

            # if $feat is defined, though, then we do have to keep going to
            # find a place for $feat

            # if we're already at the highest level,
            if ($level == $#{$self->{partialStack}}) {
                # then we need to make a new level to have somewhere to put
                # the new lazy feat
                push @{$self->{partialStack}}, [];
                push @$chunkSizes, 0;
                push @{$self->{nclStack}}, [];
            }
        } else {
            # add the current feature the partial chunk at this level
            push @{$self->{partialStack}->[$level]}, $feat;
            last;
        }
    }
}

# takes: array of NCLs, in which the later ones are all contained within
#           the earlier ones
#        sub for outputting chunks
#        new NCL
#        lazy feat for the new NCL
# this sub starts at the end of the array and iterates toward the front,
#    examining each NCL in it.  For each of the existing NCLs it encounters,
#    it checks to see if that existing NCL contains the new NCL.  If it does,
#    then the lazy feat is added to the containing NCL, and the new NCL is
#    added to the array; otherwise, the existing NCL is popped off of
#    the array, and outputted.
# returns: the lazy feat, if it wasn't consumed by this sub
sub findContainingNcl {
    my ($ncls, $output, $newNcl, $lazyFeat) = @_;
    while ($#{$ncls} >= 0) {
        my $existingNcl = $ncls->[-1];
        #print STDERR "comparing existing NCL " . $existingNcl->ID . " on [" . $existingNcl->minStart . ", " . $existingNcl->maxEnd . ") to new NCL " . $newNcl->ID . " on [" . $newNcl->minStart . ", " . $newNcl->maxEnd . ")\n";
        # if the new NCL is contained within this existing NCL,
        if ($newNcl->maxEnd < $existingNcl->maxEnd) {
            # add the lazy feat to the existing NCL,
            #use Data::Dumper;
            #print STDERR "adding " . Dumper($lazyFeat) . " to NCL " . $existingNcl->ID . " on [" . $existingNcl->minStart . ", " . $existingNcl->maxEnd . ")\n";
            $existingNcl->addFeatures([$lazyFeat]);
            # and add the new NCL to the stack
            #print STDERR "adding " . $newNcl->ID . " on [" . $newNcl->minStart . ", " . $newNcl->maxEnd . ") to ncl stack\n";
            push @$ncls, $newNcl;
            # and we're done
            return;
        } else {
            # write out the existing NCL
            $output->($existingNcl->nestedList, $existingNcl->ID);
            # remove the existing NCL from the array
            pop @$ncls;
        }
    }
    #print STDERR "adding " . $newNcl->ID . " on [" . $newNcl->minStart . ", " . $newNcl->maxEnd . ") to ncl stack\n";
    push @$ncls, $newNcl;
    return $lazyFeat;
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

        $lazyFeat = findContainingNcl($self->{nclStack}->[$level],
                                      $self->{output},
                                      $newNcl,
                                      $lazyFeat);

        foreach my $ncl (@{$self->{nclStack}->[$level]}) {
            $self->{output}->($ncl->nestedList,
                              $ncl->ID);
        }

        # If $lazyFeat wasn't consumed by findContaingNcl, then
        # proceed to pass it up to the next higher level of the stack.
        # (the loop ends one level before the highest level, so there
        # will always be at least one higher level)
        push @{$self->{partialStack}->[$level + 1]}, $lazyFeat
            if defined($lazyFeat);
    }

    # make sure there's a top-level NCL
    $level = $#{$self->{partialStack}};
    my $newNcl = NCList->new($self->{startIndex},
                             $self->{endIndex},
                             $self->{sublistIndex});
    $newNcl->ID($self->{chunkNum});
    $self->{chunkNum} += 1;
    $newNcl->addFeatures($self->{partialStack}->[$level]);
    #print STDERR "top level NCL has " . scalar(@{$self->{partialStack}->[$level]}) . " features\n";
    $self->{nclStack}->[$level] = $newNcl;
}

sub topLevelList {
    return shift->{nclStack}->[-1]->nestedList;
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
