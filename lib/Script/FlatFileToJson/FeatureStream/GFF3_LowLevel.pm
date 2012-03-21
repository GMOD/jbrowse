## featurestream that wraps a Bio::GFF3::LowLevel::Parser
package Script::FlatFileToJson::FeatureStream::GFF3_LowLevel;
use strict;
use warnings;

use base 'Script::FlatFileToJson::FeatureStream';

sub next_items {
    while ( my $i = $_[0]->{parser}->next_item ) {
        return $i if $i->{child_features};
    }
    return;
}

1;
