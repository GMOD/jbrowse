package ImageTrackRenderer;

=head1 NAME

ImageTrackRenderer - render JBrowse image tracks using a chromosome-sized virtual GD canvas.

=head1 SYNOPSIS

   my $renderer = ImageTrackRenderer->new(
       "datadir"     => $outdir,
       "tilewidth"   => $tileWidth,
       "trackheight" => $trackHeight,
       "tracklabel"  => $trackLabel,
       "key"         => $key,
       "link"        => !$nolinks,
       "drawsub"     => sub {
           my ($im, $seqInfo) = @_;
           my $seqname = $seqInfo->{"name"};
           my @color;
           for my $rgb (@rgb) {
               push @color, $im->colorAllocate (@$rgb);
           }
           $im->setThickness ($thickness);
           for my $gff (@{$gff{$seqname}}) {
               my $start = $im->base_xpos ($gff->[0]) + $im->pixels_per_base / 2;
               my $end = $im->base_xpos ($gff->[1]) + $im->pixels_per_base / 2;
               my $arcMidX = ($start + $end) / 2;
               my $arcWidth = $end - $start;
               my $arcHeight = 2 * $trackHeight * ($gff->[1] - $gff->[0]) / $maxlen;
               # warn "Drawing arc from $start to $end, height $arcHeight";
               $im->arc ($arcMidX, 0, $arcWidth, $arcHeight, 0, 180, $color[$gff->[2]]);
           }
       });

   # run the renderer
   $renderer->render;

=head1 METHODS

=cut

use strict;
use warnings;
use vars '@ISA';

use POSIX ();

use base qw( Exporter );

our @EXPORT_OK = qw (new render);

use File::Spec ();
use File::Path ();

use Bio::JBrowse::JSON;

use GenomeDB;
use TrackImage;

=head2 new

    my $renderer = ImageTrackRenderer->new(%args);

Creates a new ImageTrackRenderer object.

%args is a key-value hash with the following keys:

=over 2

=item B<datadir>: root directory for all generated files. defaults to "data"

=item B<tilewidth>: width of tiles in pixels. default is 2000 (you should not need to change this)

=item B<trackheight>: height of track in pixels. default is 100

=item B<tracklabel>: the track label. defaults to "track"

=item B<key>: the key. defaults to whatever 'tracklabel' is

=item B<drawsub>: reference to a subroutine taking two arguments ($im,$seqInfo) where $im is a TrackImage and $seqInfo is a reference to the sequence info hash (keys include "length" and "name"). This subroutine will be called for every refseq.

=item B<link>: flag indicating whether to use filesystem links to repeat identical tiles. True by default; set to zero to disable this feature

=back

=cut

sub new {
    my ($class, %args) = @_;
    my $self = {
        'datadir'       => "data",
        'trackdir'      => "tracks",
        'tiledir'       => undef, #< ignored for backcompat
        'refseqsfile'   => undef,
        'trackinfofile' => 'trackList.json',
        'zooms'         =>
            [ 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000 ],
        'tilewidth'     => 2000,
        'trackheight'   => 100,
        'tracklabel'    => "track",
        'key'           => undef,
        'link'          => 1,
        'drawsub'       => undef,
    };
    for my $arg ( sort keys %args ) {
	if( exists $self->{$arg} ) {
	    $self->{$arg} = $args{$arg}
	} else {
	    die "Unknown argument: $arg";
	}
    }
    bless $self, $class;

    # lazily import the md5_hex function if we're to use MD5 identity-linking
    eval "require Digest::MD5" if $self->link;

    $self->{_genomedb} = GenomeDB->new( $self->datadir );
    $self->{_imagetrack} =
        $self->_genomedb->createImageTrack(
            $self->tracklabel,
            {},
            $self->key || $self->tracklabel,
        );

    return $self;
}


=head2 render

    $renderer->render;

Calls the supplied C<drawsub> coderef (via the C<drawzoom> method,
which can also be overridden) for all sequences and all zoomlevels,
then adds the track to the data/trackList.json file.

=cut


sub render {
    my ($self) = @_;
    my @refSeqs = @{ $self->_genomedb->refSeqs }
        or die "No reference sequences defined";

    foreach my $seqInfo (@refSeqs) {
	my $seqName = $seqInfo->{"name"};
	my $seqLen = $seqInfo->{"length"};
	#warn "starting seq $seqName\n";

        $self->_imagetrack->startLoad( $seqName );

        $self->write_trackfile( $seqName );

	# loop over zoom levels
	for my $basesPerPixel ( @{ $self->zooms } ) {
	    print "working on seq $seqName, bases per pixel $basesPerPixel\n";
	    # create virtual image
	    my $im = TrackImage->new(
                         '-width'           => POSIX::ceil( $seqLen/$basesPerPixel ),
                         '-height'          => $self->trackheight,
                         '-tile_width_hint' => $self->tilewidth,
                         '-bases_per_pixel' => $basesPerPixel,
                       );

	    # call drawsub coderef
	    $self->drawzoom( $im, $seqInfo );

	    # break into tiles
	    my $tile = 0;
	    for( my $x = 0; $x < $im->width; $x += $self->tilewidth ) {
		my $gdIm = $im->renderTile( $x, 0, $self->tilewidth, $self->trackheight );
                my $tilefile = $self->tilefilepath( $seqName, $basesPerPixel, $tile );
                $self->write_image_file( $gdIm, $tilefile );
		# increment the tile count.
		++$tile;
	    }

	    # allow the TiledImage to clean up
	    $im->cleanup();
	}

        $self->_imagetrack->finishLoad;
    }

    $self->_genomedb->writeTrackEntry( $self->_imagetrack );
}

=head2 drawzoom

    $im = new TiledImage ('-width'=>..., '-height'=>...);
    $seqInfo = { "name" => ...,
                 "length" => ...,
                 ... };
    $renderer->drawzoom($im,$seqInfo);

Calls the supplied C<drawsub> coderef with the specified arguments.

You should not call this method directly (it is called by C<render>), but you can override it in a subclass instead of placing a coderef in C<drawsub>, if you choose.

The default implementation just passes the arguments to C<drawsub>, like so:

    $renderer->drawsub->($im,$seqInfo)

=cut

sub drawzoom {
    my ($self, $im, $seqInfo) = @_;
    $self->drawsub->( $im, $seqInfo );
}



############## HELPER METHODS ####################

sub _md5_to_path {
    my $self = shift;
    if( @_ ) {
        $self->{md5_to_path} = $_[1];
    }
    return $self->{md5_to_path};
}

sub write_image_file {
    my ( $self, $gdIm, $tilefile ) = @_;

    my $png = $gdIm->png;

    # we will write the tile file if the MD5 hash is unique,
    # or if we don't create hardlinks between MD5-identical files
    my $writefile = 1;
    if( $self->link ) {  # do we make hardlinks?

        my $md5_to_path = $self->_md5_to_path;

        # compute the hash of the image; if we've seen it before,
        # make a hardlink instead of writing the file.
        my $md5 = Digest::MD5::md5_hex ($png);
        if( exists $md5_to_path->{$md5} ) {
            my $oldtilefile = $md5_to_path->{$md5};
            if( -f $tilefile ) {
                unlink $tilefile or die "Couldn't remove existing file $tilefile : $!";
            }
            # warn "Tile $tilefile identical to $oldtilefile, creating a hard link\n";
            if( link $oldtilefile, $tilefile ) {
                $writefile = 0;
            }
            else {
                die "Couldn't link $oldtilefile to $tilefile : $!";
            }
        }
        else {
            $md5_to_path->{$md5} = $tilefile;
        }
    }

    # write the file, if we still need to.
    if( $writefile ) {
        open my $tile, '>', $tilefile
            or die "$! writing $tilefile";
        binmode $tile;
        print $tile $png;
    }

    return;
}

sub write_trackfile {
    my ( $self, $seqName ) = @_;

    # open track description file
    my $trackfile = $self->trackfilepath( $seqName );
    open my $trackfile_fh, '>', $trackfile or die "$! writing $trackfile";

    print $trackfile_fh Bio::JBrowse::JSON->new->pretty->encode({
            'tileWidth' => $self->tilewidth,
            'zoomLevels' => [
                map {
                    my $basesPerPixel = $_;
                    {
                        'urlPrefix' => "$basesPerPixel/",
                        'height' => $self->trackheight,
                        'basesPerTile' => $basesPerPixel * $self->tilewidth,
                    }
                } @{ $self->zooms }
            ],
        });
}


## relative
sub tracksubdir {
    my ( $self ) = @_;
    $self->tracklabel;
}
sub seqsubdir   {
    my ($self, $seqname) = @_;
    File::Spec->catdir( $self->tracksubdir, $seqname );
}
sub zoomsubdir {
    my ($self, $seqname, $zoom) = @_;
    File::Spec->catdir( $self->seqsubdir($seqname), $zoom );
}
sub tilefile {
    my ($self, $seqname, $zoom, $tile) = @_;
    File::Spec->catfile( $self->zoomsubdir($seqname,$zoom), "$tile.png" );
}
sub trackfile {
    my ( $self, $seqname ) = @_;
    File::Spec->catfile( $self->trackdir, $seqname, 'trackData.json' );
}

### absolute
sub trackpath {
    my ( $self ) = @_;
    $self->_dir( $self->datadir, $self->trackdir );
}
sub trackfilepath {
    my ( $self, $seqname ) = @_;
    $self->_file( $self->datadir, $self->trackdir, $self->seqsubdir( $seqname ), "trackData.json" );
}
sub trackinfopath {
    my ( $self ) = @_;
    $self->_file( $self->datadir, $self->trackinfofile );
}
sub tilefilepath {
    my $self = shift;
    $self->_file( $self->datadir, $self->trackdir, $self->tilefile( @_ ));
}

######### read-only accessors

sub link        { shift->{link}        }
sub datadir     { shift->{datadir}     }
sub tracklabel  { shift->{tracklabel}  }
sub key         { shift->{key}         }
sub refseqsfile { undef                } #< only for backcompat
sub trackdir    { shift->{trackdir}    }
sub tilewidth   { shift->{tilewidth}   }
sub zooms       { shift->{zooms}       }
sub trackheight { shift->{trackheight} }
sub drawsub     { shift->{drawsub}     }

sub _genomedb   { shift->{_genomedb}   }
sub _imagetrack { shift->{_imagetrack} }

###########################

# filename and dirname helpers that assemble file and dir names, and
# create dirs if necessary
sub _dir {
    my ( $self, @path ) = @_;
    my $dir = @path > 1 ? File::Spec->catdir( @path ) : $path[0];
    #warn "checking dir $dir\n";
    unless( -e $dir ) {
        File::Path::mkpath( $dir )
            or die "$! creating directory $dir";
    }
    return $dir;
}
sub _file {
    my ( $self, @path ) = @_;
    my $path =  File::Spec->catfile( @path );

    # create the dir if necessary
    my ($file,$dir) = File::Basename::fileparse( $path );
    $self->_dir( $dir ) if $dir;

    return $path;
}

1;
