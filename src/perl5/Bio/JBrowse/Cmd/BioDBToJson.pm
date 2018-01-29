package Bio::JBrowse::Cmd::BioDBToJson;
use strict;
use warnings;

use GenomeDB;

use base 'Bio::JBrowse::Cmd::NCFormatter';

use Data::Dumper ();
use Pod::Usage ();
use Bio::JBrowse::JSON;

use Bio::JBrowse::FeatureStream::BioPerl;

sub option_defaults {
    ( out => 'data',
      cssClass => 'feature',
      sortMem => 1024 * 1024 * 512,
      nclChunk => 50_000
    )
}

sub option_definitions {(
    "conf=s",
    "ref=s",
    "refid=s",
    "track=s",
    "out=s",
    "nclChunk=i",
    "compress",
    "sortMem=i",
    "verbose|v+",
    "quiet|q",
    "help|?|h"
)}


sub run {
    my ( $self ) = @_;

    my $verbose = $self->opt('verbose');
    my $quiet   = $self->opt('quiet');

    # quadruple the ncl chunk size if compressing
    if( $self->opt('compress') ) {
        $self->opt('nclChunk', $self->opt('nclChunk') * 4 );
    }

    Pod::Usage::pod2usage( 'must provide a --conf argument' ) unless defined $self->opt('conf');

    my $gdb = GenomeDB->new( $self->opt('out') );

    # determine which reference sequences we'll be operating on
    my @refSeqs = @{ $gdb->refSeqs };
    if ( my $refid = $self->opt('refid') ) {
        @refSeqs = grep { $_->{id} eq $refid } @refSeqs;
        die "Didn't find a refseq with ID $refid (have you run prepare-refseqs.pl to supply information about your reference sequences?)" if $#refSeqs < 0;
    } elsif ( my $ref = $self->opt('ref') ) {
        @refSeqs = grep { $_->{name} eq $ref } @refSeqs;
        die "Didn't find a refseq with name $ref (have you run prepare-refseqs.pl to supply information about your reference sequences?)" if $#refSeqs < 0;
    }
    @refSeqs or die "run prepare-refseqs.pl first to supply information about your reference sequences";

    # read our conf file
    -r $self->opt('conf') or die "conf file not found or not readable";
    my $config = Bio::JBrowse::JSON->new->decode_file( $self->opt('conf') );

    # open and configure the db defined in the config file
    eval "require $config->{db_adaptor}; 1" or die $@;
    my $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})} or warn $@;
    die "Could not open database: $@" unless $db;
    if (my $refclass = $config->{'reference class'}) {
        eval {$db->default_class($refclass)};
    }
    $db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
    $db->absolute(1)               if $db->can('absolute');

    foreach my $seg (@refSeqs) {
        my $segName = $seg->{name};
        print "\nworking on refseq $segName\n" unless $quiet;

        # get the list of tracks we'll be operating on
        my @tracks = defined $self->opt('track')
                       ? grep { $_->{"track"} eq $self->opt('track') } @{$config->{tracks}}
                       : @{$config->{tracks}};

        foreach my $trackCfg ( @tracks ) {
            my $trackLabel = $trackCfg->{'track'};
            print "working on track $trackLabel\n" unless $quiet;

            my $mergedTrackCfg = $self->assemble_track_config(
                                     $config,
                                     { key      => $trackLabel,
                                       %$trackCfg,
                                       compress => $self->opt('compress') ? 1 : 0,
                                     },
                                 );

            print "mergedTrackCfg: " . Data::Dumper::Dumper( $mergedTrackCfg ) if $verbose && !$quiet;

            my @feature_types = @{$trackCfg->{"feature"}};
            next unless @feature_types;

            print "searching for features of type: " . join(", ", @feature_types) . "\n" if $verbose && !$quiet;
            # get the stream of the right features from the Bio::DB
            my $db_stream = $db->get_seq_stream( -seq_id => $segName,
                                                 -type   => \@feature_types);

            my $nameAttributes = $trackCfg->{nameAttributes}
                || ( ($trackCfg->{autocomplete}||'') eq 'none' ? [] : [qw[ name alias id ]] );
            my $feature_stream = Bio::JBrowse::FeatureStream::BioPerl->new(
                stream      => sub { $db_stream->next_seq },
                track_label => $trackLabel,
                name_attrs  => $nameAttributes
            );

            $self->_format( trackConfig => $mergedTrackCfg,
                            featureStream => $feature_stream,
                            trackLabel => $trackLabel,
                          );
        }
    }
}

sub assemble_track_config {
    my ( $self, $global_config, $track_config ) = @_;

    # merge the config
    my %cfg = (
        %{$global_config->{"TRACK DEFAULTS"}},
        %$track_config
        );

    # rename some of the config variables
    my %renamed_keys = qw(
        class               className
        subfeature_classes  subfeatureClasses
        urlTemplate         linkTemplate
    );
    for ( sort keys %cfg ) {
        if( my $new_keyname = $renamed_keys{ $_ } ) {
            $cfg{ $new_keyname } = delete $cfg{ $_ };
        }
    }

    # move some of the config variables to a nested 'style' hash
    my %style_keys = map { $_ => 1 } qw(
        subfeatureClasses
        arrowheadClass
        className
        histCss
        featureCss
        linkTemplate
    );
    for ( sort keys %cfg ) {
        if( $style_keys{$_} ) {
            $cfg{style}{$_} = delete $cfg{$_};
        }
    }

    return \%cfg;
}

1;
