#!/usr/bin/env perl

=head1 NAME

Script::FlatfileToJson - implementation of bin/flatfile-to-json.pl

=head1 DESCRIPTION

Do C<perldoc bin/flatfile-to-json.pl> for most of the documentation.

=cut

package Bio::JBrowse::Cmd::FlatFileToJson;

use strict;
use warnings;

use base 'Bio::JBrowse::Cmd::NCFormatter';

use Bio::JBrowse::JSON;

sub option_defaults {
    ( type => [],
      out => 'data',
      cssClass => 'feature',
      sortMem => 1024 * 1024 * 512,
      maxLookback => 10000
    )
}

sub option_definitions {
    (
        "gff=s",
        "bed=s",
        "gbk=s",
        "bam=s",
        "out=s",
        "trackLabel=s",
        "trackType=s",
        "key=s",
        "cssClass|className=s",
        "autocomplete=s",
        "getType",
        "getPhase",
        "getSubs|getSubfeatures",
        "noSubfeatures",
        "getLabel",
        "urltemplate=s",
        "menuTemplate=s",
        "arrowheadClass=s",
        "subfeatureClasses=s",
        "maxLookback=i",
        "clientConfig=s",
        "config=s",
        "metadata=s",
        "thinType=s",
        "thickType=s",
        "type=s@",
        "nclChunk=i",
        "compress",
        "sortMem=i",
        "help|h|?",
        "nameAttributes=s",
    )
}

sub run {
    my ( $self ) = @_;

    Pod::Usage::pod2usage( "Must provide a --trackLabel parameter." ) unless defined $self->opt('trackLabel');
    unless( defined $self->opt('gff') ||
	    defined $self->opt('bed') ||
	    defined $self->opt('gbk') ||
	    defined $self->opt('bam')
	) {
        Pod::Usage::pod2usage( "You must supply either a --gff or --bed or --gbk parameter." )
    }

    $self->opt('bam') and die "BAM support has been moved to a separate program: bam-to-json.pl\n";
    if($self->opt('trackLabel') =~ /\//) {
        die "ERROR: trackLabel cannot contain slashes, use --key which can contain slashes\n";
    }

    if( ! $self->opt('nclChunk') ) {
        # default chunk size is 50KiB
        my $nclChunk = 50000;
        # $nclChunk is the uncompressed size, so we can make it bigger if
        # we're compressing
        $nclChunk *= 4 if $self->opt('compress');
        $self->opt( nclChunk => $nclChunk );
    }

    for my $optname ( qw( clientConfig subfeatureClasses metadata config ) ) {
        if( my $o = $self->opt($optname) ) {
            $self->opt( $optname => Bio::JBrowse::JSON->new->decode( $o ));
        }
    }


    # Merge configurations
    my %config = (
        %{ $self->opt('config') || {} },

        trackType      => $self->opt('trackType'),
        style          => {
            %{ $self->opt('clientConfig') || {} },
            className      => $self->opt('cssClass'),
            ( $self->opt('urltemplate')       ? ( linkTemplate      => $self->opt('urltemplate')       ) : () ),
            ( $self->opt('arrowheadClass')    ? ( arrowheadClass    => $self->opt('arrowheadClass')    ) : () ),
            ( $self->opt('subfeatureClasses') ? ( subfeatureClasses => $self->opt('subfeatureClasses') ) : () ),
        },
        ( $self->opt('metadata') ? ( metadata => $self->opt('metadata') ) : () ),
        ( $self->opt('category') ? ( category => $self->opt('menuTemplate') ) : () ),
        key          => defined( $self->opt('key') ) ? $self->opt('key') : $self->opt('trackLabel'),
        compress     => $self->opt('compress'),
     );

    my $feature_stream = $self->opt('gff') ? $self->make_gff_stream :
                         $self->opt('bed') ? $self->make_bed_stream :
                         $self->opt('gbk') ? $self->make_gbk_stream :
                             die "Please specify --gff or --bed or --gbk.\n";

    # build a filtering subroutine for the features
    my $types = $self->opt('type');
    @$types = split /,/, join ',', @$types;
    my $filter = $self->make_feature_filter( $types );

    $self->_format( trackConfig   => \%config,
                    featureStream => $feature_stream,
                    featureFilter => $filter,
                    trackLabel    => $self->opt('trackLabel')
                  );

    return 0;
}


sub make_gff_stream {
    my $self = shift;

    require Bio::GFF3::LowLevel::Parser;
    require Bio::JBrowse::FeatureStream::GFF3_LowLevel;

    my $p = Bio::GFF3::LowLevel::Parser->open( $self->opt('gff') );
    $p->max_lookback( $self->opt('maxLookback') );

    return Bio::JBrowse::FeatureStream::GFF3_LowLevel->new(
        parser => $p,
        no_subfeatures => $self->opt('noSubfeatures'),
        track_label => $self->opt('trackLabel'),
        name_attrs => $self->_name_attrs
     );
}

sub make_bed_stream {
    my ( $self ) = @_;

    require Bio::FeatureIO;
    require Bio::JBrowse::FeatureStream::BioPerl;

    my $io = Bio::FeatureIO->new(
        -format => 'bed',
        -file   => $self->opt('bed'),
        ($self->opt('thinType')  ? ("-thin_type"  => $self->opt('thinType') ) : ()),
        ($self->opt('thickType') ? ("-thick_type" => $self->opt('thickType')) : ()),
        );

    return Bio::JBrowse::FeatureStream::BioPerl->new(
        no_subfeatures => $self->opt('noSubfeatures'),
        stream => sub { $io->next_feature },
        track_label => $self->opt('trackLabel'),
        name_attrs => $self->_name_attrs
    );
}

sub make_gbk_stream {
    my $self = shift;

    require Bio::JBrowse::FeatureStream::Genbank::Parser;
    require Bio::JBrowse::FeatureStream::Genbank;

    my $parser = Bio::JBrowse::FeatureStream::Genbank::Parser->new;
    $parser->file( $self->opt('gbk') );

    return Bio::JBrowse::FeatureStream::Genbank->new(
         parser => $parser,
         track_label => $self->opt('trackLabel'),
         name_attrs => $self->_name_attrs
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
            no warnings 'uninitialized';
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
            : _find_passing_features( $pass_feature, @{$feature->{subfeatures}} );
    } @_;
}

1;
