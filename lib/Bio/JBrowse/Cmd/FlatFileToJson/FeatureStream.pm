=head1 NAME

Script::FlatFileToJson::FeatureStream - base class for feature streams
used for handling features inside FlatFileToJson.pm

=cut

package Bio::JBrowse::Cmd::FlatFileToJson::FeatureStream;
use strict;
use warnings;

sub new {
    my $class = shift;
    bless { @_ }, $class;
}

sub flatten_to_feature {
    my ( $self, $f, $class_index ) = @_;
    my @f = ( $class_index || 0,
              @{$f}{qw{ start end strand source phase type }},
              (map $f->{attributes}{$_}[0], qw(ID Name)),
              [ map $self->flatten_to_feature($_,1), @{$f->{child_features}} ],
            );
    # convert start to interbase and numify it
    $f[1] -= 1;
    # numify end
    $f[2] += 0;
    # convert strand to 1/0/-1/undef if necessary
    no warnings 'uninitialized';
    $f[3] = { '+' => 1, '-' => -1 }->{$f[3]} || $f[3] || undef;
    return \@f;
}

sub flatten_to_name {
    my ( $self, $f ) = @_;
    my @namerec = (
        [ grep defined, @{$f->{attributes}{Name}}, @{$f->{attributes}{Alias}} ],
        $self->{track_label},
        $f->{attributes}{Name}[0],
        $f->{seq_id},
        (map $_+0, @{$f}{'start','end'}),
        $f->{attributes}{ID}[0],
        );
    $namerec[4]--; #< to one-based
    return \@namerec;
}

sub featureHeaders    { [qw[ Start End Strand Source Phase Type Id Name Subfeatures ]] }
*subfeatureHeaders = \&featureHeaders;
sub startIndex        { 1 }
sub endIndex          { 2 }

1;
