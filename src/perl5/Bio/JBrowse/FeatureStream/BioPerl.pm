=head1 NAME

Script::FlatFileToJson::FeatureStream::BioPerl - feature stream class
for working with BioPerl seqfeature objects

=cut

package Bio::JBrowse::FeatureStream::BioPerl;
use strict;
use warnings;
use base 'Bio::JBrowse::FeatureStream';

use List::MoreUtils 'uniq';

sub next_items {
    my ( $self ) = @_;
    return map $self->_bp_to_hashref( $_ ),
           $self->{stream}->();
}

# downconvert a bioperl feature object back to bare-hashref-format
sub _bp_to_hashref {
    my ( $self, $f ) = @_;
    no warnings 'uninitialized';

    my %h = (
        seq_id => scalar $f->seq_id,
        start  => scalar $f->start,
        end    => scalar $f->end,
        strand => scalar $f->strand,
        source => scalar $f->source_tag,
        phase  => {0=>0,1=>1,2=>2}->{$f->phase},
        type   => ( $f->primary_tag || undef )
    );

    if( $f->can('score') ) {
        $h{score} = $f->score;
    }
    for(qw( seq_id start end strand source type )) {
        if( $h{$_} eq '.' ) {
            delete $h{$_};
        }
    }
    for ( sort keys %h ) {
        if( ! defined $h{$_} ) {
            delete $h{$_};
        } else {
            $h{$_} = [ $h{$_} ];
        }
    }
    my @subfeatures = $f->get_SeqFeatures;
    if( @subfeatures ) {
        $h{subfeatures} = [[ map $self->_bp_to_hashref($_), @subfeatures ]];
    }

    for my $tag ( $f->get_all_tags ) {
        my $lctag = lc $tag;
        push @{ $h{ $lctag } ||= [] }, $f->get_tag_values($tag);
    }

    for ( sort keys %h ) {
        $h{$_} = [ uniq grep { defined && ($_ ne '.') } @{$h{$_}} ];
        unless( @{$h{$_}} ) {
            delete $h{$_};
        }
    }

    if( ! $h{name} and defined( my $label = $self->_label( $f ) )) {
        $h{name} = [ $label ];
    }

    return $self->_flatten_multivalues( \%h );
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
