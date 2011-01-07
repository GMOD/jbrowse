#After
#Alekseyenko, A., and Lee, C. (2007).
#Nested Containment List (NCList): A new algorithm for accelerating
#   interval query of genome alignment and interval databases.
#Bioinformatics, doi:10.1093/bioinformatics/btl647
#http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

package NCList;

use strict;
use warnings;
use Carp;
use List::Util qw(max);
use Data::Dumper;

=head2 new

 Title   : new
 Usage   : NCList->new($startIndex, $endIndex, $sublistIndex, $featList)
 Function: create an NCList
 Example : 
 Returns : an NCList object
 Args    : The addFeatures method takes a reference to an array of arrays;
           the arguments here describe the inner arrays.
           Each of those inner arrays represents an interval with the start
           position at $start and the end position at $end.
           $sublistIndex should be an array position that's otherwise unused.

=cut

sub new {
    my ($class, $start, $end, $sublistIndex) = @_;

    my $curList = [];

    my $self = { 'topList' => $curList,
                 'startIndex' => $start,
                 'endIndex' => $end,
		 'sublistIndex' => $sublistIndex,
                 'sublistStack' => [],
                 'curList' => $curList,
	         'count' => 0,
                 'lastAdded' => undef,
                 'minStart' => undef,
                 'maxEnd' => undef };
    bless $self, $class;

    return $self;
}

sub ID {
    my $self = shift;
    if (@_) {
        croak "ID already set" if defined($self->{ID});
        $self->{ID} = shift;
    } else {
        return $self->{ID};
    }
}

sub addFeatures {
    my ($self, $features) = @_;

    #@$sublistStack is a list of all the currently relevant sublists
    #(one for each level of nesting)
    my $sublistStack = $self->{sublistStack};
    #$curlist is the currently active sublist
    my $curList = $self->{curList};
    #$lastAdded is the most recently added feature
    my $lastAdded = $self->{lastAdded};

    my $start = $self->{startIndex};
    my $end = $self->{endIndex};
    my $sublistIndex = $self->{sublistIndex};

    #maxEnd is the highest feature end value that we've seen
    my $maxEnd;

    if (!defined($lastAdded)) {
        $lastAdded = shift @$features;
        $self->{minStart} = $lastAdded->[$start];
        $maxEnd = $lastAdded->[$end];
        push @$curList, $lastAdded;
    } else {
        $lastAdded = $self->{lastAdded};
        $maxEnd = $self->{maxEnd};
    }

    for (my $i = 0; $i <= $#{$features}; $i++) {
        croak "input not sorted: got \n" . Dumper($lastAdded) . "\nbefore\n" . Dumper($features->[$i]) . "\n"
            if (($lastAdded->[$start] > $features->[$i]->[$start])
                || (($lastAdded->[$start] == $features->[$i]->[$start])
                    &&
                    ($lastAdded->[$end] < $features->[$i]->[$end])) );

        $maxEnd = max($maxEnd, $features->[$i]->[$end]);

        $curList = _addSingle($features->[$i], $lastAdded,
                              $sublistStack, $curList,
                              $end, $sublistIndex);

        $lastAdded = $features->[$i];
    }

    $self->{curList} = $curList;
    $self->{maxEnd} = $maxEnd;
    $self->{lastAdded} = $lastAdded;
}

sub _addSingle {
    my ($feat, $lastAdded, $sublistStack, $curList, $end, $sublistIndex) = @_;

    #if this interval is contained in the previous interval,
    if ($feat->[$end] < $lastAdded->[$end]) {
        #create a new sublist starting with this interval
        push @$sublistStack, $curList;
        $curList = [$feat];
        $lastAdded->[$sublistIndex] = $curList;
    } else {
        #find the right sublist for this interval
        while (1) {
            #if we're at the top level list,
            if ($#{$sublistStack} < 0) {
                #just add the current feature to the current list
                push @$curList, $feat;
                last;
            } else {
                #if the last interval in the last sublist in
                #sublistStack ends after the end of the current interval,
                if ($sublistStack->[-1]->[-1]->[$end] > $feat->[$end]) {
                    #then curList is the first (deepest) sublist
                    #that the current feature fits into, and
                    #we add the current feature to curList
                    push @$curList, $feat;
                    last;
                } else {
                    #move on to the next shallower sublist
                    $curList = pop @$sublistStack;
                }
            }
        }
    }

    return $curList;
}

sub maxEnd {
    return shift->{maxEnd};
}

sub minStart {
    return shift->{minStart};
}

sub nestedList {
    return shift->{topList};
}

1;

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2010 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
