=head1 NAME

Script::FlatFileToJson::FeatureStream::GFF3_LowLevel - feature stream
class for working with L<Bio::GFF3::LowLevel::Parser> features

=cut

package Bio::JBrowse::Script::FlatFileToJson::FeatureStream::GFF3_LowLevel;
use strict;
use warnings;

use base 'Bio::JBrowse::Script::FlatFileToJson::FeatureStream';

sub next_items {
    while ( my $i = $_[0]->{parser}->next_item ) {
        return $i if $i->{child_features};
    }
    return;
}

1;
