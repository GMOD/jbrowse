=head1 NAME

Script::FlatFileToJson::FeatureStream::Genbank_LowLevel - feature stream
class for working with L<Bio::GFF3::LowLevel::Parser> features

=cut

package Bio::JBrowse::FeatureStream::Genbank;
use strict;
use warnings;

use base 'Bio::JBrowse::FeatureStream';

sub next_items {
    my ( $self ) = @_;
    while ( my $i = $self->{parser}->next_data_hash ) {
        return $self->_to_webapollo_feature( $i );
    }
    return;
}

sub _to_webapollo_feature {
    my ( $self, $f ) = @_;
    $f->{seq_id} = $f->{'CHROM'};
    $f->{'start'} = $f->{'POS'};
    $f->{'end'} = $f->{'POS'};
    $f->{'strand'} = 0;
    if ( length( $f->{'REF'} ) == length( $f->{'ALT'}->[0] ) ){
        $f->{'Type'} = 'SNV';
    }
    return $f;
}

1;
