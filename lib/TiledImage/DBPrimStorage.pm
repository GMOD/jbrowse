package DBPrimStorage;

# TODO:
# - doesn't clean up 'image' table when 'persistent' set to off, but should

use strict;
use Data::Dumper;
use DBI;
use Carp;

BEGIN {
    foreach my $field (qw(gdtile global_sth bb_sth id image_cache n_primitives)) {
	no strict "refs";
	*$field = sub {
	    my $self = shift;
	    $self->{$field} = shift if @_;
	    return $self->{$field};
	}
    }
}

# Global table of TiledImage's for cleanup
my %tiledImageCleanup;

my %storeImagePrims = (
     'copy' => 1,
     'copyMerge' => 1,
     'copyMergeGray' => 1,
     'copyResized' => 1,
     'copyResampled' => 1,
     'copyRotated' => 1,
     'setBrush' => 1,
);

# $self->storeImages ($subroutine, @argument_list)
# stores any GD::Image objects in the argument list, and replaces them with database image IDs.
sub storeImages {
    my ($self, $sub, @args) = @_;
    @args = GDStoreImage($self, @args) if defined $storeImagePrims{$sub};
    return @args;
}

# $self->retrieveImages ($subroutine, @argument_list)
# replaces any database image IDs the argument list with references to GD::Image objects.
sub retrieveImages {
    my ($self, $sub, @args) = @_;
    @args = GDRetrieveImage($self, @args) if defined $storeImagePrims{$sub};
    return @args;
}

# Database access
sub GDConnect {
    my $gdtile_database = shift;
    my $gdtile = DBI->connect ($gdtile_database, "") or die "Couldn't connect to database: " . DBI->errstr;
    return $gdtile;
}

sub GDFetchExistingTiledImage {
  my ($gdtile, $tiledimage_name) = @_;
  my $query = "SELECT tiledimage_id FROM tiledimage WHERE tiledimage_name = '$tiledimage_name'";
  my $sth = $gdtile->prepare ($query);
  $sth->execute () or die "Couldn't execute statement: " . $sth->errstr;
  my ($tiledimage_id) = $sth->fetchrow_array;
  return $tiledimage_id;
}

sub GDFetchTiledImageDimensions {
    my ($gdtile, $tiledimage_id) = @_;
    my $sth = $gdtile->prepare("SELECT width, height FROM tiledimage WHERE tiledimage_id = " . $tiledimage_id);
    $sth->execute()
	or die "Couldn't execute statement: " . $sth->errstr;
    my ($width, $height) = $sth->fetchrow_array;
    return ($width, $height);
}

sub GDCreateTiledImage {
    my ($gdtile, $tiledimage_name, $width, $height) = @_;
    $gdtile->do ("INSERT INTO tiledimage (tiledimage_name, width, height) VALUES ('$tiledimage_name', $width, $height)");
    my $sth = $gdtile->prepare("SELECT LAST_INSERT_ID()");
    $sth->execute()
	or die "Couldn't execute statement: " . $sth->errstr;
    my ($tiledimage_id) = $sth->fetchrow_array;
    return $tiledimage_id;
}

sub GDPrepareQueries {
    my ($gdtile) = @_;
    my $global_sth = $gdtile->prepare('SELECT command_order, command FROM global_primitive WHERE tiledimage_id = ?')
	or die ("Couldn't prepare statement: " . $gdtile->errstr);

    my $bb_sth = $gdtile->prepare('SELECT command_order, command FROM primitive WHERE x0 <= ? AND y0 <= ? AND x1 >= ? AND y1 >= ? AND tiledimage_id = ?')
	or die ("Couldn't prepare statement: " . $gdtile->errstr);
    return ($global_sth, $bb_sth);
}
sub GDDeletePrimitives {
    my ($self) = @_;
    # use explicit hashrefs instead of AUTOLOAD'ed accessors,
    # so that this method can be called by the signal handlers
    $self->{'gdtile'}->do ("DELETE FROM primitive WHERE tiledimage_id = " . $self->{'id'});
    $self->{'gdtile'}->do ("DELETE FROM global_primitive WHERE tiledimage_id = " . $self->{'id'});
    $self->{'gdtile'}->do ("DELETE FROM tiledimage WHERE tiledimage_id = " . $self->{'id'});
}

sub GDDisconnect {
    my ($self) = @_;
    # use explicit hashrefs instead of AUTOLOAD'ed accessors,
    # so that this method can be called by the signal handlers
    $self->{'gdtile'}->disconnect if defined $self->{'gdtile'};
}

sub GDStoreImage {
    my ($self, $image, @otherArgs) = @_;

    # get PNG data
    croak "Not a GD::Image" unless ref($image) eq "GD::Image";
    my $image_data = $image->png;
    croak "Bad image data" unless defined $image_data;

    # INSERT PNG data into image table
    my $sth = $self->gdtile->prepare("INSERT INTO image (image_data) VALUES (?)")
	or die "Couldn't prepare statement: " . $self->gdtile->errstr;

    $sth->execute ($image_data)
	or die "Couldn't execute statement: " . $sth->errstr;

    # get image ID
    my $id_sth = $self->gdtile->prepare("SELECT LAST_INSERT_ID()");
    $id_sth->execute()
	or die "Couldn't execute statement: " . $id_sth->errstr;
    my ($image_id) = $id_sth->fetchrow_array;

    # return
    return ($image_id, @otherArgs);
}

sub GDRetrieveImage {
    my ($self, $image_id, @otherArgs) = @_;

    # get PNG data from image table
    my $sth = $self->gdtile->prepare("SELECT image_data FROM image WHERE image_id = $image_id")
	or die "Couldn't prepare statement: " . $self->gdtile->errstr;

    $sth->execute()
	or die "Couldn't execute statement: " . $sth->errstr;

    # create image from PNG data & remember it in image_cache.
    # NB if we just create a GD::Image object here, bugs occur in setBrush,
    # maybe cos Perl thinks it can safely delete the brush image (due to absence of refs to object?)
    # keeping the image in image_cache seems to work (because it fool Perls into keeping the GD::Image around?)
    while (my ($image_data) = $sth->fetchrow_array) {
	$self->image_cache->{$image_id} = GD::Image->newFromPngData ($image_data);
    }

    # return
    return ($self->image_cache->{$image_id}, @otherArgs);
}

sub GDRecordPrimitive {
    my ($self, $sub, $subargs, @bb) = @_;

    my @args = $self->storeImages ($sub, @$subargs);

    # get string representation and store in SQL database
    my $dumper = Data::Dumper->new ([[$sub,@args]]);
    $dumper->Indent(0)->Terse(1)->Purity(1);
    my $command = $dumper->Dump;
    $command =~ s/\\/\\\\/g;  # escape backslashes
    $command =~ s/\"/\\\"/g;  # escape quotes

    # which table should this go into?
    my @cols = qw(tiledimage_id command_order command);
    my $table;
    if (@bb) {
	push @cols, qw(x0 y0 x1 y1);
	$table = 'primitive';
    } else {
	$table = 'global_primitive';
    }

    # INSERT subroutine & argument list into table
    my $command_order = $self->n_primitives ($self->n_primitives + 1);
    $self->gdtile->do ("INSERT INTO $table ("
		       . join (',', @cols)
		       . ") VALUES ("
		       . join (',', $self->id, $command_order, "\"$command\"", @bb)
		       . ")");
}

sub GDEraseLeftmostPrimitives {
    my ($self, $x) = @_;
    $self->gdtile->do ("DELETE FROM primitive WHERE x1 < $x");
}

sub deserializePrims {
    my ($self, $primarray) = @_;

    my @prims = map {
	my $command_order = int($_->[0]);
	my $command = $_->[1];

	# recreate [$subroutine,@argument_list] primitive using 'eval' on Data::Dumper string
	my ($sub, @args) = @{eval $command};
	unless (defined $sub) {  # check subroutine is defined
	    warn $!;
	    die "Offending 'eval': $command\n";
	}

	# retrieve images
	@args = $self->retrieveImages ($sub, @args);
	[$command_order, $sub, @args];
    } @{$primarray};

    return @prims;
}

# The following two methods for querying tables of GD primitives both
# return a coderef that's an iterator over (command_order, command) pairs
sub GDGetGlobalPrimitives {
    my ($self) = @_;
    $self->global_sth->execute ($self->id)
	or die "Couldn't execute statement: " . $self->global_sth->errstr;
    
    return ($self->deserializePrims($self->global_sth->fetchall_arrayref));
}

sub GDGetBoundedPrimitives {
    my ($self, $xmin, $ymin, $xmax, $ymax) = @_;
    $self->bb_sth->execute($xmax,$ymax,$xmin,$ymin,$self->id)
	or die "Couldn't execute statement: " . $self->bb_sth->errstr;

    return ($self->deserializePrims($self->bb_sth->fetchall_arrayref));
}

sub perTileCleanup {
    my $self = shift;

    # flush image cache
    $self->image_cache ({});
}

# cleanup:--
# disconnects from the database
sub cleanup {
    my $self = shift;
    $self->GDDisconnect;
}

# Public methods.
# Constructor
sub new {
    my ($class, %args) = @_;
    my ($verbose, $tiledimage_name) = ($args{'-verbose'}, $args{'-tiledimage_name'});
    my ($width, $height, $tiledimage_id);

    warn "connecting to prim database " . $args{'-primdb'} . "\n" if $verbose;

    # connect to database
    my $gdtile = GDConnect ($args{'-primdb'});

    if ($tiledimage_id = GDFetchExistingTiledImage ($gdtile, $tiledimage_name))
    {
      # we already have stuff for this TiledImage, so use its dimensions
      ($width, $height) = GDFetchTiledImageDimensions ($gdtile, $tiledimage_id);
      warn "reusing existing TiledImage (id = $tiledimage_id)\n" if $verbose;
    }
    else
    {
      # need to create new TiledImage
      ($width, $height) = ($args{'-width'}, $args{'-height'});
      $tiledimage_id = GDCreateTiledImage ($gdtile, $tiledimage_name, $width, $height);
      warn "creating new TiledImage (id = $tiledimage_id)\n" if $verbose;
    }

    # prepare SQL queries
    my ($global_sth, $bb_sth) = GDPrepareQueries ($gdtile);

    my $self = { 'gdtile' => $gdtile,
		 'global_sth' => $global_sth,
		 'bb_sth' => $bb_sth,

		 'id' => $tiledimage_id,
		 'name' => $tiledimage_name,

		 'verbose' => $verbose,

		 'width' => $width,
		 'height' => $height,

		 'image_cache' => {},

		 'n_primitives' => 0,
    };

    bless $self, $class;
    return $self;
}

1;
