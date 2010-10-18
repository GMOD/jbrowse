#After
#Alekseyenko, A., and Lee, C. (2007).
#Nested Containment List (NCList): A new algorithm for accelerating
#   interval query of genome alignment and interval databases.
#Bioinformatics, doi:10.1093/bioinformatics/btl647
#http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

package NCList;

use strict;
use warnings;

=head2 new

 Title   : new
 Usage   : NCList->new($startIndex, $endIndex, $sublistIndex, $featList)
 Function: create an NCList
 Example : 
 Returns : an NCList object
 Args    : $featList is a reference to an array of arrays;
           each of the inner arrays represents an interval with the start
           at $startIndex and the end at $endIndex.  $sublistIndex should
           be an array position that's otherwise unused.


=cut
sub new {
    my ($class, $start, $end, $sublistIndex, $features) = @_;

    # my @features = sort {
    #     if ($a->[$start] != $b->[$start]) {
    #         $a->[$start] - $b->[$start];
    #     } else {
    #         $b->[$end] - $a->[$end];
    #     }
    # } @$featList;

    #@sublistStack is a list of all the currently relevant sublists
    #(one for each level of nesting)
    my @sublistStack;
    #$curlist is the currently active sublist
    my $curList = [];

    my $self = { 'topList' => $curList,
		 'sublistIndex' => $sublistIndex,
	         'count' => $#{$features} + 1};
    bless $self, $class;

    push @$curList, $features->[0];

    my ($topSublist, $i);
    my $lastStart = $features->[0]->[$start];
    my $lastEnd = $features->[0]->[$end];

    for ($i = 1; $i <= $#{$features}; $i++) {
        die "input not sorted: got start $lastStart before " . $features->[$i]->[$start]
            if $lastStart > $features->[$i]->[$start];
        die "input not sorted: got $lastStart .. $lastEnd before " . $features->[$i]->[$start] . " .. " . $features->[$i]->[$end]
            if (($lastStart == $features->[$i]->[$start])
                &&
                ($lastEnd < $features->[$i]->[$end]));

        $lastStart = $features->[$i]->[$start];
        $lastEnd = $features->[$i]->[$end];

	#if this interval is contained in the previous interval,
	if ($features->[$i]->[$end] < $features->[$i - 1]->[$end]) {
	    #create a new sublist starting with this interval
	    push @sublistStack, $curList;
	    $curList = [$features->[$i]];
	    $features->[$i - 1]->[$sublistIndex] = $curList;
	} else {
	    #find the right sublist for this interval
	    while (1) {
                #if we're at the top level list,
		if ($#sublistStack < 0) {
                    #just add the current feature
		    push @$curList, $features->[$i];
		    last;
		} else {
		    $topSublist = $sublistStack[$#sublistStack];
                    #if the last interval in the top sublist ends
                    #after the end of the current interval,
		    if ($topSublist->[$#{$topSublist}]->[$end] 
                        > $features->[$i]->[$end]) {
			#then curList is the first (deepest) sublist
                        #that the current feature fits into, and
                        #we add the current feature to curList
			push @$curList, $features->[$i];
			last;
		    } else {
                        #move on to the next shallower sublist
			$curList = pop @sublistStack;
		    }
		}
	    }
	}
    }

    return $self;
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
