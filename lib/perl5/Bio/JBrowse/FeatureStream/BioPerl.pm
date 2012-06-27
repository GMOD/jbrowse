=head1 NAME

Script::FlatFileToJson::FeatureStream::BioPerl - feature stream class
for working with BioPerl seqfeature objects

=cut

package Bio::JBrowse::FeatureStream::BioPerl;
use strict;
use warnings;
use base 'Bio::JBrowse::FeatureStream';

sub next_items {
    my ( $self ) = @_;
    return map $self->_bp_to_hashref( $_ ),
           $self->{stream}->();
}

# downconvert a bioperl feature object back to bare-hashref-format
sub _bp_to_hashref {
    my ( $self, $f ) = @_;
    no warnings 'uninitialized';

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
        $h{$_} = undef if $h{$_} eq '.';
    }
    $h{attributes} = {
        map {
            my $t = $_;
            $t => [ grep $_ ne '.', $f->get_tag_values($t) ]
        } $f->get_all_tags
    };

    if( ! $h{attributes}{Name} and defined( my $label = $self->_label( $f ) )) {
        $h{attributes}{Name} = [ $label ];
    }
    return \%h;
};

sub _label {
    my ( $self, $f ) = @_;
    if( $f->can('display_name') and defined( my $dn = $f->display_name )) {
        return $dn
    }
    elsif( $f->can('get_tag_values') ) {
        my $n = eval { ($f->get_tag_values('Name'))[0] };
        return $n if defined $n;

        my $a = eval { ($f->get_tag_values('Alias'))[0] };
        return $a if defined $a;
    }
    elsif( $f->can('attributes') ) {
	return $f->attributes('load_id') if defined $f->attributes('load_id');
	return $f->attributes('Name')    if defined $f->attributes('Name');
	return $f->attributes('Alias')   if defined $f->attributes('Alias');
    }
    return;
}

1;
