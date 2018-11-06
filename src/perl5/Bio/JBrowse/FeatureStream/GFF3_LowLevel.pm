=head1 NAME

Script::FlatFileToJson::FeatureStream::GFF3_LowLevel - feature stream
class for working with L<Bio::GFF3::LowLevel::Parser> features

=cut

package Bio::JBrowse::FeatureStream::GFF3_LowLevel;
use strict;
use warnings;

use base 'Bio::JBrowse::FeatureStream';
sub next_items {
    my ( $self ) = @_;
    while ( my $items = $self->{parser}->next_item ) {
        if( ref $items eq 'ARRAY' ) {
            return map $self->_to_hashref( $_ ), @$items;
        }
    }
    return;
}

#use Carp::Always;

sub _to_hashref {
    my ( $self, $f ) = @_;
    # use Data::Dump 'dump';
    # if( ref $f ne 'HASH' ) {
    #     Carp::confess( dump $f );
    # }
    $f->{score} += 0 if defined $f->{score};
    $f->{phase} += 0 if defined $f->{phase};

    my $a = delete $f->{attributes};
    my %h;
    for my $key ( sort keys %$f) {
        my $lck = lc $key;
        my $v = $f->{$key};
        if( defined $v && ( ref($v) ne 'ARRAY' || @$v ) ) {
            unshift @{ $h{ $lck } ||= [] }, $v;
        }
    }
    # rename child_features to subfeatures
    if( $h{child_features} ) {
        $h{subfeatures} = [
            map {
                [ map $self->_to_hashref( $_ ), map @$_, @$_ ]
            } @{delete $h{child_features}}
        ];
    }
    if( $h{derived_features} ) {
        $h{derived_features} = [
            map {
                [ map $self->_to_hashref( $_ ), map @$_, @$_ ]
            } @{$h{derived_features}}
        ];
    }

    my %skip_attributes = ( Parent => 1 );
    for my $key ( sort keys %{ $a || {} } ) {
        my $lck = lc $key;
        $lck =~ s/^\s+|\s+$//g;
        if( !$skip_attributes{$key} ) {
            my @vals = map { s/^\s+|\s+$//g; $_ } @{$a->{$key}};
            push @{ $h{$lck} ||= [] }, @vals;
        }
    }

    my $flat = $self->_flatten_multivalues( \%h );
    return $flat;
}



1;
