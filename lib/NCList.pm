#After
#Alekseyenko, A., and Lee, C. (2007).
#Nested Containment List (NCList): A new algorithm for accelerating
#   interval query of genome alignment and interval databases.
#Bioinformatics, doi:10.1093/bioinformatics/btl647
#http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

package NCList;

use strict;
use warnings;
use List::Util qw(max);

=head2 new

 Title   : new
 Usage   : NCList->new($start, $end, $setSublist, $featList)
 Function: create an NCList
 Returns : an NCList object
 Args    : $featList is a reference to an array of arrays;
              each of the inner arrays represents an interval.
           $start is a reference to a sub that, given an inner array from
              $featList, returns the start position of the interval
              represented by that inner array.
           $end is a reference to a sub that, given an inner array from
              $featList, returns the end position of the interval
              represented by that inner array.
           $setSublist is a reference to a sub that, given an inner array from
              $featList and a sublist reference, sets the "Sublist" attribute
              on the array to the sublist.

=cut

sub new {
    my ($class, $start, $end, $setSublist, $featList) = @_;

    my @features = sort {
	if ($start->($a) != $start->($b)) {
	    $start->($a) - $start->($b);
	} else {
	    $end->($b) - $end->($a);
	}
    } @$featList;

    #@sublistStack is a list of all the currently relevant sublists
    #(one for each level of nesting)
    my @sublistStack;
    #$curlist is the currently active sublist
    my $curList = [];

    my $self = { 'topList'    => $curList,
		 'setSublist' => $setSublist,
	         'count'      => scalar( @features ),
                 'minStart'   => ( @features ? $start->($features[0]) : undef ),
               };
    bless $self, $class;

    push @$curList, $features[0] if @features;

    my $maxEnd = @features ? $end->($features[0]) : undef;

    my $topSublist;
    for (my $i = 1; $i < @features; $i++) {
        $maxEnd = max( $maxEnd, $end->( $features[$i] ));
	#if this interval is contained in the previous interval,
	if ($end->($features[$i]) < $end->($features[$i - 1])) {
	    #create a new sublist starting with this interval
	    push @sublistStack, $curList;
	    $curList = [$features[$i]];
            $setSublist->($features[$i - 1], $curList);
	} else {
	    #find the right sublist for this interval
	    while (1) {
                #if we're at the top level list,
		if ($#sublistStack < 0) {
                    #just add the current feature
		    push @$curList, $features[$i];
		    last;
		} else {
		    $topSublist = $sublistStack[$#sublistStack];
                    #if the last interval in the top sublist ends
                    #after the end of the current interval,
		    if ($end->($topSublist->[$#{$topSublist}])
                        > $end->($features[$i]) ) {
			#then curList is the first (deepest) sublist
                        #that the current feature fits into, and
                        #we add the current feature to curList
			push @$curList, $features[$i];
			last;
		    } else {
                        #move on to the next shallower sublist
			$curList = pop @sublistStack;
		    }
		}
	    }
	}
    }

    $self->{maxEnd} = $maxEnd;

    return $self;
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

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
