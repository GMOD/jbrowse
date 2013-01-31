package Bio::JBrowse::PartialSorter;
use strict;
use warnings;

=head1 NAME

Bio::JBrowse::PartialSorter - partially sort a stream

=head1 METHODS

=head2 new( size => $num_items, mem => $mem_bytes, compare => sub($$) )

=cut

sub new {
    my ( $class, @args ) = @_;
    bless { @args }, $class;
}

=head2 sort( $stream )

Returns another stream, partially sorted with the comparison function.

=cut

sub sort {
    my ( $self, $in ) = @_;

    my @buffer;

    my $size = $self->{size} ||= do {
        my $item_size = $self->_estimate_item_size( $in, 100, \@buffer );
        sprintf('%.0f',($self->{mem} || 256*1024*1024) / $item_size )
    };

    my $compare = $self->{compare} || sub { $a cmp $b };

    return sub {
        unless( @buffer ) {
            while( @buffer < $size && ( my $d = $in->() ) ) {
                push @buffer, $d;
            }
            return unless @buffer; # stream ended
            @buffer = sort $compare @buffer;
        }
        return shift @buffer;
    };
}

sub _estimate_item_size {
    require List::Util;
    require Devel::Size;

    my ( $self, $in_stream, $sample_size, $buffer ) = @_;

    while( @$buffer < $sample_size && ( my $d = $in_stream->() ) ) {
        push @$buffer, $d;
    }

    my $avg_size = List::Util::sum(
        map Devel::Size::total_size( $_ ), @$buffer
    ) / $sample_size;

    return $avg_size;
}

1;
