package Bio::JBrowse::PartialSorter;
use strict;
use warnings;

=head1 NAME

Bio::JBrowse::PartialSorter - partially sort a stream

=head1 METHODS

=head2 new( size => $num_items, mem => $mem_bytes, compare => sub($$) )

All items optional.  Defaults to string comparison, 256MB of sort
memory.

=cut

sub new {
    my ( $class, @args ) = @_;
    my $self = bless { @args }, $class;
    $self->{mem} ||= 256*1024*1024; #256 MB
    return $self;
}

=head2 sort( $stream )

Returns another stream, partially sorted with the comparison function.

=cut

sub sort {
    my ( $self, $in ) = @_;

    my @buffer;

    my $size = $self->{size};
    if( ! $size ) { # if no explicit item size, sum the size of the first 100 items
        my $item_size = $self->_estimate_item_size( $in, 100, \@buffer );
        $size = $self->{size} = sprintf('%.0f', $self->{mem} / $item_size );
        $self->_fill_buffer( $in, \@buffer, $size );
    }


    return sub {
        unless( @buffer ) {
            $self->_fill_buffer( $in, \@buffer, $size );
            return unless @buffer; # stream must have ended
        }
        return shift @buffer;
    };
}

sub _fill_buffer {
    my ( $self, $in, $buffer, $size ) = @_;
    my $compare = $self->{compare} ||= sub { $a cmp $b };
    while( @$buffer < $size && ( my $d = $in->() ) ) {
        push @$buffer, $d;
    }
    @$buffer = sort $compare @$buffer;
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
    ) / @$buffer;

    return $avg_size;
}

1;
