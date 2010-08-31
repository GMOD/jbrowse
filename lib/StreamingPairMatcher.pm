package StreamingPairMatcher;

use strict;
use warnings;
use Bio::DB::Sam::Constants qw(FLAGS RFLAGS);

sub new {
    my ($class, $nextStageCallback) = @_;
    my $self = {};
    $self->{nextStage} = $nextStageCallback;
    $self->{readIdMap} = {};
    # we keep a linked list of pending (not-yet-paired) reads;
    # firstPending is the first one, and lastPending is the last one.
    # the linked list is ordered according to when we saw the first
    # read in the pair; when we send the pairs on to the nextStageCallback,
    # we'll be sending them in that order.
    #$self->{firstPending} = undef;
    #$self->{lastPending} = undef;
    bless $self, $class;
}

sub addRead {
    my ($self, $read) = @_;
    if (! ($read->flag & FLAGS{PAIRED})) {
        # this isn't a paired read, don't try to look for a mate
        $self->{nextStage}->($read);
        return;
    }

    my $mateInfo = $self->{readIdMap}->{$read->display_name};
    if (defined($mateInfo)) {
        # we've seen the mate already
        $mateInfo->{pair} = $self->makePair($read, $mateInfo->{mate});
        $self->flushPairs();
    } else {
        # add this read to the set of reads that we're waiting for
        $mateInfo = {mate => $read};
        $self->{readIdMap}->{$read->display_name} = $mateInfo;
        if (defined $self->{lastPending}) {
            $self->{lastPending}->{nextRead} = $mateInfo;
            $self->{lastPending} = $mateInfo;
        } else {
            $self->{firstPending} = $mateInfo;
            $self->{lastPending} = $mateInfo;
        }
    }
}

sub flushPairs {
    # if the first pending read has a pair,
    while ((defined $self->{firstPending})
               && (defined $self->{firstPending}->{pair})) {
        # send it on to the next stage
        $self->{nextStage}->($self->{firstPending}->{pair});
        # and make the next pending read the first one
        $self->{firstPending} = $self->{firstPending}->{nextRead};
    }
    # if we've flushed all the pending reads, clear the 'lastPending' reference
    unless (defined $self->{firstPending}) {
        delete $self->{lastPending};
    }
}

sub makePair {
    my ($read1, $read2) = @_;
    if ($read1->flag & FLAGS{UNMAPPED}) {
        # this read is unmapped
    }
    if ($match->flag & FLAGS{M_UNMAPPED}) {
    }
}

1;
