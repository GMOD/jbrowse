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

    # get index of top level feature ('mRNA' at current writing)
    my $indexTopLevel;
    my $count = 0;
    foreach my $feat ( @{$f->{FEATURES}} ){
	if ( _isTopLevel( $feat ) ){
	    $indexTopLevel = $count;
	}
	$count++;
    }

    return undef if ( ! defined $indexTopLevel );

    # start at top level, make feature and subfeature for all subsequent features
    # this logic assumes that top level feature is above all subfeatures

    # set start/stop
    my $startStop = _extractStartStopFromJoinToken( $f->{FEATURES}->[$indexTopLevel] );
    $f->{'start'} = $startStop->[0] + 1;
    $f->{'end'} = $startStop->[1];

    # add subfeatures
    $f->{'subfeatures'} = ();
    if ( scalar( @{$f->{FEATURES}}) > $indexTopLevel ){
      for my $i ( $indexTopLevel + 1 .. scalar( @{$f->{FEATURES}} ) - 1 ){
	my $newFeature = {'start' => '1', 'end' => '1', 'foo' => 'bar'};
	push @{$f->{'subfeatures'}}, $newFeature;
      }
    }
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
