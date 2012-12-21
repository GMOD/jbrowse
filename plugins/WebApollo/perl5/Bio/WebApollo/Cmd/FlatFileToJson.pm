package Bio::WebApollo::Cmd::FlatFileToJson;
use strict;
use warnings;

use base 'Bio::JBrowse::Cmd::FlatFileToJson';

sub option_defaults {
    my ( $self ) = @_;
    my @opt = $self->SUPER::option_defaults;
    return ( @opt,
             'webApollo',
             'renderClassName=s'
           );
}

sub transform_feature {
    my ( $self, $feat ) = @_;
    # this subroutine alters $feat in two ways
    # 1) combines CDS features into one big long wholeCDS feature (and then deletes the CDS features)
    # 2) gets rid of UTR features

  # if there is at least one CDS then make a wholeCDS (if there isn't one) then merge CDSs into the wholeCDS, nuking each CDS
    if ( my @CDSFeats = @{getChildren( $feat, 'CDS' )} ) {
        # make a wholeCDS feature from the first CDS if there isn't already one
        if ( scalar @{getChildren( $feat, 'wholeCDS' )} < 1 ) {
            my $wholeCDSFeat = clone $CDSFeats[0];
            $wholeCDSFeat->{'type'} = 'wholeCDS';
            push @{$feat->{'child_features'}}, $wholeCDSFeat;
        }

        # make new children by iterating through CDSs to:
        # 1) reset wholeCDS coordinates to the max and min coordinates of CDSs and
        # 2) delete CDSs
        # 3) delete UTRs
        my @newChildren;
        my @sortedCDScoords = sort map {$_->{start}, $_->{end}} @{getChildren( $feat, 'CDS' )};
        foreach my $thisChild ( @{getChildren( $feat )} ) {
            if ($thisChild->{type} eq 'wholeCDS') {
                $thisChild->{start} = $sortedCDScoords[0];
                $thisChild->{end} = $sortedCDScoords[-1];
            }
            unless ( $thisChild->{type} eq 'CDS' ||
                 $thisChild->{type} =~ /((five|three)_prime_)*UTR$/
                 ) {
                push @newChildren, $thisChild;
            }
        }
        $feat->{'child_features'} = \@newChildren;

    }

    return $feat;
}

sub getChildren {
    my ( $self, $feat, $type ) = @_;
    my @children = @{$feat->{'child_features'}};
    if ( defined $type ){
        @children = ( grep {$_->{'type'} eq $type } @children);
    }
    return \@children;
}


1;
