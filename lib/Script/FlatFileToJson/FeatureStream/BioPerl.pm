package Script::FlatFileToJson::FeatureStream::BioPerl;
use strict;
use warnings;
use base 'Script::FlatFileToJson::FeatureStream';

sub next_items {
    my ( $self ) = @_;
    return map $self->_bp_to_hashref( $_ ),
           $self->{stream}->();
}

# downconvert a bioperl feature object back to bare-hashref-format
sub _bp_to_hashref {
    my ( $self, $f ) = @_;
    my %h;
    @h{qw{ seq_id start end strand source phase type child_features }} =
        ( $f->seq_id,
          $f->start,
          $f->end,
          $f->strand,
          $f->source_tag,
          {0=>0,1=>1,2=>2}->{$f->phase},
          $f->primary_tag || undef,
          [ map $self->_bp_to_hashref($_), $f->get_SeqFeatures ],
        );
    for(qw( seq_id start end strand source type )) {
        no warnings 'uninitialized';
        $h{$_} = undef if $h{$_} eq '.';
    }
    $h{attributes} = {
        map {
            my $t = $_;
            $t => [ grep $_ ne '.', $f->get_tag_values($t) ]
        } $f->get_all_tags
    };
    return \%h;
};

1;
