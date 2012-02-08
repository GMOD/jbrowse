=head1 NAME

RandomSeq - supporting module for making random sequences, and files full of them

=head1 METHODS

=cut

package RandomSeq;

use strict;
use warnings;

=head2 random_fasta( %args )

Example:

  random_fasta(
      file => 'path/to/target.fasta',
      num_seqs => 3,
      avg_length => 4000,
      length_plus_or_minus => 4000 * 0.1,
    );

=cut

sub random_fasta {
    my ( $self, %args ) = @_;

    $args{num_seqs}   ||= 3;
    $args{avg_length} ||= 4000;
    $args{length_plus_or_minus} = $args{avg_length} * 0.1
        unless defined $args{length_plus_or_minus};

    open my $test_fasta, '>', $args{file} or die "$! writing $args{file}";
    while ( $args{num_seqs}-- ) {
        my $length = int( $args{avg_length} + $args{length_plus_or_minus} * ( rand(2) - 1 ) );
        $test_fasta->print( ">Random_$args{num_seqs}\n", $self->random_seq( $length ), "\n" );
    }
}

=head2 random_seq( $length )

Return a random string of A,C,T,G,N of the given length.

=cut

sub random_seq {
    my ( $self, $length ) = @_;
    my $rand = '0' x $length;
    $rand =~ s/ . / [qw( A C T G N )]->[ int rand 5 ] /xge;
    return $rand;
}

1;
