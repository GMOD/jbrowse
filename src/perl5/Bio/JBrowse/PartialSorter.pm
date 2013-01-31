package Bio::JBrowse::PartialSorter;
use strict;
use warnings;

=head1 NAME

Bio::JBrowse::PartialSorter - partially sort a stream

=head1 METHODS

=head2 new( size => $num_items, compare => sub($$) )

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

    my $size = $self->{size} || 10_000_000;
    my $compare = $self->{compare} || sub { $a cmp $b };
    my @buffer;
    #$#buffer = $size;

    return sub {
        unless( @buffer ) {
            while( @buffer < $size && ( my $d = $in->() ) ) {
                push @buffer, $d;
            }
            @buffer = sort $compare @buffer;
        }
        return unless @buffer;
        return shift @buffer;
    };
}

1;
