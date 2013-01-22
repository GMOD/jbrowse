=head1 NAME

FeatureStream - base class for feature streams
used for handling features inside FlatFileToJson.pm

=cut

package Bio::JBrowse::FeatureStream;
use strict;
use warnings;

use List::MoreUtils 'uniq';

sub new {
    my $class = shift;

    my $self = bless {
        @_,
        class_count => 0
    }, $class;

    return $self;
}

sub flatten_to_feature {
    my ( $self, $f ) = @_;
    my $class = $self->_get_class( $f );

    my @f = ( $class->{index},
              @{$f}{ @{$class->{fields}} }
            );

    for my $subfeature_field (qw( subfeatures derived_features )) {
        if( my $sfi = $class->{field_idx}{ $subfeature_field } ) {
            $f[ $sfi+1 ] = [
                map {
                    $self->flatten_to_feature($_)
                } @{$f[$sfi+1]}
            ];
        }
    }
    # use Data::Dump 'dump';
    # print dump($_)."\n" for \@f, $class;

    # convert start to interbase and numify it
    $f[1] -= 1;
    # numify end
    $f[2] += 0;
    # convert strand to 1/0/-1/undef if necessary, and numify it
    no warnings 'uninitialized';
    $f[3] = { '+' => 1, '-' => -1 }->{$f[3]} || $f[3] || undef;
    $f[3] += 0;
    return \@f;
}

my %skip_field = map { $_ => 1 } qw( start end strand );
sub _get_class {
    my ( $self, $f ) = @_;

    my @attrs = keys %$f;
    my $attr_fingerprint = join '-', @attrs;

    return $self->{classes}{$attr_fingerprint} ||= do {
        my @fields = ( 'start', 'end', 'strand', ( grep !$skip_field{$_}, @attrs ) );
        my $i = 0;
        {
            index  => $self->{class_count}++, # the classes start from 1.  so what.
            fields => \@fields,
            field_idx => { map { $_ => $i++ } @fields },
            # assumes that if a field is an array for one feature, it will be for all of them
            array_fields => [ grep ref($f->{$_}) eq 'ARRAY', @attrs ]
        }
    };
}

sub flatten_to_name {
    my ( $self, $f ) = @_;
    my @nameattrs = grep /^(name|id|alias)\d*$/, keys %$f;
    my @namerec = (
        [ grep defined, @{$f}{@nameattrs} ],
        $self->{track_label},
        $f->{name} || $f->{id} || $f->{alias},
        $f->{seq_id} || die,
        (map $_+0, @{$f}{'start','end'})
        );
    $namerec[4]--; #< to zero-based
    return \@namerec;
}
sub arrayReprClasses {
    my ( $self ) = @_;
    return [
        map {
            attributes  => [ map ucfirst, @{$_->{fields}} ],
            isArrayAttr => { map { ucfirst($_) => 1 } @{$_->{array_fields}} },
        },
        sort { $a->{index} <=> $b->{index} }
        values %{ $self->{classes} }
    ];
}

sub startIndex        { 1 }
sub endIndex          { 2 }


# given a hashref like {  tagname => [ value1, value2 ], ... }
# flatten it to numbered tagnames like { tagname => value1, tagname2 => value2 }
sub _flatten_multivalues {
    my ( $self, $h ) = @_;
    my %flattened;

    for my $key ( keys %$h ) {
        my $v = $h->{$key};
        for( my $i = 0; $i < @$v; $i++ ) {
            $flattened{ $key.($i ? $i+1 : '')} = $v->[$i];
        }
    }

    return \%flattened;
}

1;
