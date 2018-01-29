package TiledImage;

=head1 NAME

TiledImage.pm - Perl module to provide a GD-like interface for rendering large images then breaking them into tiles.

=head1 SYNOPSIS

      # create a new image
      my $im = new TiledImage('-width'=>100,'-height'=>100);
      $im->verbose(2);
      
      # allocate some colors
      my $white = $im->colorAllocate(255,255,255);
      my $black = $im->colorAllocate(0,0,0);
      my $red = $im->colorAllocate(255,0,0);
      my $blue = $im->colorAllocate(0,0,255);
      
      # make the background transparent and interlaced
      $im->transparent($white);
      $im->interlaced('true');
      
      # Put a black frame around the picture
      $im->rectangle(0,0,99,99,$black);
      
      # Draw a blue oval
      $im->arc(50,50,95,75,0,360,$blue);
      
      # draw a polygon
      my $poly = GD::Polygon->new;
      $poly->addPt(15,15);
      $poly->addPt(85,15);
      $poly->addPt(50,85);
      $im->filledPolygon ($poly, $red);
      
      # draw strings
      $im->string(GD::gdLargeFont, 10, 10, "hi world", $blue);
      
      # create a dummy brush image & call setBrush() & copy() to test image storage
      my $dummyBrush = new GD::Image (20,20);
      my $white2 = $dummyBrush->colorAllocate(255,255,255);
      my $black2 = $dummyBrush->colorAllocate(0,0,0);
      my $red2 = $dummyBrush->colorAllocate(255,0,0);
      my $blue2 = $dummyBrush->colorAllocate(0,0,255);
      $dummyBrush->transparent($white2);
      $dummyBrush->interlaced('true');
      $dummyBrush->filledRectangle(4,4,16,16,$black2);
      $dummyBrush->arc(10,10,8,8,0,360,$blue2);
      
      $im->setBrush ($dummyBrush);
      $im->line (40, 30, 90, 80, GD::gdBrushed);   # libgd bug: lines are clipped
      $im->copy ($dummyBrush, 75, 40, 0, 0, 20, 20);
      
      # render and save four tiles
      my ($tileWidth, $tileHeight) = (50, 50);
      for ($x = 0; $x < $im->width; $x += $tileWidth) {
          for ($y = 0; $y < $im->height; $y += $tileHeight) {
              my $tile = $im->renderTile ($x, $y, $tileWidth, $tileHeight);
              my $file = "TILE.$x.$y.png";
              open TILE, ">$file" or die "Couldn't write $file: $!";
              print TILE $tile->png;
              close TILE or die "Couldn't close $file: $!";
              warn "Wrote tile to $file";
          }
      }

=head1 METHODS

=cut

use GD::Image;
use Carp;
use TiledImage::MemoryPrimStorage;
# "use TiledImage::DBPrimStorage" commented out because it is imported lazily via an "eval" statement below
# use TiledImage::DBPrimStorage;

# Global table of TiledImage's for cleanup
my %tiledImageCleanup;

# Private methods.
# Code to do (X,Y)-translation for various different intercepted subroutines.
# subroutine to generate a closure that translates an argument list
sub makeGDPrimitiveArglistTranslator {
    my @xyIndexList = @_;
    return sub {
	my ($self, $xstart, $ystart, @arglist) = @_;
	foreach my $xyIndex (@xyIndexList) {
	    $arglist[$$xyIndex[0]] -= $xstart;
	    $arglist[$$xyIndex[1]] -= $ystart;
	}
	return @arglist;
    }
}

# polygon translator
sub GDPolygonTranslate {
    my ($self, $xstart, $ystart, $poly, @arglist) = @_;

    my $translatedPoly = new GD::Polygon;
    foreach my $xy (@{$poly->{'points'}}) {
	$translatedPoly->addPt ($$xy[0] - $xstart, $$xy[1] - $ystart);
    }

    return ($translatedPoly, @arglist);
}

# translators
my $copyTranslate = makeGDPrimitiveArglistTranslator ([1,2]);
my $stringTranslate = makeGDPrimitiveArglistTranslator ([1,2]);
my $stringFTTranslate = makeGDPrimitiveArglistTranslator ([4,5]);
my $xyTranslate = makeGDPrimitiveArglistTranslator ([0,1]);
my $xyxyTranslate = makeGDPrimitiveArglistTranslator ([0,1], [2,3]);

# Code to get the (xmin,ymin,xmax,ymax) bounding-box for intercepted subroutines.
# bounding box getters
sub GDPixelBounds { my ($self, $x, $y) = @_; return ($x, $y, $x+1, $y+1) }
sub GDLineBounds { my ($self, $x1, $y1, $x2, $y2, $col) = @_; return (min($x1,$x2), min($y1,$y2), max($x1,$x2), max($y1,$y2)); }
sub GDPolygonBounds { my ($self, $poly) = @_; return $poly->bounds() }
sub GDEllipseBounds { my ($self, $x, $y, $w, $h) = @_; return ($x-$w, $y-$h, $x+$w, $y+$h) }  # is this twice as big as it should be?
sub GDCopyBounds { my ($self, $im, $destx, $desty, $srcx, $srcy, $w, $h) = @_; return ($destx, $desty, $destx+$w-1, $desty+$h-1) }
sub GDStringBounds { my ($self, $font, $x, $y, $text) = @_; return ($x, $y, $x + length($text)*$font->width, $y + $font->height) }
sub GDStringUpBounds { my ($self, $font, $x, $y, $text) = @_; return ($x, $y, $x + $font->width, $y + length($text)*$font->height) }
sub GDStringFTBounds { my ($self, @args) = @_; my @bb = $self->im->stringFT (@args); return @bb ? @bb[0,1,4,5] : () }

# min & max of a list
sub min {
    my ($x, @y) = @_;
    foreach my $y (@y) {
	$x = $y if $y < $x;
    }
    return $x;
}

sub max {
    my ($x, @y) = @_;
    foreach my $y (@y) {
	$x = $y if $y > $x;
    }
    return $x;
}


# The %intercept hash: a function intercept table.
# Each value is a reference to a hash of references to interception subroutines.
# Possible interception subroutines:
#  'translator'
#  'boundsGetter'
#  'imageStorer'
#  'imageRetriever'
my %intercept =
    ('setPixel' => {'translator' => $xyTranslate, 'boundsGetter' => \&GDPixelBounds},

     'line' => {'translator' => $xyxyTranslate, 'boundsGetter' => \&GDLineBounds},
     'dashedLine' => {'translator' => $xyxyTranslate, 'boundsGetter' => \&GDLineBounds},

     'rectangle' => {'translator' => $xyxyTranslate, 'boundsGetter' => \&GDLineBounds},
     'filledRectangle' => {'translator' => $xyxyTranslate, 'boundsGetter' => \&GDLineBounds},

     'polygon' => {'translator' => \&GDPolygonTranslate, 'boundsGetter' => \&GDPolygonBounds},  # [AVU 12/5/05] added line for bugfix
     'openPolygon' => {'translator' => \&GDPolygonTranslate, 'boundsGetter' => \&GDPolygonBounds},
     'unclosedPolygon' => {'translator' => \&GDPolygonTranslate, 'boundsGetter' => \&GDPolygonBounds},
     'filledPolygon' => {'translator' => \&GDPolygonTranslate, 'boundsGetter' => \&GDPolygonBounds},
     'fillPoly' => {'translator' => \&GDPolygonTranslate, 'boundsGetter' => \&GDPolygonBounds},

     'ellipse' => {'translator' => $xyTranslate, 'boundsGetter' => \&GDEllipseBounds},
     'filledEllipse' => {'translator' => $xyTranslate, 'boundsGetter' => \&GDEllipseBounds},
     'arc' => {'translator' => $xyTranslate, 'boundsGetter' => \&GDEllipseBounds},
     'filledArc' => {'translator' => $xyTranslate, 'boundsGetter' => \&GDEllipseBounds},

     'copy' => {'translator' => $copyTranslate, 'boundsGetter' => \&GDCopyBounds},
     'copyMerge' => {'translator' => $copyTranslate, 'boundsGetter' => \&GDCopyBounds},
     'copyMergeGray' => {'translator' => $copyTranslate, 'boundsGetter' => \&GDCopyBounds},
     'copyResized' => {'translator' => $copyTranslate, 'boundsGetter' => \&GDCopyBounds},
     'copyResampled' => {'translator' => $copyTranslate, 'boundsGetter' => \&GDCopyBounds},
     'copyRotated' => {'translator' => $copyTranslate, 'boundsGetter' => \&GDCopyBounds},

     'string' => {'translator' => $stringTranslate, 'boundsGetter' => \&GDStringBounds},
     'stringUp' => {'translator' => $stringTranslate, 'boundsGetter' => \&GDStringUpBounds},
     'char' => {'translator' => $stringTranslate, 'boundsGetter' => \&GDStringBounds},
     'charUp' => {'translator' => $stringTranslate, 'boundsGetter' => \&GDStringUpBounds},

     'stringFT' => {'translator' => $stringFTTranslate, 'boundsGetter' => \&GDStringFTBounds},
     'stringFTcircle' => {'translator' => $stringFTTranslate, 'boundsGetter' => \&GDStringFTBounds},

    );

@globalPrimNames = qw(colorAllocate rgb setBrush setThickness);

# List of unimplemented functions:-- these will throw an error if called
# (all others are silently passed to a dummy GD object)
my %unimplemented = map (($_=>1),
			 qw (copyRotate90 copyRotate180 copyRotate270
			     copyFlipHorizontal copyFlipVertical copyTranspose
			     copyReverseTranspose rotate180
			     flipHorizontal flipVertical
			     fill fillToBorder));

sub getBounds {
    my ($self) = @_;
    return ($self->width, $self->height);
}

foreach my $sub (sort keys %intercept) {
    no strict "refs";
    *$sub = sub  {
	my ($self, @args) = @_;
	
	# check for intercept: if so, get bounding box & store any images
	my @bb = $self->getBoundingBox ($sub, @args);
	
	# update global bounding box
	if (@bb) {
	    $self->xmin ($bb[0]) if !defined ($self->xmin) || $bb[0] < $self->xmin;
	    $self->ymin ($bb[1]) if !defined ($self->ymin) || $bb[1] < $self->ymin;
	    $self->xmax ($bb[2]) if !defined ($self->xmax) || $bb[2] >= $self->xmax;
	    $self->ymax ($bb[3]) if !defined ($self->ymax) || $bb[3] >= $self->ymax;
	}
	
	# record primitive
	$self->primstorage->GDRecordPrimitive ($sub, \@args, @bb);
	
	# log primitive
	warn "Recorded $sub (@args) with ", (@bb>0 ? "bounding box (@bb)" : "no bounding box"), "\n" if $self->verbose == 2;
    }
}

foreach my $sub (@globalPrimNames) {
    no strict "refs";
    *$sub = sub  {
	my ($self, @args) = @_;

	# record primitive
	$self->primstorage->GDRecordPrimitive ($sub, \@args);

	# log primitive
	warn "Recorded global primitive $sub (@args)\n" if $self->verbose == 2;

	# delegate
	$self->im->$sub (@args);
    }
}

foreach my $sub (sort keys %unimplemented) {
    no strict "refs";
    *$sub = sub {
	croak "Subroutine $sub unimplemented";
    }
}

foreach my $field (qw(im width height xmin xmax ymin ymax verbose persistent primstorage)) {
    *$field = sub {
	my $self = shift;
	$self->{$field} = shift if @_;
	return $self->{$field};
    }
}

# Subroutine interceptions.
# Each of the following can take a ($subroutine, @argument_list) array,
# representing a call to a GD::Image object, $im, of the form $im->$subroutine (@argument_list).

# $self->intercepts ($subroutine)
# returns true if this TiledImage object intercepts the named subroutine
# (i.e. it has an entry in the %intercept hash).
sub intercepts {
    my ($self, $sub) = @_;
    return exists $intercept{$sub};
}

# $self->translate ($xOrigin, $yOrigin, $subroutine, @argument_list)
# "translates" all (X,Y)-coordinates in the argument list of the named subroutine,
# offsetting them relative to the specified (X,Y) origin.
# Control is dispatched to a "translator" via the %intercept hash.
sub translate {
    my ($self, $xstart, $ystart, $sub, @args) = @_;
    my $translator = $intercept{$sub}->{'translator'};
    return defined($translator) ? &$translator ($self, $xstart, $ystart, @args) : @args;
}

# $self->getBoundingBox ($subroutine, @argument_list)
# returns the (xMin,yMin,xMax,yMax) bounding box for the named subroutine
# with the given argument list.
# Control is dispatched to a "bounding-box getter" via the %intercept hash.
sub getBoundingBox {
    my ($self, $sub, @args) = @_;
    my $boundsGetter = $intercept{$sub}->{'boundsGetter'};
    return defined($boundsGetter) ? &$boundsGetter ($self, @args) : ();
}

# Special-case interceptions of specific GD::Image methods
# intercept clone
sub clone {
    my ($self) = @_;
    my $clone = {%$self};
    bless $clone, ref ($self);
    $clone->im ($self->im->clone);
    return $clone;
}

# hackily intercept getPixel
sub getPixel {
    my ($self, $x, $y) = @_;
    my $im = $self->renderTile ($x, $y, 1, 1);
    return $im->getPixel (0, 0);
}

# apparently some glyphs call this subroutine to see if a drawing method has
# been implemented in the version of BioPerl at hand (a backward compatability
# check), so we must intercept immediately instead of storing in database
sub can {
    my ($self, $method_name) = @_;
    #warn "CHECKING FOR $method_name IN can()...\n"; #D!!!
    return $self->intercepts($method_name);
}

# AUTOLOAD method: catches all methods by default
sub AUTOLOAD {
    my ($self, @args) = @_;

    # get subroutine name
    my $sub = our $AUTOLOAD;
    $sub =~ s/.*:://;

    # check for DESTROY
    return if $sub eq "DESTROY";

    warn "unhandled sub $sub";

    # record primitive
    # we don't need to worry about the bounding box here because
    # all of the primitives with bounding boxes are handled above.
    $self->primstorage->GDRecordPrimitive ($sub, \@args);

    # delegate
    $self->im->$sub (@args);
}

# This needs to be called manually to cleanup and disconnect from database after done with the object;
# otherwise, database connections remain open and clog database until instantiating script exits
#
sub finish {
    my $self = shift;
    $self->cleanup;
    # there was stuff here, but now it is gone... call 'cleanup' directly? !!!
}

# Destructor - TEMPORARILY (?) DISABLED due to DBI connectivity problems, destruction is now the responsibility of the caller
#sub DESTROY {
#    my ($self) = @_;
#    warn "TiledImage.pm IS CLEANING UP AND DISCONNECTING FROM DATABASE in destructor...\n" if $self->verbose;
#    $self->cleanup;
#    $self->gdtile->disconnect if $self->gdtile;  #  just in case we didn't close the database connection using finish() 
#}


# Public methods.

=head2 new

    my $tiledImage = new TiledImage (%args);

Creates a new TiledImage object.

%args is a key-value hash with the following keys:

=over 2

=item B<-width>: image width in pixels

=item B<-height>: image height in pixels

=item B<-tile_width_hint>: for optimal performance, set this equal to the tile width

=item B<-verbose>: print lots of debugging information

=item B<link>: flag indicating whether to use filesystem links to repeat identical tiles. True by default; set to zero to disable this feature

=item B<-primdb>: use a database to cache GD primitives, rather than storing them in memory (see TiledImage/gdtile.sql for SQL commands to create the database)

=item B<-tiledimage_name>: unique identifier for this TiledImage. mandatory if B<-primdb> is used

=item B<-persistent>: when used with B<-primdb>, do not delete primitives from database after rendering tiles

=back

=cut

# Constructor
sub new {
    my ($class, %args) = @_;
    my %allowed_args = map {$_ => 1} qw (-primdb -tiledimage_name -width -height -persistent -verbose -tile_width_hint);
    my @required_args;
    if (exists $args{'-primdb'}) {
        push @required_args, '-tiledimage_name';
    } else {
        $allowed_args{'-tiledimage_name'} = 1;
    }

    foreach my $arg (sort keys %args) {
      unless ($allowed_args{$arg}) {
	croak ("You specified an invalid arg ($arg) to TiledImage constructor (you passed in: ",
	       join (' ', map { $_ . '=>' . $args{$_} } sort keys %args), ")");
      }
    }

    foreach my $arg (@required_args) {
      unless (defined $args{$arg}) {
	croak ("You did not specify a required arg ($arg) to TiledImage constructor (you passed in: ",
	       join (' ', map { $_ . '=>' . $args{$_} } sort keys %args), ")");
      }
    }

    my ($persistent, $verbose) = (1, 0);  # defaults
    $verbose    = $args{'-verbose'}    if exists $args{'-verbose'} ;
    $persistent = $args{'-persistent'} if exists $args{'-persistent'};

    my $primstorage;
    if ($args{'-primdb'}) {
	eval "use TiledImage::DBPrimStorage";   # import DBPrimStorage here, rather than at top of file, so TiledImage.pm will still work even if DBI.pm is unavailable
	$primstorage = DBPrimStorage->new(
            -primdb => $args{'-primdb'},
	    -tiledimage_name => $args{'-tiledimage_name'},
	    -width => $args{'-width'} || '',
	    -height => $args{'-height'} || '',
	    -verbose => $verbose);
    } else {
	$primstorage = MemoryPrimStorage->new(
	    -width => $args{-width}, -height => $args{-height},
	    -tile_width_hint => $args{'-tile_width_hint'} || 1000,
	    -verbose => $verbose);
    }

    # create dummy GD image
    my $im = GD::Image->new (1, 1);

    # create the proxy object
    my $self = { 'im' => $im,

		 'xmin' => undef,
		 'xmax' => undef,
		 'ymin' => undef,
		 'ymax' => undef,

		 'width' => $primstorage->{width},
		 'height' => $primstorage->{height},

		 'verbose' => $verbose,
		 'persistent' => $persistent,

		 'primstorage' => $primstorage,
	     };

    # bless it, and add to global table
    bless $self, $class;
    $tiledImageCleanup{$self} = 1;

    # return
    return $self;
}

=head2 renderTile

    my $gdImage = $tiledImage->renderTile ($xmin, $ymin, $width, $height);

Returns the specified area as a GD::Image object.

=cut

# renderTile:--
# method to render a tile of given dimensions.
sub renderTile {
    my ($self, $xmin, $ymin, $width, $height) = @_;
    my ($xmax, $ymax) = ($xmin + $width - 1, $ymin + $height - 1);

    # print message
    warn "\nRendering tile ($xmin,$ymin)+($width,$height)\n" if $self->verbose == 2;

    # create GD image
    my $im = GD::Image->new ($width, $height);

    my @prims = ($self->primstorage->GDGetGlobalPrimitives,
		 $self->primstorage->GDGetBoundedPrimitives($xmin, $ymin,
							    $xmax, $ymax));

    # sort by command_order
    @prims = sort { $a->[0] <=> $b->[0] } @prims;

    my $prev_command = -1;
    foreach my $primitive (@prims) {
	my ($command_order, $sub, @args) = @{$primitive};

	# GDGetBoundedPrimitives might in some cases
	# return more than one copy of the same
	# primitive; here we ignore repeated
	# primitives.
	next if $command_order == $prev_command;
	$prev_command = $command_order;

	if ($self->intercepts ($sub)) {
	    @args = $self->translate ($xmin, $ymin, $sub, @args);
	}

	warn "Replaying $sub (@args)\n" if $self->verbose == 2;

	$im->$sub (@args);
    }

    $self->primstorage->perTileCleanup();

    # return
    return $im;
}

=head2 cleanup

    $tiledImage->cleanup();

Call this after rendering all tiles, to allow the TiledImage object to perform cleanup operations (e.g. removing primitives from the database).

=cut

sub cleanup {
    my $self = shift;

    # use explicit hashrefs instead of AUTOLOAD'ed accessors,
    # so that this method can be called by the signal handlers
    if ($self->{'persistent'} == 0) {
	warn "Deleting primitives from database\n";
	$self->primstorage->GDDeletePrimitives;
    }

    $self->primstorage->cleanup();

    # drop from cleanup list
    delete $tiledImageCleanup{$self} if exists $tiledImageCleanup{$self};
}



=head2 Intercepted GD::Image methods

The following methods of B<GD::Image> methods have analogous implementations in TiledImage:

=over 2

=item setPixel

=item line

=item dashedLine

=item rectangle

=item filledRectangle

=item polygon

=item openPolygon

=item unclosedPolygon

=item filledPolygon

=item fillPoly

=item ellipse

=item filledEllipse

=item arc

=item filledArc

=item copy

=item copyMerge

=item copyMergeGray

=item copyResized

=item copyResampled

=item copyRotated

=item string

=item stringUp

=item char

=item charUp

=item stringFT

=item stringFTcircle

=item colorAllocate

=item rgb

=item setBrush

=item setThickness

=back

=head2 Unimplemented GD::Image methods

The following GD::Image methods are B<not> implemented by TiledImage:

=over

=item copyRotate90

=item copyRotate180

=item copyRotate270
			    
=item copyFlipHorizontal

=item copyFlipVertical

=item copyTranspose
			     
=item copyReverseTranspose

=item rotate180
			    
=item flipHorizontal

=item flipVertical
			    
=item fill

=item fillToBorder

=back

=cut


# THERE IS CLEARLY A PROBLEM WITH THESE SIGNAL HANDLERS, SO I'M TAKING THEM
# OUT AND PLACING THE HANDLER IN 'generate_tiles.pl' - it will be the
# responsibility of the instantiating script to clean up and disconnect! [AVU 2/4/06] !!!

# global_cleanup
# method to call cleanup on all existing TiledImage's
#sub global_cleanup {
#    warn "in global_cleanup";
#    my @tiledImage = keys %tiledImageCleanup;
#    foreach my $tiledImage (@tiledImage) {
#	cleanup ($tiledImage);
#    }
#}

# signal handlers
#my $oldSigInt = $SIG{'INT'};
#$SIG{'INT'} = sub {
#    warn "caught SIG{INT}"; #D!!!
#    foreach my $tiledImage (keys %tiledImageCleanup) {  # if program was interrupted, we should clean up database
#	 $tiledImage->{'persistent'} = 0;               # entries made so far, no matter what the user specified
#    }
#    global_cleanup();
#    &$oldSigInt() if defined $oldSigInt;
#};

#my $oldSigKill = $SIG{'KILL'};
#$SIG{'KILL'} = sub {
#    warn "caught SIG{KILL}"; #D!!!
#    foreach my $tiledImage (keys %tiledImageCleanup) {  # if program was interrupted, we should clean up database
#	$tiledImage->{'persistent'} = 0;               # entries made so far, no matter what the user specified
#    }
#    global_cleanup();
#    &$oldSigKill() if defined $oldSigKill;
#};


=head1 AUTHORS

Andrew Uzilov E<lt>andrew.uzilov@gmail.comE<gt>

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Ian Holmes E<lt>ihh@berkeley.eduE<gt>

Copyright (c) 2007-2010 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut


# End of package
1;
