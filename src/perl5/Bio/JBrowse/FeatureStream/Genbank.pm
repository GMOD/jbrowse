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
    delete $f->{ORIGIN};
    delete $f->{SEQUENCE};

    # see if this is a region record, and if so, make a note of offset
    # so we can add it to coordinates below
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
    my ( $start, $end, $strand ) = _parseJoinToken( $f->{FEATURES}->[$indexTopLevel] );
    $f->{start}  = $start + $offset + 1;
    $f->{end}    = $end + $offset;
    $f->{strand} = $strand;
    $f->{type}   = $f->{FEATURES}[$indexTopLevel]{name};

    %$f = ( %{$f->{FEATURES}[$indexTopLevel]{feature} || {}}, %$f ); # get other attrs
    if( $f->{type} eq 'mRNA' ) {
        $f->{name} = $f->{FEATURES}[$indexTopLevel]{feature}{gene};
        $f->{description} = $f->{FEATURES}[$indexTopLevel]{feature}{product} || $f->{FEATURES}[$indexTopLevel]{feature}{note};
    }

    # convert FEATURES to subfeatures
    $f->{subfeatures} = [];
    if ( scalar( @{$f->{FEATURES} || [] }) > $indexTopLevel ) {
        for my $i ( $indexTopLevel + 1 .. scalar( @{$f->{FEATURES}} ) - 1 ) {
            my $feature = $f->{FEATURES}[$i];
            my ( $substart, $subend, $substrand ) = _parseLocation( $feature->{location} );
            $substart += $offset + 1;
            $subend += $offset;

            my $newFeature = {
                %{ $feature->{feature}||{} },
                start => $substart,
                end   => $subend,
                strand => $substrand,
                type  => $feature->{name}
            };

            push @{$f->{subfeatures}}, $newFeature;
        }
    }
    delete $f->{FEATURES};

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

sub _parseJoinToken {
    my ( $feat ) = @_;
    my @startStop;
    if ( exists $feat->{'location'} && $feat->{'location'} =~ /^\s*\S*?\(*(\d+)\..*\.(\d+)\)*/ ){
	$startStop[0] = $1;
	$startStop[1] = $2;
    }
    my $strand = 1;
    if( $startStop[0] > $startStop[1] ) {
        @startStop = reverse @startStop;
        $strand = -1;
    }
    return ( @startStop, $strand );
}

sub _parseLocation {
    my ( $loc ) = @_;
    $loc =~ s/^\s*\S*\(//;
    $loc =~ s/\)+//;
    my @coordinates = split /\.\.\>*/, $loc;
    my ( $start, $end ) = ( $coordinates[0], $coordinates[-1] );
    my $strand = 1;
    if( $start > $end ) {
        ( $start, $end ) = ( $end, $start );
        $strand = -1;
    }
    return ( $start, $end, $strand );
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
