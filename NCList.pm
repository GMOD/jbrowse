#After
#Alekseyenko, A., and Lee, C. (2007).
#Nested Containment List (NCList): A new algorithm for accelerating
#   interval query of genome alignment and interval databases.
#Bioinformatics, doi:10.1093/bioinformatics/btl647
#http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

package NCList;

use strict;
use warnings;

use constant SUBLIST => "sublist";

sub new {
    my ($class, $sublistIndex, @features) = @_;

    @features = sort {
	if ($a->start != $b->start) {
	    $a->start - $b->start;
	} else {
	    $b->end - $a->end;
	}
    } @features;

    #@sublistStack is a list of all the currently relevant sublists
    #(one for each level of nesting)
    my @sublistStack;
    #$curlist is the currently active sublist
    my $curList = [];

    my $self = { 'topList' => $curList,
		 'sublistIndex' => $sublistIndex,
	         'count' => $#features + 1};
    bless $self, $class;

    push @$curList, $features[0];

    my ($topSublist, $i);

    for ($i = 1; $i <= $#features; $i++) {
	#if this interval is contained in the previous interval,
	if ($features[$i]->end < $features[$i - 1]->end) {
	    #create a new sublist starting with this interval
	    push @sublistStack, $curList;
	    $curList = [$features[$i]];
	    $features[$i - 1]->{SUBLIST} = $curList;
	} else {
	    #find the right sublist for this interval
	    while (1) {
		if ($#sublistStack < 0) {
		    push @$curList, $features[$i];
		    last;
		} else {
		    $topSublist = $sublistStack[$#sublistStack];
		    if ($topSublist->[$#{$topSublist}]->end > $features[$i]->end) {
			#curList is the first (deepest) sublist that
			#the current feature fits into
			push @$curList, $features[$i];
			last;
		    } else {
			$curList = pop @sublistStack;
		    }
		}
	    }
	}
    }

    return $self;
}

sub flattenList {
    my ($self, $map, $list) = @_;
    return [map {$self->flattenFeat($map, $_)} @$list];
}

sub flattenFeat {
    my ($self, $map, $feat) = @_;
    my $flatten = sub {$self->flattenList($map, \@_)};
    my $result = [map {&$_($feat, $flatten)} @$map];
    if (defined ($feat->{SUBLIST})) {
	$result->[$self->{'sublistIndex'}] =
	  $self->flattenList($map, $feat->{SUBLIST});
    }
    return $result;
}

sub flatten {
    my ($self, @map) = @_;
    return $self->flattenList(\@map, $self->{'topList'});
}

1;
