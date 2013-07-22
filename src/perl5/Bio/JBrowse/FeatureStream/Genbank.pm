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

    # see if this is a region record, and if so, make a note of offset so 
    # we can add it to coordinates below
    my $offset = _getRegionOffset( $f );

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
    $f->{'start'} = $startStop->[0] + $offset + 1;
    $f->{'end'} = $startStop->[1] + $offset;
    $f->{'type'} = $f->{FEATURES}->[$indexTopLevel]->{'name'};

    # add subfeatures
    $f->{'subfeatures'} = ();
    if ( scalar( @{$f->{FEATURES}}) > $indexTopLevel ){
      for my $i ( $indexTopLevel + 1 .. scalar( @{$f->{FEATURES}} ) - 1 ){
	my $startStop = _extractStartStopFromLocation( $f->{FEATURES}->[$i]->{'location'} );
	$startStop->[0] += $offset;
	$startStop->[1] += $offset;
	$startStop->[0]++;

  	my $newFeature = {};
	# sort(@{[ 'Start', 'End',  'Strand',  'COMMENT',  'DEFINITION',  'CLASSIFICATION',  'LOCUS', 'FEATURES',  'KEYWORDS',  'SEQUENCE',  'ACCESSION',  'Seq_id',  'NCBI_TAXON_ID', 'MOL_TYPE',  'ORIGIN',  'ORGANISM',  'Type', 'VERSION',  'SOURCE',  'Subfeatures']})],

	foreach my $attr ( 'Strand',  'COMMENT',  'DEFINITION',  'CLASSIFICATION',  'LOCUS', 'FEATURES',  'KEYWORDS',  'SEQUENCE',  'ACCESSION',  'Seq_id',  'NCBI_TAXON_ID', 'MOL_TYPE',  'ORIGIN',  'ORGANISM', 'VERSION',  'SOURCE',  'Subfeatures' ){
	    $newFeature->{$attr} = 'null';
	}
  	$newFeature->{'start'} = $startStop->[0] || 'null';
  	$newFeature->{'end'} = $startStop->[1] || 'null';
	$newFeature->{'type'} = $f->{FEATURES}->[$i]->{'name'} || 'null',
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

sub _extractStartStopFromLocation {
    my $feat = shift;
    my @startStop;
    $feat =~ s/join\(//;
    $feat =~ s/\)//;
    my @coordinates = split(/\.\.\>*/, $feat);
    $startStop[0] = $coordinates[0];
    $startStop[1] = $coordinates[-1];
    return \@startStop;
  }

sub _getRegionOffset {

    my $f = shift;
    my $offset = 0;
    if ( grep {$_ =~ /REGION\:/} @{$f->{'VERSION'}} ){ # this is a region file 
 	# get array item after REGION token
 	my $count = 0;
	my $regionIndexInArray;
 	foreach my $item ( @{$f->{'VERSION'}} ){
	    if ( $item =~ /REGION\:/ ){
		$regionIndexInArray = $count;
		last;
	    }
 	    $count++;
 	}
	if ( defined $regionIndexInArray ){
	    my ($start, $end) = split(/\.\./, @{$f->{'VERSION'}}[ $regionIndexInArray + 1]);
	    if ( defined $start ){
		$start -= 1 if ( $start > 0 );
		$offset = $start;
	    }
	}
    }
}


1;
