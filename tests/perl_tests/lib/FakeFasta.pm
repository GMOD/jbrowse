=head1 NAME

FakeFasta - supporting module for making random sequences, and files full of them

=head1 METHODS

=cut

package FakeFasta;

use strict;
use warnings;

use List::Util ();

use Carp;
use JSON 2 ();

=head2 random_seq( $length )

Return a random string of A,C,T,G,N of the given length.

=cut

my @letters = qw( A C T G N );
sub random_seq {
    my $rand = '0' x $_[1];
    $rand =~ s/ . / $letters[ int rand 5 ] /xge;
    return $rand;
}

=head2 fasta_to_fkfa( $file )

Given a FASTA file, examine it and generate a fkfa (fake FASTA)
description for it, which can be used by fkfa_to_fasta to regenerate
the file, almost the same but with random sequence.

Returns a hashref specification of the fkfa, as:

  [
    { id => 'FooSeq1', length => 1234, desc => 'blah blah' },
    ...
  ]

=cut

sub fasta_to_fkfa {
    my ( $self, $file ) = @_;

    my @spec;

    my $fh = ref $file ? $file : do {
        my $gzip = $file =~ /\.gz/ ? ':gzip' : '';
        open my $f, "<$gzip", $file or die "$! reading $file";
        $f
    };
    my $curr_entry;
    local $_; #< unlike for, while does not automatically localize $_
    while( <$fh> ) {
        if( /^\s*>\s*(\S+)(.*)/ ) {
            push @spec, $curr_entry = { id => $1, desc => $2, length => 0 };
            chomp $curr_entry->{desc};
            undef $curr_entry->{desc} if $curr_entry->{desc} eq '';
        }
        else {
            s/\s//g;
            if( $curr_entry ) {
                $curr_entry->{length} += length;
            }
            else { die 'parse error' }
        }
    }

    return \@spec;
}

=head2 fkfa_to_fasta( %args )

Given a .fkfa (fake FASTA) description, expand it to a full FASTA
file.  Returns a subroutine ref that, when called repeatedly, returns
chunks of the FASTA file output.

Example:

  fkfa_to_fasta( spec => \@fkfa_spec, out_file => '/path/to/output.fasta' );
  # OR
  fkfa_to_fasta( in_file => 'path/to/file.fkfa' );

=cut

sub fkfa_to_fasta {
    my ( $self, %args ) = @_;

    # slurp and decode the in_file if present
    if( $args{in_fh} || $args{in_file} ) {
        my $in_fh = $args{in_fh} || do {
            open my $f, '<', $args{in_file} or die "$! reading '$args{in_file}'";
            $f
        };
        local $/;
        $args{spec} = JSON::from_json( scalar <$in_fh> );
    }

    croak "must provide a spec argument" unless $args{spec};

    croak "must provide either an out_file or out_fh argument"
        unless defined $args{out_fh} || defined $args{out_file};

    my $out_fh = $args{out_fh} || do {
        open my $f, '>', $args{out_file}
            or die "$! writing $args{out_file}";
        $f
    };

    for my $seq ( @{$args{spec}} ) {
        print $out_fh (
            '>',
            $seq->{id},
            $seq->{desc} || '',
            "\n",
          );

        my $length = $seq->{length};
        my $line_width = 78;

        # believe it or not this is actually the fastest way to print
        # a random sequence.  print() is apparently very fast.
        while( $length > 0 ) {
            print $out_fh  $letters[ int rand 5 ];
            print $out_fh "\n" unless $length % $line_width;
            $length--;
        }
        print $out_fh "\n";
    }
}

1;
