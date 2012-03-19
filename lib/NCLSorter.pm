=head1 NAME

NCLSorter - efficiently convert a stream of start-position-sorted features into a stream of NCL-sorted features

=head1 SYNOPSIS

    my $sorter = NCLSorter->new(
        $startIndex, $endIndex,
        sub { $track->addFeature( $_[0] ),
       );

    while( my $feature = $conventional_stream->() ) {
        $sorter->addSorted( $feature );
    }

=head1 DESCRIPTION

Takes a stream of features (represented by arrays) sorted by start
position, and outputs a stream of features sorted by the Nested
Containment List sorting algorithm.

=head1 METHODS

=cut

package NCLSorter;
use strict;
use warnings;
use Carp;

=head2 new( $startIndex, $endIndex, \&output )

Make a new NCLSorter which will repeatedly call the &output subroutine
with features.  $startIndex and $endIndex are the numerical index of
the start and end coordinate of the input feature arrayref.

=cut

sub new {
    # consumer: callback that receives the output sorted features
    # start: index of the feature start position in the feature arrays
    # end: index of the feature end position in the feature arrays
    my ( $class, $start, $end, $consumer ) = @_;
    my $self = {
        consumer => $consumer,
        pending => [],
        start => $start,
        end => $end
    };
    bless $self, $class;
}

=head2 addSorted( \@single_feature )

Add a feature arrayref.  May or may not trigger an output.

=cut

sub addSorted {
    my ($self, $toAdd) = @_;

    my $pending = $self->{pending};
    my $start = $self->{start};
    my $end = $self->{end};
    if ($#$pending >= 0) {
        # if the new feature has a later start position,
        if ($pending->[-1]->[$start] < $toAdd->[$start]) {
            # then we're past all of the pending features, and we can flush them
            $self->flush();
        } elsif ($pending->[-1]->[$start] > $toAdd->[$start]) {
            croak "input not sorted: got " . $pending->[-1]->[$start]
                . " .. " . $pending->[-1]->[$end] . " before "
                . $toAdd->[$start] . " .. " . $toAdd->[$end];
        }
    }
    push @$pending, $toAdd;
}

=head2 flush()

Flush any pending features in the sort buffer to the output.  Should
be called after the last feature has been added.

=cut

sub flush {
    my ($self) = @_;

    my $consumer = $self->{consumer};
    my $pending = $self->{pending};
    my $end = $self->{end};

    my @sorted = sort { $b->[$end] <=> $a->[$end] } @$pending;
    foreach my $feat (@sorted) {
        $consumer->($feat);
    }
    $#$pending = -1;
}

1;
