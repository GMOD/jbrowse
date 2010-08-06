package ImageTrackRenderer;

=head1 NAME

ImageTrackRenderer.pm

=head1 SYNOPSIS

Perl module to render JBrowse image tracks using a chromosome-sized virtual GD canvas.

=head1 METHODS

=cut

use strict;
use warnings;
use vars '@ISA';

use POSIX qw (ceil);

use base 'Exporter';
use base 'AutoHash';

our @EXPORT_OK = qw (new render);

use JsonGenerator;
use TrackImage;

# "use Digest::MD5 qw(md5_hex)" commented out because it is imported lazily via an "eval" statement below
# use Digest::MD5 qw(md5_hex);

=head2 new

    my $renderer = ImageTrackRenderer->new(%args);

Creates a new ImageTrackRenderer object.

%args is a key-value hash with the following keys:

=over 2

=item B<datadir>: root directory for all generated files. defaults to "data"

=item B<tiledir>: subdirectory of datadir corresponding to image files. defaults to "tiles"

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
    my $self = { 'datadir' => "data",
		 'tiledir' => "tiles",
		 'trackdir' => "tracks",  # probably best not to modify this
		 'refseqsfile' => 'refSeqs.js',  # probably best not to modify this
		 'trackinfofile' => 'trackInfo.js',  # probably best not to modify this
		 'zooms' => [ 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000 ],  # probably best not to modify this
		 'tilewidth' => 2000,
		 'trackheight' => 100,
		 'tracklabel' => "track",
		 'key' => undef,
		 'link' => 1,  # true if we make filesystem hardlinks between MD5-identical tile images
		 'drawsub' => sub { my ($im, $seqInfo) = @_; warn "Dummy render method called for ", $seqInfo->{"name"}, " at zoom ", $im->basesPerPixel, "\n"  }
    };
    while (my ($arg, $val) = each %args) {
	if (exists $self->{$arg}) {
	    $self->{$arg} = $val;
	} else {
	    die "Unknown argument: $arg";
	}
    }
    bless $self, $class;
    # lazily import the md5_hex function if we're to use MD5 identity-linking
    eval "use Digest::MD5 qw(md5_hex)" if $self->link;
    return $self;
}

# a few helper methods
sub tileroot { my ($self) = @_; return $self->datadir . '/' . $self->tiledir }
sub tracksubdir { my ($self) = @_; return $self->tileroot . '/' . $self->tracklabel }
sub seqsubdir { my ($self, $seqname) = @_; return $self->tracksubdir . '/' . $seqname }
sub zoomsubdir { my ($self, $seqname, $zoom) = @_; return $self->seqsubdir($seqname) . '/' . $zoom }
sub tilefile { my ($self, $seqname, $zoom, $tile) = @_; return $self->zoomsubdir($seqname,$zoom) . "/$tile.png" }
sub trackpath { my ($self) = @_; return $self->datadir . '/' . $self->trackdir }
sub trackfile { my ($self, $seqname) = @_; return $self->trackpath . '/' . $seqname . '/' . $self->tracklabel . ".json" }
sub refseqspath { my ($self) = @_; return $self->datadir . '/' . $self->refseqsfile }
sub trackinfopath { my ($self) = @_; return $self->datadir . '/' . $self->trackinfofile }

sub refseqs { my ($self) = @_; return @{JsonGenerator::readJSON($self->refseqspath, [], 1)} }
sub mkdir { my ($self, @paths) = @_; for my $path (@paths) { mkdir $path unless -d $path } }

=head2 render

    $renderer->render;

Calls the supplied C<drawsub> coderef (via the C<drawzoom> method, which can also be overridden) for all sequences and all zoomlevels,
then adds the track to the data/trackInfo.js file.

=cut

sub render {
    my ($self) = @_;
    my @refSeqs = $self->refseqs;
    die "No reference sequences" if $#refSeqs < 0;

    $self->mkdir($self->datadir, $self->tileroot, $self->tracksubdir, $self->trackpath);

    my %md5_to_path;
    foreach my $seqInfo (@refSeqs) {
	my $seqName = $seqInfo->{"name"};
	my $seqLen = $seqInfo->{"length"};
	warn "starting seq $seqName\n";
	$self->mkdir($self->seqsubdir($seqName));

	# open track description file
	my $trackfile = $self->trackfile($seqName);
	local *TRACKFILE;
	open TRACKFILE, ">$trackfile" or die "Couldn't open $trackfile : $!";
	print TRACKFILE "{\n \"zoomLevels\" : [";

	# loop over zoom levels
	for my $z (0..$#{$self->zooms}) {
	    my $basesPerPixel = $self->zooms->[$z];
	    warn "working on seq $seqName, bases per pixel $basesPerPixel\n";
	    # create virtual image
	    my $im = TrackImage->new ('-width' => ceil($seqLen/$basesPerPixel),
				      '-height' => $self->trackheight,
				      '-tile_width_hint' => $self->tilewidth,
				      '-bases_per_pixel' => $basesPerPixel);

	    # call drawsub coderef
	    $self->drawzoom ($im, $seqInfo);

	    # break into tiles
	    $self->mkdir ($self->zoomsubdir($seqName,$basesPerPixel));
	    my $tile = 0;
	    for (my $x = 0; $x < $im->width; $x += $self->tilewidth) {
		local *TILE;
		my $gdIm = $im->renderTile($x,0,$self->tilewidth,$self->trackheight);
		my $png = $gdIm->png;
		my $tilefile = $self->tilefile ($seqName, $basesPerPixel, $tile);
		# we will write the tile file if the MD5 hash is unique,
		# or if we don't create hardlinks between MD5-identical files
		my $writefile = 1;
		if ($self->link) {  # do we make hardlinks?
		    # compute the hash of the image; if we've seen it before,
		    # make a hardlink instead of writing the file.
		    my $md5 = md5_hex ($png);
		    if (exists $md5_to_path{$md5}) {
			my $oldtilefile = $md5_to_path{$md5};
			if (-f $tilefile) {
			    unlink $tilefile or die "Couldn't remove existing file $tilefile : $!";
			}
			# warn "Tile $tilefile identical to $oldtilefile, creating a hard link\n";
			if (link $oldtilefile, $tilefile) {
			    $writefile = 0;
			} else {
			    die "Couldn't link $oldtilefile to $tilefile : $!";
			}
		    } else {
			$md5_to_path{$md5} = $tilefile;
		    }
		}
		# write the file, if we still need to.
		if ($writefile) {
		    open TILE, ">$tilefile" or die "Couldn't open $tilefile : $!";
		    binmode TILE;
		    print TILE $png;
		    close TILE or die "Couldn't close $tilefile : $!";
		}
		# increment the tile count.
		++$tile;
	    }

	    # describe zoomlevel
	    print TRACKFILE
		($z > 0 ? "," : ""),
		"\n  {\n",
		"   \"urlPrefix\" : \"", $self->zoomsubdir($seqName,$basesPerPixel), "/\",\n",
		"   \"height\" : ", $self->trackheight, ",\n",
		"   \"basesPerTile\" : ", $basesPerPixel * $self->tilewidth, "\n",
		"  }";

	    # allow the TiledImage to clean up
	    $im->cleanup();
	}

	# end of track description file
	print TRACKFILE
	    "\n ],\n",
	    " \"tileWidth\" : ", $self->tilewidth,
	    "\n}\n";
	close TRACKFILE or die "Couldn't close $trackfile : $!";

	# write to track list
	JsonGenerator::modifyJSFile($self->trackinfopath, "trackInfo",
				    sub {
					my $trackList = shift;
					my $i;
					for ($i = 0; $i <= $#{$trackList}; $i++) {
					    last if ($trackList->[$i]->{'label'} eq $self->tracklabel);
					}
					$trackList->[$i] =
					{
					    'label' => $self->tracklabel,
					    'key' => defined($self->key) ? $self->key : $self->tracklabel,
					    'url' => $self->trackfile("{refseq}"),
					    'type' => "ImageTrack",
					};
					return $trackList;
				    });
    }
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

    &{$renderer->drawsub}($im,$seqInfo)

=cut

sub drawzoom {
    my ($self, $im, $seqInfo) = @_;
    &{$self->drawsub} ($im, $seqInfo);
}

=head1 AUTHORS

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Ian Holmes E<lt>ihh@berkeley.eduE<gt>

Copyright (c) 2007-2010 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut

1;
