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

use base 'Exporter';
use base 'AutoHash';

our @EXPORT_OK = qw (new);

use Getopt::Long;
use File::Basename;
use Carp;

use Bio::DB::SeqFeature::Store;
use JsonGenerator;


=head2 new

    my $renderer = ImageTrackRenderer->new(%args);

Creates a new ImageTrackRenderer object.

%args is a key-value hash with the following keys:

datadir, tiledir, tilewidth, trackheight, tracklabel, key

=cut

sub new {
    my ($class, %args) = @_;
    my $self = { 'datadir' => "data",
		 'tiledir' => "tiles",
		 'trackdir' => "tracks",  # probably best not to modify this
		 'refseqsfile' => 'refSeqs.js',  # probably best not to modify this
		 'trackinfofile' => 'trackInfo.js',  # probably best not to modify this
		 'tilewidth' => 2000,
		 'trackheight' => 100,
		 'tracklabel' => "track",
		 'key' => undef,
    };
    while (my ($arg, $val) = each %args) {
	if (exists $self->{$arg}) {
	    $self->{$arg} = $val;
	} else {
	    die "Unknown argument: $arg";
	}
    }
    bless $self, $class;
    return $self;
}

# a few helper methods
sub tilepath { my ($self) = @_; return $self->datadir . '/' . $self->tiledir }
sub tilesubdir { my ($self) = @_; return $self->tilepath . '/' . $self->tracklabel }
sub seqsubdir { my ($self, $seqname) = @_; return $self->tilesudbir . '/' . $seqname }
sub trackpath { my ($self) = @_; return $self->datadir . '/' . $self->trackdir }
sub refseqspath { my ($self) = @_; return $self->datadir . '/' . $self->refseqsfile }
sub trackinfopath { my ($self) = @_; return $self->datadir . '/' . $self->trackinfofile }

sub refseqs { my ($self) = @_; return @{JsonGenerator::readJSON($self->refseqspath, [], 1)} }
sub mkdir { my ($self, @paths) = @_; for my $path (@paths) { mkdir $path unless -d $path } }

# render method (unfinished)
sub render {
    my ($self) = @_;
    my @refSeqs = $self->refseqs;
    die "No reference sequences" if $#refSeqs < 0;

    $self->mkdir($self->datadir, $self->tilepath, $self->tilesubdir, $self->trackpath);

    foreach my $seqInfo (@refSeqs) {
	my $seqName = $seqInfo->{"name"};
	print "\nworking on seq $seqName\n";
	$self->mkdir($self->seqsubdir($seqName));

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
					    'url' => $self->trackpath . "/{refseq}/" . $self->tracklabel . ".json",
					    'type' => "ImageTrack",
					};
					return $trackList;
				    });
    }
}

=head1 AUTHORS

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>
Ian Holmes E<lt>ihh@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
