package Bio::JBrowse::Cmd;
use strict;
use warnings;

use Getopt::Long ();
use Pod::Usage ();

=head1 NAME

Script - base class for a JBrowse command-line script

=head1 DESCRIPTION

This wheel is smaller than the ones on CPAN, but not really rounder.

=cut

sub new {
    my $class = shift;
    my $opts = $class->getopts(@_);
    return bless { opt => $opts }, $class;
}

sub getopts {
    my $class = shift;
    my $opts = {
        $class->option_defaults,
    };
    local @ARGV = @_;
    Getopt::Long::GetOptions( $opts, $class->option_definitions );
    Pod::Usage::pod2usage( -verbose => 2 ) if $opts->{help};
    return $opts;
}

sub opt {
    if( @_ > 2 ) {
        return $_[0]->{opt}{$_[1]} = $_[2];
    } else {
        return $_[0]->{opt}{$_[1]}
    }
}

#override me
sub option_defaults {
    ( )
}

#override me
sub option_definitions {
    ( "help|h|?" )
}

sub run {
}

1;
