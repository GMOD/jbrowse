=head1 NAME

LazyPatricia - a lazy PATRICIA tree

=head1 SYNOPSIS

  my $trie = LazyPatricia::create({abc=>0, abcd=>1, abce=>2,abfoo=>3});
  use JSON 2;
  print JSON::to_json($trie, {pretty=>1});

=head1 DESCRIPTION

This class is a map where the keys are strings.  The map supports fast
queries by key string prefix ("show me all the values for keys that
start with "abc").  It also supports lazily loading subtrees.

Each edge is labeled with a substring of a key string.

Each node in the tree has one or more children, each of which
represents a potential completion of the string formed by
concatenating all of the edge strings from that node up to the root.

Nodes also have zero or one data items.

Leaves have zero or one data items.

Each loaded node is an array:

Element 0 is the edge string; element 1 is the data item, or undefined
if there is none; any further elements are the child nodes, sorted
lexicographically by their edge string

Each lazy node is just the edge string for the edge leading to the
lazy node.  when the lazy node is loaded, the string gets replaced
with a loaded node array; lazy nodes and loaded nodes can be
distinguished by:

  "string" == typeof loaded_node[0]
  "number" == typeof lazy_node[0]

e.g., for the mappings:

  abc   => 0
  abcd  => 1
  abce  => "baz"
  abfoo => [3, 4]
  abbar (subtree to be loaded lazily)

the structure is:

  [, , ["ab", ,
       "bar",
       ["c", 0, ["d", 1],
        ["e", "baz"]],
       ["foo", [3, 4]]
       ]
  ]

The main goals for this structure were to minimize the JSON size on
the wire (so, no type tags in the JSON to distinguish loaded nodes,
lazy nodes, and leaves) while supporting lazy loading and reasonably
fast lookups.

=cut

package LazyPatricia;

use strict;
use warnings;

# the code below assumes that EDGESTRING is 0 and that
# SUBLIST is the highest-numbered of these constants
use constant EDGESTRING => 0;
use constant VALUE => 1;
use constant SUBLIST => 2;

use Devel::Size qw( total_size );

=head2 create( \%mappings )

takes: a hash reference containing the mappings to put into the trie

returns: trie structure described above

=cut

sub create {
    my ($mappings) = @_;
    my $tree = [];
    $tree->[EDGESTRING]="";

    my @keys = sort keys %$mappings;

    my @path = ($tree);
    my $curNode;
    # create one-char-per-node trie
    foreach my $key (@keys) {
        for (my $i = 1; $i <= length($key); $i++) {
            if ($i < scalar(@path)) {
                # if this key shares a prefix up to $i with previous keys,
                # go to next $i
                next if substr($key, $i - 1, 1) eq $path[$i][EDGESTRING];
                # if we get here, we know that this key differs from
                # previous keys at $i, so we chop everything from $i
                # onward from @path
                @path = @path[0..($i - 1)];
            }

            # now we add new elements onto @path for the current key
            $curNode = [substr($key, $i - 1, 1)];
            if (scalar(@{$path[-1]}) <= SUBLIST) {
                $path[-1][SUBLIST] = $curNode; # first sublist for this prefix
            } else {
                push @{$path[-1]}, $curNode; # add to existing sublists
                # since the keys are sorted, this means that the sublists
                # will also be sorted
            }
            push @path, $curNode;
        }
        $path[length($key)][VALUE] = $mappings->{$key};
    }

    # Merge single-child nodes to make PATRICIA trie.
    #   This might not be the fastest way to make a PATRICIA trie,
    #   but at the moment it seems like the simplest.
    for (my $i = SUBLIST; $i < scalar(@$tree); $i++) {
        mergeNodes($tree->[$i]);
    }

    #bless $tree, $class;
    return $tree;
}

sub mergeNodes {
    my $parent = shift;
    # if the parent has no children, return
    return if (SUBLIST >= scalar(@$parent));
    # if the parent has exactly one child and no value
    if (((SUBLIST + 1) == scalar(@$parent)) && (!defined $parent->[VALUE])) {
        # merge the child with the parent
        $parent->[EDGESTRING] .= $parent->[SUBLIST]->[EDGESTRING];
        my @mergeList = @{$parent->[SUBLIST]}[1..$#{$parent->[SUBLIST]}];
        splice @$parent, 1, scalar(@$parent) - 1, @mergeList;
        mergeNodes($parent);
    } else {
        # try to merge sub nodes
        for (my $i = SUBLIST; $i < scalar(@$parent); $i++) {
            mergeNodes($parent->[$i]);
        }
    }
}

sub partition {
    my ($parent, $prefix, $threshold, $callback) = @_;

    # $total is the number of data items in the subtree rooted at $parent
    # $thisChunk is $total minus the number of data items that have been
    #   split out into separate lazy-load sub-chunks.
    my $total = 0;
    my $thisChunk = 0;
    if( defined $parent->[VALUE] ) {
        my $vsize = total_size( $parent->[VALUE] );
        $total += $vsize;
        $thisChunk += $vsize;
    }
    for (my $i = SUBLIST; $i < scalar(@$parent); $i++) {
        if( defined $parent->[$i]->[VALUE] ) {
            my $vsize = total_size( $parent->[$i]->[VALUE] );
            $total += $vsize;
            $thisChunk += $vsize;
        }
        if (defined $parent->[$i]->[SUBLIST]) {
            my ($subTotal, $subPartial) =
              partition($parent->[$i],
                        $prefix . $parent->[$i][EDGESTRING],
                        $threshold,
                        $callback);
            $total += $subTotal;
            $thisChunk += $subPartial;
        }
    }
    if (($thisChunk > $threshold) && ($prefix ne "")) {
        $callback->($parent, $prefix, $thisChunk, $total);
        $thisChunk = 0;

        # prune subtree from its parent
        $parent->[1] = $parent->[0];
        $parent->[0] = int($total);
        $#{$parent} = 1;
    }
    return ($total, $thisChunk);
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
