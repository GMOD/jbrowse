=head1 NAME

ImageTrack - a track composed of pre-generated image files

=head1 DESCRIPTION

WARNING: currently only works for *loading* data.  Other operations on
the data are not supported by this module.

=head1 METHODS

=cut

package ImageTrack;

use strict;
use warnings;
use File::Path ();
use File::Spec;
use List::Util qw( min max first );
use POSIX qw (ceil);

use IntervalStore;
use JsonFileStorage;
use NameHandler;

sub new {
    my ($class, $trackDirTemplate, $baseUrl, $label, $config, $key, $jsclass) = @_;

    $config->{compress} = $config->{compress} || 0;
    my $self = {
        trackDirTemplate  => $trackDirTemplate,
        label             => $label,
        key               => $key || $label,
        trackDataFilename => "trackData.json" . ( $config->{compress} ? 'z' : '' ),
        config            => $config,
        jsclass           => $jsclass || 'ImageTrack',
      };

    $config->{urlTemplate} = $baseUrl . "/" . $self->{trackDataFilename}
      unless defined( $config->{urlTemplate} );

    ( $self->{outdir} = $self->{trackDirTemplate} ) =~ s!\{refseq\}/?!!g;

    return bless $self, $class;
}

sub label  { return shift->{label}; }
sub key    { return shift->{key}; }
sub type   { return shift->{jsclass} }
sub config { return shift->{config}; }

=head2 startLoad( $refSeqName, $chunkBytes, \@classes )

Starts loading.  Takes the name of the reference
seq, the number of bytes in a chunk, and an arrayref containing the
L<ArrayRepr> definitions for each feature class.

Example:

  $featureTrack->startLoad("chr4");
  $featuretrack->addSorted( $_ ) for @sorted_features;

=cut

sub startLoad {
    my ($self) = @_; # other arguments ignored

    File::Path::rmtree( $self->outDir ) if -e $self->outDir;
    File::Path::mkpath( $self->outDir );

    $self->{loading} = 1;
    return;
}

sub outDir { shift->{outdir} }

=head2 finishLoad()

Finish loading this track, if it is loading.

=cut

sub finishLoad {
    my ( $self ) = @_;

    return unless $self->{loading};
    $self->{loading} = 0;
    return;
}

sub DESTROY { $_[0]->finishLoad }

1;
