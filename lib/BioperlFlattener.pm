=head1 NAME

BioperlFlattener - configurably transform BioPerl feature objects to arrayrefs

=head1 SYNOPSIS

  my $flattener = BioperlFlattener->new(
                      $track->{"track"},
                      \%style,
                      [],
                      [],
                    );

  my $startCol = BioperlFlattener->startIndex;
  my $endCol = BioperlFlattener->endIndex;

  my $arrayref = $flattener->flatten_to_feature($feature);

=head1 METHODS

=cut

package BioperlFlattener;

use strict;
use warnings;
use JsonGenerator;
use NameHandler;

#in JSON, features are represented by arrays (we could use
#hashes, but then we'd have e.g. "start" and "end" in the JSON
#for every feature, which would take up too much space/bandwidth)
#@featMap maps from feature objects to arrays
my @featMap = (
	       sub {$_[0]->start - 1},
	       sub {int($_[0]->end)},
	       sub {int($_[0]->strand)},
               sub {$_[0]->source_tag},
	      );

my @mapHeaders = ( 'start', 'end', 'strand','source');
#positions of "start" and "end" in @mapHeaders (for NCList)
my $startIndex = 1;
my $endIndex   = 2;
#position of the lazy subfeature file name in the fake feature.
my $lazyIndex = 3;

sub featureLabelSub {
    return $_[0]->display_name if $_[0]->can('display_name');
    return $_[0]->info         if $_[0]->can('info'); # deprecated
    return $_[0]->seq_id       if $_[0]->can('seq_id');
    return eval{$_[0]->primary_tag};
}

my %builtinDefaults =
  (
   "label"        => \&featureLabelSub,
   "autocomplete" => "none",
   "class"        => "feature"
  );

=head2 new( $trackLabel, \%setStyle, \@extraMap, \@extraHeaders )

=cut

sub new {
    my ($class, $label, $setStyle,
        $extraMap, $extraHeaders ) = @_;

    my %style = ("key" => $label,
                 %builtinDefaults,
		 %$setStyle);

    JsonGenerator::evalSubStrings(\%style);

    my $self = {};

    $self->{style} = \%style;
    $self->{label} = $label;
    $self->{getLabel} = ($style{autocomplete} =~ /label|all/);
    $self->{getAlias} = ($style{autocomplete} =~ /alias|all/);

    my $idSub = $style{idSub} || sub  {
        my ( $f ) = @_;
        return eval { $f->load_id } || eval { $f->primary_id } || eval { $f->id };
    };

    my @curFeatMap = @featMap;
    my @curMapHeaders = @mapHeaders;

    unless ($style{noId}) {
        push @curFeatMap, $idSub;
        push @curMapHeaders, "id";
    }

    @curFeatMap = (@curFeatMap, @$extraMap);
    @curMapHeaders = (@curMapHeaders, @$extraHeaders);

    if ($style{label}) {
        $style{label} = \&defaultLabelSub unless ref $style{label} eq 'CODE';
        push @curFeatMap, $style{label};
	push @curMapHeaders, "name";
    }

    if ($style{phase}) {
        push @curFeatMap, sub {
            no warnings qw/ numeric uninitialized /;
            my $p = shift->phase;
            $p += 0;
            return undef unless $p == 0 || $p == 1 || $p == 2;
            return $p;
        };
        push @curMapHeaders, "phase";
    }

    if ($style{type}) {
        push @curFeatMap, sub {shift->primary_tag};
        push @curMapHeaders, "type";
    }

    if ($style{extraData}) {
        foreach my $extraName (keys %{$style{extraData}}) {
            push @curMapHeaders, $extraName;
            push @curFeatMap, $style{extraData}->{$extraName};
        }
    }

    my @subfeatMap = ( sub {1}, @featMap, sub {shift->primary_tag});
    my @subfeatHeaders = (@mapHeaders, "type");

    if ($style{subfeatures}) {
        my $get_subfeatures = sub {
            my ($feat, $flatten) = @_;
            my @subFeatures = $feat->get_SeqFeatures
                or return undef;
            return [
                map {
                    my $subfeat = $_;
                    [ map scalar $_->($subfeat), @subfeatMap ]
                } @subFeatures
            ];
        };
        push @curFeatMap, $get_subfeatures;
        push @subfeatMap, $get_subfeatures;
        push @curMapHeaders, 'subfeatures';
        push @subfeatHeaders, 'subfeatures';
    }

    my @nameMap =
      (
       sub {$label},
       $style{label},
       sub {ref($_[0]->seq_id) ? $_[0]->seq_id->value : $_[0]->seq_id},
       sub {int(shift->start) - 1},
       sub {int(shift->end)},
       sub {$_[0]->can('primary_id') ? $_[0]->primary_id : $_[0]->id}
      );

    if ($self->{getLabel} || $self->{getAlias}) {
	if ($self->{getLabel} && $self->{getAlias}) {
	    unshift @nameMap, sub {[unique( ($style{label} || \&defaultLabelSub)->($_[0]),
					   $_[0]->get_tag_values("Alias"))]};
	} elsif ($self->{getLabel}) {
	    unshift @nameMap, sub {[$style{label}->($_[0])]};
	} elsif ($self->{getAlias}) {
	    unshift @nameMap, sub {[$_[0]->get_tag_values("Alias")]};
	}
    }

    $self->{sublistIndex} = $#curFeatMap + 1;

    $_ = ucfirst for @curMapHeaders, @subfeatHeaders;

    $self->{nameMap} = \@nameMap;
    $self->{curFeatMap} = \@curFeatMap;
    $self->{curMapHeaders} = \@curMapHeaders;
    $self->{subfeatMap} = \@subfeatMap;
    $self->{subfeatHeaders} = \@subfeatHeaders;
    $self->{features} = [];

    bless $self, $class;
}

=head2 flatten_to_feature( $feature_object, $class_index )

Flatten a Bio::SeqFeatureI object into an arrayref representing the
feature.  Takes an optional C<$class_index> for the L<ArrayRepr>
class.

=cut

sub flatten_to_feature {
    my ( $self, $feature, $class_index ) = @_;
    [ $class_index || 0, map scalar($_->($feature)), @{$self->{curFeatMap}} ];
}

=head2 flatten_to_name( $feature_object, $refseq_name )

If appropriate for this track, flatten the feature to an arrayref
suitable for passing to a L<NameHandler>.

Optionally takes a $refseq_name, the name of the reference sequence
for this feature.

Returns nothing if name-handling is not selected for this track (based
on the configuration passed when this flattener object was created).

=cut

sub flatten_to_name {
    my ( $self, $feature, $segName ) = @_;

    return unless $self->{getLabel} || $self->{getAlias};

    my @namerec = map scalar($_->($feature)), @{$self->{nameMap}};
    $namerec[ $NameHandler::chromIndex ] = $segName if defined $segName;

    return \@namerec;
}


=head2 featureHeaders()

=cut

sub featureHeaders {
    my ($self) = @_;
    return $self->{curMapHeaders};
}


=head2 subfeatureHeaders()

=cut

sub subfeatureHeaders {
    my ($self) = @_;
    return $self->{subfeatHeaders};
}

=head2 startIndex()

=cut

sub startIndex {
    return $startIndex;
}

=head2 endIndex

=cut

sub endIndex {
    return $endIndex;
}

sub unique {
    my %saw;
    return (grep(defined($_) && !$saw{$_}++, @_));
}


###################

sub defaultLabelSub {
    my ( $f ) = @_;
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
