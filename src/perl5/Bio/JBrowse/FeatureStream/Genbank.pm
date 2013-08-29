=head1 NAME

Script::FlatFileToJson::FeatureStream::Genbank - feature stream
class for working with Genbank features

=cut

package Bio::JBrowse::FeatureStream::Genbank;
use strict;
use warnings;

use base 'Bio::JBrowse::FeatureStream';

use Bio::JBrowse::FeatureStream::Genbank::LocationParser;

sub next_items {
    my ( $self ) = @_;
    while ( my $i = $self->{parser}->next_seq ) {
        return $self->_aggregate_features_from_gbk_record( $i );
    }
    return;
}

sub _aggregate_features_from_gbk_record {
    my ( $self, $record ) = @_;

    # see if this is a region record, and if so, make a note of offset
    # so we can add it to coordinates below
    my $offset = _getRegionOffset( $record );

    # get index of top level feature ('mRNA' at current writing)
    my $indexTopLevel;
    my $count = 0;
    foreach my $feat ( @{$record->{FEATURES}} ){
	if ( _isTopLevel( $feat ) ){
	    $indexTopLevel = $count;
	}
	$count++;
    }

    return unless defined $indexTopLevel;

    # start at top level, make feature and subfeature for all subsequent features
    # this logic assumes that top level feature is above all subfeatures

    # set start/stop
    my @locations = sort { $a->{start} <=> $b->{start} } _parseLocation( $record->{FEATURES}->[$indexTopLevel]->{location} || '' );

    my $f = { %$record, %{$locations[0]} };
    delete $f->{FEATURES};
    my $seq_id = $f->{seq_id} = $f->{VERSION} ? ( $f->{VERSION}[0] =~ /REGION/ ? $f->{VERSION}[2] : $f->{VERSION}[0])
                                              : $f->{ACCESSION};
    delete $f->{ORIGIN};
    delete $f->{SEQUENCE};

    $f->{end} = $locations[-1]{end};
    #for my $f ( @features ) {
        $f->{start}  += $offset + 1;
        $f->{end}    += $offset;
        $f->{strand} = 1 unless defined $f->{strand};
        $f->{type}   = $record->{FEATURES}[$indexTopLevel]{name};
        $f->{seq_id} ||= $seq_id;

        %$f = ( %{$record->{FEATURES}[$indexTopLevel]{feature} || {}}, %$f ); # get other attrs
        if( $f->{type} eq 'mRNA' ) {
            $f->{name} = $record->{FEATURES}[$indexTopLevel]{feature}{gene};
            $f->{description} = $record->{FEATURES}[$indexTopLevel]{feature}{product} || $f->{FEATURES}[$indexTopLevel]{feature}{note};
        }

        # convert FEATURES to subfeatures
        $f->{subfeatures} = [];
        if ( scalar( @{$record->{FEATURES} || [] }) > $indexTopLevel ) {
            for my $i ( $indexTopLevel + 1 .. $#{$record->{FEATURES}} ) {
                my $feature = $record->{FEATURES}[$i];
                my @sublocations = _parseLocation( $feature->{location} );
                for my $subloc ( @sublocations ) {
                    $subloc->{start} += $offset + 1;
                    $subloc->{end} += $offset;

                    my $newFeature = {
                        %{ $feature->{feature}||{} },
                        %$subloc,
                        type  => $feature->{name}
                        };

                    $newFeature->{seq_id} ||= $seq_id;

                    push @{$f->{subfeatures}}, $newFeature;
                }
            }
        }
#    }

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

sub _parseLocation {
    return @{ Bio::JBrowse::FeatureStream::Genbank::LocationParser->parse( $_[0] ) };
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
