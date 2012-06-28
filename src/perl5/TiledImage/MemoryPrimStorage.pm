package MemoryPrimStorage;

use strict;
use GD::Image;
use Carp;

BEGIN {
    foreach my $field (qw(width height n_primitives globalPrims perTilePrims tileWidthHint verbose)) {
	no strict "refs";
	*$field = sub {
	    my $self = shift;
	    $self->{$field} = shift if @_;
	    return $self->{$field};
	}
    }
}

sub GDDeletePrimitives {
    my ($self) = @_;
    $self->{'globalPrims'} = [];
    $self->{'perTilePrims'} = [];
}

# return the render tiles that overlap with the
# given bounding box.
sub tilesForBounds {
    my ($self, @bb) = @_;
    my $first = int($bb[0] / $self->tileWidthHint);
    my $last = int($bb[2] / $self->tileWidthHint);
    return ($first .. $last);
}

sub GDRecordPrimitive {
    my ($self, $sub, $subargs, @bb) = @_;

    my $command_order = $self->n_primitives ($self->n_primitives + 1);
    my $prim = [$command_order, $sub, @$subargs];
    if (@bb) {
	# add the current primitive to the perTilePrims
	# array for each of the rendering tiles that
	# overlap with the bouding box.
	foreach my $tile ($self->tilesForBounds(@bb)) {
	    push @{$self->perTilePrims->[$tile]}, $prim;
	}
    } else {
	push @{$self->globalPrims}, $prim;
    }
}

sub GDEraseLeftmostPrimitives {
    my ($self, $x) = @_;
    my @tiles = 0..($x / $self->{'tileWidthHint'});
    print "deleting prims for tiles @tiles\n" if $self->{'verbose'};
    foreach my $tile (@tiles) {
	#$self->{'globalPrims'}->[$tile] = undef;
	$self->{'perTilePrims'}->[$tile] = undef;
    }
}

# The following two methods for querying tables of GD primitives both
# return a coderef that's an iterator over (command_order, command) pairs
sub GDGetGlobalPrimitives {
    my ($self) = @_;
    return @{$self->globalPrims};
}

sub GDGetBoundedPrimitives {
    my ($self, @bb) = @_;

    # It's theoretically possible that the bounding box
    # will overlap more than one tile, but if
    # renderTileRange is driving things then there will
    # only ever be one.
    my @tiles = $self->tilesForBounds(@bb);

    # remove empty lists
    my @primLists = grep { $#{$_} > -1 } @{$self->perTilePrims}[@tiles];

    # return flattened list of primitives
    return (map { @{$_} } @primLists);
}

# these next two are part of the primitive storage interface
# but the MemoryPrimStorage class doesn't need them.
sub perTileCleanup {
}

sub cleanup {
}

sub new {
    my ($class, %args) = @_;

    my $width = $args{'-width'};
    my $height = $args{'-height'};
    my $tileWidthHint = $args{'-tile_width_hint'} || 1000;
    my $lastTile = int($width / $tileWidthHint);
    my $verbose = $args{'-verbose'};

    print "tileWidthHint: $tileWidthHint, lastTile: $lastTile\n" if $verbose;

    my $self = { 
	'width' => $width,
	'height' => $height,

	# $self->globalPrims is a ref to an array of
	# primitives, where each primitive is a
	# ($command_order, $sub, @args) array.
	'globalPrims' => [],

	# $self->perTilePrims is a ref to an array
	# of arrays of primitives, with one array
	# of primitives per tile.
	'perTilePrims' => [],

	'tileWidthHint' => $tileWidthHint,

	'n_primitives' => 0,
	
	'verbose' => $verbose,
    };

    # bless it, and add to global table
    bless $self, $class;

    return $self;
}

1;
