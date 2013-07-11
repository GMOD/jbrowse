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
    $f->{'start'} = 1;
    $f->{'end'} = 10000;
    $f->{'strand'} = 0;

    # get rid of unnecessary stuff, this could get really big for some GBK files
#    delete ${$f}{'COMMENT'};
#    delete ${$f}{'SEQUENCE'};
#    delete ${$f}{'ORIGIN'};

    return $f;
}

# sub _to_webapollo_feature
#     my ( $self, $f ) = @_;
#     $f->{'seq_id'} = $f->{'ACCESSION'};
#     $f->{'start'} = $f->{'POS'};
#     $f->{'end'} = $f->{'POS'};
#     $f->{'strand'} = 0;
#     if ( length( $f->{'REF'} ) == length( $f->{'ALT'}->[0] ) ){
#         $f->{'Type'} = 'SNV';
#     }
#     return $f;
# }

1;
