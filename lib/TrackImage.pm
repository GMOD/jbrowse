package TrackImage;

=head1 NAME

TrackImage.pm

=head1 SYNOPSIS

Perl module to provide a GD-like interface for rendering a JBrowse track at a particular zoom level.

=head1 METHODS

=cut

use strict;
use warnings;
use vars '@ISA';

@ISA = qw (TiledImage);

use TiledImage;

# new
sub new {
    my ($class, %args) = @_;
    my %defaults = ('-bases_per_pixel' => 1);
    for my $arg (keys %defaults) {
	if (exists $args{$arg}) {
	    $defaults{$arg} = $args{$arg};
	    delete $args{$arg};  # hide from TiledImage constructor
	}
    }
    my $self = TiledImage->new (%args);
    while (my ($arg, $val) = each %defaults) {
	$arg =~ s/^-//;
	$self->{$arg} = $val;
    }
    bless $self, $class;
    return $self;
}

=head2 bases_per_pixel

    my $bpp = $trackImage->bases_per_pixel();

Return the number of bases per pixel.

=cut

sub bases_per_pixel {
    my ($self) = @_;
    return $self->{'bases_per_pixel'};
}

=head2 pixels_per_base

    my $ppb = $trackImage->pixels_per_base();

Return the number of pixels per base.

=cut

sub pixels_per_base {
    my ($self) = @_;
    return 1 / $self->bases_per_pixel;
}

=head2 base_xpos

    my $x = $trackImage->base_xpos($baseIndex);

Return the x-coordinate of the leftmost pixel of base $baseIndex (one-based).

=cut

sub base_xpos {
    my ($self, $baseIndex) = @_;
    return $self->pixels_per_base * ($baseIndex - 1);
}

