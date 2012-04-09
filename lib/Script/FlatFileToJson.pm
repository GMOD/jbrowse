#!/usr/bin/env perl

=head1 NAME

Script::FlatfileToJson - implementation of bin/flatfile-to-json.pl

=head1 DESCRIPTION

Do C<perldoc bin/flatfile-to-json.pl> for most of the documentation.

=cut

package Script::FlatFileToJson;

use strict;
use warnings;

use base 'Script';

use ArrayRepr;
use GenomeDB;
use ExternalSorter;
use JSON 2;

sub option_defaults {
    ( type => [],
      autocomplete => 'none',
      out => 'data',
      cssClass => 'feature',
      sortMem => 1024 * 1024 * 512,
    )
}

sub option_definitions {
    (
        "gff=s",
        "bed=s",
        "bam=s",
        "out=s",
        "trackLabel|tracklabel=s",
        "key=s",
        "cssClass=s",
        "autocomplete=s",
        "getType",
        "getPhase",
        "getSubs|getSubfeatures",
        "getLabel",
        "urltemplate=s",
        "arrowheadClass=s",
        "subfeatureClasses=s",
        "clientConfig=s",
        "thinType=s",
        "thickType=s",
        "type=s@",
        "nclChunk=i",
        "compress",
        "sortMem=i",
        "help|h|?",
    )
}

sub run {
    my ( $self ) = @_;

    my $types = $self->opt('type');
    @$types = split /,/, join ',', @$types;

    my $gdb = GenomeDB->new( $self->opt('out') );

    Pod::Usage::pod2usage( "Must provide a --trackLabel parameter." ) unless defined $self->opt('trackLabel');
    unless( defined $self->opt('gff') || defined $self->opt('bed') || defined $self->opt('bam') ) {
        Pod::Usage::pod2usage( "You must supply either a --gff or --bed parameter." )
    }

    $self->opt('bam') and die "BAM support has been moved to a separate program: bam-to-json.pl\n";

    if( ! $self->opt('nclChunk') ) {
        # default chunk size is 50KiB
        my $nclChunk = 50000;
        # $nclChunk is the uncompressed size, so we can make it bigger if
        # we're compressing
        $nclChunk *= 4 if $self->opt('compress');
        $self->opt( nclChunk => $nclChunk );
    }

    for my $optname ( qw( clientConfig subfeatureClasses ) ) {
        if( my $o = $self->opt($optname) ) {
            $self->opt( $optname => JSON::from_json( $o ));
        }
    }


    my %config = (
        autocomplete => $self->opt('autocomplete'),
        type         => $self->opt('getType') || @$types ? 1 : 0,
        phase        => $self->opt('getPhase'),
        subfeatures  => $self->opt('getSubs'),
        style          => {
            %{ $self->opt('clientConfig') || {} },
            className      => $self->opt('cssClass'),
            ( $self->opt('urltemplate')       ? ( linkTemplate      => $self->opt('urltemplate')       ) : () ),
            ( $self->opt('arrowheadClass')    ? ( arrowheadClass    => $self->opt('arrowheadClass')    ) : () ),
            ( $self->opt('subfeatureClasses') ? ( subfeatureClasses => $self->opt('subfeatureClasses') ) : () ),
        },
        key          => defined( $self->opt('key') ) ? $self->opt('key') : $self->opt('trackLabel'),
        compress     => $self->opt('compress'),
     );

    my $feature_stream = $self->opt('gff') ? $self->make_gff_stream :
                         $self->opt('bed') ? $self->make_bed_stream( \%config ) :
                             die "Please specify --gff or --bed.\n";

    # The ExternalSorter will get flattened [chrom, [start, end, ...]]
    # arrays from the feature_stream
    my $sorter = ExternalSorter->new(
        do {
            my $startIndex = $feature_stream->startIndex;
            my $endIndex = $feature_stream->endIndex;
            sub ($$) {
                $_[0]->[0] cmp $_[1]->[0]
                    ||
                $_[0]->[1]->[$startIndex] <=> $_[1]->[1]->[$startIndex]
                    ||
                $_[1]->[1]->[$endIndex] <=> $_[0]->[1]->[$endIndex];
            }
        },
        $self->opt('sortMem'),
    );

    my @arrayrepr_classes = (
        {
            attributes  => $feature_stream->featureHeaders,
            isArrayAttr => { Subfeatures => 1 },
        },
        {
            attributes  => $feature_stream->subfeatureHeaders,
            isArrayAttr => {},
        },
      );

    # build a filtering subroutine for the features
    my $filter = $self->make_feature_filter( $types );

    my %featureCounts;
    while ( my @feats = $feature_stream->next_items ) {

        for my $feat ( $filter->( @feats ) ) {
            my $chrom = $feat->{seq_id};
            $featureCounts{$chrom} += 1;

            my $row = [ $chrom,
                        $feature_stream->flatten_to_feature( $feat ),
                        $feature_stream->flatten_to_name( $feat ),
                        ];
            $sorter->add( $row );
        }
    }
    $sorter->finish();

    ################################

    my $track = $gdb->getTrack( $self->opt('trackLabel'), { %config, type => 'FeatureTrack' }, $config{key} )
                || $gdb->createFeatureTrack( $self->opt('trackLabel'),
                                             \%config,
                                             $config{key},
                                           );

    my $curChrom = 'NONE YET';
    my $totalMatches = 0;
    while( my $feat = $sorter->get ) {

        unless( $curChrom eq $feat->[0] ) {
            $curChrom = $feat->[0];
            $track->finishLoad; #< does nothing if no load happening
            $track->startLoad( $curChrom,
                               $self->opt('nclChunk'),
                               \@arrayrepr_classes,
                             );
        }
        $totalMatches++;
        $track->addSorted( $feat->[1] );

        # load the feature's name record into the track if necessary
        if( my $namerec = $feat->[2] ) {
            $track->nameHandler->addName( $namerec );
        }
    }

    $gdb->writeTrackEntry( $track );

    # If no features are found, check for mistakes in user input
    if( !$totalMatches && defined $types ) {
        warn "WARNING: No matching features found for @$types\n";
    }
}

sub make_gff_stream {
    my $self = shift;

    require Bio::GFF3::LowLevel::Parser;
    require Script::FlatFileToJson::FeatureStream::GFF3_LowLevel;

    my $p = Bio::GFF3::LowLevel::Parser->new( $self->opt('gff') );

    return Script::FlatFileToJson::FeatureStream::GFF3_LowLevel->new(
        parser => $p,
        track_label => $self->opt('trackLabel')
     );
}

sub make_bed_stream {
    my ( $self, $config_hash ) = @_;

    require Bio::FeatureIO;
    require Script::FlatFileToJson::FeatureStream::BioPerl;

    my $io = Bio::FeatureIO->new(
        -format => 'bed',
        -file   => $self->opt('bed'),
        ($self->opt('thinType')  ? ("-thin_type"  => $self->opt('thinType') ) : ()),
        ($self->opt('thickType') ? ("-thick_type" => $self->opt('thickType')) : ()),
        );

    return Script::FlatFileToJson::FeatureStream::BioPerl->new(
        stream => sub { $io->next_feature },
        track_label => $self->opt('trackLabel'),
    );
}

sub make_feature_filter {
    my ( $self, $types ) = @_;

    my @filters;

    # add a filter for type:source if --type was specified
    if( $types && @$types ) {
        my @type_regexes = map {
            my $t = $_;
            $t .= ":.*" unless $t =~ /:/;
            qr/^$t$/
        } @$types;

        push @filters, sub {
            my ($f) = @_;
            my $type = $f->{type}
                or return 0;
            my $source = $f->{source};
            my $t_s = "$type:$source";
            for( @type_regexes ) {
                return 1 if $t_s =~ $_;
            }
            return 0;
        };
    }

    # if no filtering, just return a pass-through now.
    return sub { @_ } unless @filters;

    # make a sub that tells whether a single feature passes
    my $pass_feature = sub {
        my ($f) = @_;
        $_->($f) || return 0 for @filters;
        return 1;
    };

    # Apply this filtering rule through the whole feature hierarchy,
    # returning features that pass.  If a given feature passes, return
    # it *and* all of its subfeatures, with no further filtering
    # applied to the subfeatures.  If a given feature does NOT pass,
    # search its subfeatures to see if they do.
    return sub {
        _find_passing_features( $pass_feature, @_ );
    }
};

# given a subref that says whether an individual feature passes,
# return the LIST of features among the whole feature hierarchy that
# pass the filtering rule
sub _find_passing_features {
    my $pass_feature = shift;
    return map {
        my $feature = $_;
        $pass_feature->( $feature )
            # if this feature passes, we're done, just return it
            ? ( $feature )
            # otherwise, look for passing features in its subfeatures
            : _find_passing_features( $pass_feature, @{$feature->{child_features}} );
    } @_;
}

1;
