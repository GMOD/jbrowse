# Implements a lazy PATRICIA tree.

# This class is a map where the keys are strings.  The map supports fast
# queries by key string prefix ("show me all the values for keys that
# start with "abc").  It also supports lazily loading subtrees.

# Each edge is labeled with a substring of a key string.
# Each node in the tree has one or more children, each of which represents
#   a potential completion of the string formed by concatenating all of the
#   edge strings from that node up to the root.
#   Nodes also have zero or one data items.
# Leaves have zero or one data items.

# Each loaded node is an array.
#   element 0 is the edge string;
#   element 1 is the data item, or undefined if there is none;
#   any further elements are the child nodes, sorted lexicographically
#     by their edge string

# Each lazy node is just the edge string for the edge leading to the lazy node.
#   when the lazy node is loaded, the string gets replaced with a loaded
#   node array; lazy nodes and loaded nodes can be distinguished by:
#   "string" == typeof lazy_node
#   "object" == typeof loaded_node

# e.g., for the mappings:
#   abc   => 0
#   abcd  => 1
#   abce  => "baz"
#   abfoo => [3, 4]
#   abbar (subtree to be loaded lazily)

# the structure is:

# [, , ["ab", ,
#       "bar",
#       ["c", 0, ["d", 1],
#        ["e", "baz"]],
#       ["foo", [3, 4]]
#       ]
#  ]

# The main goals for this structure were to minimize the JSON size on
# the wire (so, no type tags in the JSON to distinguish loaded nodes,
# lazy nodes, and leaves) while supporting lazy loading and reasonably
# fast lookups.

package LazyPatricia;

use strict;
use warnings;

# the code below assumes that EDGESTRING is 0 and that
# SUBLIST is the highest-numbered of these constants
use constant EDGESTRING => 0;
use constant VALUE => 1;
use constant SUBLIST => 2;

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
            next if substr($key, $i - 1, 1) eq $path[$i][EDGESTRING];
            @path = @path[0..($i - 1)] if ($i < scalar(@path));

            $curNode = [substr($key, $i - 1, 1)];
            if (scalar(@{$path[-1]}) <= SUBLIST) {
                $path[-1][SUBLIST] = $curNode;
            } else {
                push @{$path[-1]}, $curNode;
            }
            push @path, $curNode;
        }
        $path[length($key)][VALUE] = $mappings->{$key};
    }

    # merge single-child nodes to make PATRICIA trie
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

1;
