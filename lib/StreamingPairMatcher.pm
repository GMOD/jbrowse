package StreamingPairMatcher;

use strict;
use warnings;
use Bio::DB::Sam::Constants qw(FLAGS RFLAGS);
use List::Util qw(min max);
use Bio::SeqFeature::Lite;
use Carp;

# if we can't find a mate pair after going through this many reads,
# then we'll give up
use constant MAX_PENDING => 10_000;

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
    $self->{pendingCount} = 0;
    bless $self, $class;
}

sub addRead {
    my ($self, $read) = @_;
    if (! ($read->flag & RFLAGS->{PAIRED})) {
        # this isn't a paired read, don't try to look for a mate
        $self->{nextStage}->($read);
        return;
    }

    if ($read->flag & RFLAGS->{UNMAPPED}) {
        #ignore unmapped reads
        return;
    }

    my $mateInfo = $self->{readIdMap}->{$read->display_name};
    if (defined($mateInfo)) {
        # we've seen the mate already
        delete $self->{readIdMap}->{$read->display_name};
        $mateInfo->{pair} = makePair($read, $mateInfo->{mate});
        $self->flushPairs();
    } else {
        if (($read->flag & RFLAGS->{M_UNMAPPED})
                || (!($read->flag & RFLAGS->{MAP_PAIR}))) {
            # don't try to pair if the mate is unmapped,
            # or if the read isn't a member of a proper pair
            $self->appendMateInfo({pair => makePair($read, undef)});
            $self->flushPairs();
        } else {
            # add this read to the set of reads for which
            # we're looking for pairs
            $mateInfo = {mate => $read};
            $self->{readIdMap}->{$read->display_name} = $mateInfo;
            $self->appendMateInfo($mateInfo);
        }
    }
}

sub appendMateInfo {
    my ($self, $mateInfo) = @_;
    # if we have pending reads,
    if (defined $self->{lastPending}) {
        # add the current $mateInfo to the end of the list,
        $self->{lastPending}->{nextRead} = $mateInfo;
        # and make the end-of-list pointer point to the current $mateInfo
        $self->{lastPending} = $mateInfo;
    } else {
        # we only have one current pending read,
        # point the start-of-list and end-of-list
        # pointers to the current $mateInfo
        $self->{firstPending} = $mateInfo;
        $self->{lastPending} = $mateInfo;
    }
    $self->{pendingCount} += 1;

    if ($self->{pendingCount} > MAX_PENDING) {
        # if we go through MAX_PENDING reads without finding a mate,
        # then we'll give up and assume $self->{firstPending} doesn't
        # have a mate in this stream.
        carp "giving up on finding a mate for read "
            . $self->{firstPending}->{mate}->display_name;
        $self->{firstPending}->{pair} =
            makePair($self->{firstPending}->{mate}, undef);
        delete $self->{readIdMap}->{$self->{firstPending}->{mate}->display_name};
        $self->flushPairs();
    }
}

sub flushPairs {
    my ($self) = @_;
    # if the first pending read has been paired up,
    while ((defined $self->{firstPending})
               && (defined $self->{firstPending}->{pair})) {

        # send it on to the next stage
        $self->{nextStage}->($self->{firstPending}->{pair});

        # and make the next pending read the first one
        $self->{firstPending} = $self->{firstPending}->{nextRead};
        $self->{pendingCount} -= 1;
    }

    # if we've flushed all the pending reads, clear the 'lastPending' reference
    unless (defined($self->{firstPending})) {
        delete $self->{lastPending};
    }
}

sub makePair {
    my ($read1, $read2) = @_;
    my $start = $read1->start;
    $start = $read2->start if (defined($read2) && ($read2->start < $start));
    my $end = $read1->end;
    $end = $read2->end if (defined($read2) && ($read2->end > $end));

    my $parent = Bio::SeqFeature::Lite->new(
        -display_name => $read1->display_name,
        -seq_id       => $read1->seq_id,
        -start => $start,
        -end   => $end,
        -type  => 'read_pair',
        -class => 'read_pair',
    );

    $parent->add_SeqFeature($read1);
    $parent->add_SeqFeature($read2) if (defined($read2));
    return $parent;
}

1;
