=head1 NAME

Script::FlatFileToJson::FeatureStream::Genbank - feature stream
class for working with Genbank features

=cut

package Bio::JBrowse::FeatureStream::Genbank;
use strict;
use warnings;

use base 'Bio::JBrowse::FeatureStream';

sub next_items {
    my ( $self ) = @_;
    while ( my $i = $self->{parser}->next_seq ) {
        return $self->_aggregate_features_from_gbk_record( $i );
    }
    return;
}

sub _aggregate_features_from_gbk_record {
    my ( $self, $f ) = @_;
    $f->{'seq_id'} = $f->{'ACCESSION'};

    foreach my $feat ( @{$f->{FEATURES}} ){
	next unless _isTopLevel( $feat );

	# set subfeatures
	$f->{'Subfeatures'} = undef;

	# set start/stop
	my $startStop = _extractStartStopFromJoinToken( $feat );
	$f->{'start'} = $startStop->[0] + 1;
	$f->{'end'} = $startStop->[1];

	# deal with subfeatures
    }

    # get rid of unnecessary stuff, this could get really big for some GBK files
#    delete ${$f}{'COMMENT'};
#    delete ${$f}{'SEQUENCE'};
#    delete ${$f}{'ORIGIN'};

    return $f;
}

sub _isTopLevel {
    my $feat = shift;
    my @topLevelFeatures = qw( mRNA ); # add more as needed?
    my $isTopLevel = 0;
    foreach my $thisTopFeat ( @topLevelFeatures ){
	if ( $feat->{'name'} =~ m/$thisTopFeat/ ){
	    $isTopLevel = 1;
	    last;
	}
    }
    return $isTopLevel;
}

sub _extractStartStopFromJoinToken {
    my $feat = shift;
    my @startStop;
    if ( exists $feat->{'location'} && $feat->{'location'} =~ /join\((\d+)\..*\.(\d+)\)/ ){
	$startStop[0] = $1;
	$startStop[1] = $2;
    }
    else {
    }
    return \@startStop;
}

1;
