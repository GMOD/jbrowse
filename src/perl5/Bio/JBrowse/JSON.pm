package Bio::JBrowse::JSON;
use strict;

=head1 NAME

Bio::JBrowse::JSON - JSON.pm subclass that turns on relaxed parsing by default, throws more informative die messages, and has a C<decode_file> method.

=cut

use JSON 2 ();

our @ISA = ( 'JSON' );

sub new {
    my $class = shift;
    return $class->SUPER::new( @_ )->relaxed
}

sub decode {
    my $self = shift;
    my $data;
    eval {
        $data = $self->SUPER::decode( @_ );
    }; if( $@ ) {
        die "Error parsing JSON: $@";
    }
    return $data;
}

sub decode_file {
    my ( $self, $file ) = @_;
    my $data;
    eval {
        $data = $self->SUPER::decode(do {
            local $/;
            open my $f, '<', $file or die $!;
            scalar <$f>
        });
    }; if( $@ ) {
        ( my $error = $@ ) =~ s/\.?\s*$//;
        die "$error reading file ".$file."\n";
    }
    return $data;
}

1;

