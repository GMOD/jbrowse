package NCLSorter;
# takes a stream of features (represented by arrays) sorted by start position,
# and outputs a stream of features sorted by the NCL sort,
# suitable for sending to JsonGenerator

use strict;
use warnings;
use Carp;

sub new {
    # consumer: callback that receives the output sorted features
    # start: index of the feature start position in the feature arrays
    # end: index of the feature end position in the feature arrays
    my ($class, $consumer, $start, $end) = @_;
    my $self = {
        consumer => $consumer,
        pending => [],
        start => $start,
        end => $end
    };
    bless $self, $class;
}

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

# sort and empty the current pending array
# to be called after the last feature has been added
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
