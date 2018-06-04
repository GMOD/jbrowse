package Bio::JBrowse::ConfigurationManager;

use strict;
use warnings;

use Carp;
$SIG{ __DIE__ } = sub { Carp::confess( @_ ) };

use Storable 'dclone';

use File::Basename 'dirname';
use File::Spec;

use JSON 2;

use Bio::JBrowse::ConfigurationFile;

sub new {
    my $class = shift;
    return bless { @_ }, $class;
}

sub slurpJSON {
    my ($file) = @_;

    my $text = do {
        local $/;
        open my $f, '<', $file or die "$! reading $file";
        <$f>
    };

    my $json = eval { JSON->new->decode($text) };
    die "syntax error in $file: $@" if $@;
    return $json;
}

sub get_final_config {
    my ( $self ) = @_;
    my $bootstrapConf = $self->{conf};

     my $includedConfig = $self->_load_includes( $bootstrapConf );

    # merge the boot config *into* the included config last, so
    # that values in the boot config override the others
    my $finalConf = $self->_merge_configs( $includedConfig, $bootstrapConf );

    $finalConf->{tracks} ||= [];
    # sort the tracks by label so they are always in a stable order
    @{$finalConf->{tracks}} = sort { $a->{label} cmp $b->{label} } @{$finalConf->{tracks}};

    return $finalConf;
}

sub _get_config_type {
    my ( $self, $config_def ) = @_;
    return $config_def->{format} eq 'conf' ? 'conf' : 'json';
}

sub _load_includes {
    my ( $self, $config, $upstreamConf ) = @_;
    $config = dclone($config);
    my $sourceUrl = $config->{sourceUrl} || $config->{baseUrl};
    $sourceUrl = dirname($sourceUrl) if $sourceUrl && -f $sourceUrl;

    my $newUpstreamConf = $self->_merge_configs( dclone($upstreamConf || {}), $config );
    my @includes = $self->_regularize_includes( $config->{include} );
    delete $config->{include};

    my @includedDataObjects = map {
        my $include = $_;
        my $includedData = $self->_load_include( $include, $sourceUrl );
        $self->_load_includes( $includedData, $newUpstreamConf );
    } @includes;

    for my $includedData (@includedDataObjects) {
        $config = $self->_merge_configs( $config, $includedData );
    }

    return $config;
}


sub _merge_configs {
    my ( $self, $a, $b ) = @_;

    return $a unless ref $b eq 'HASH';

    $a ||= {};

    for my $prop (keys %$b) {
        if ( $prop eq 'tracks' && $a->{$prop} ) {
            $a->{tracks} = $self->_merge_track_configs( $a->{tracks} || [], $b->{tracks} || [] );
        }
        elsif ( ! $self->_no_recursive_merge( $prop )
                  && exists $a->{$prop}
                  && (ref $b->{$prop} eq 'HASH')
                  && (ref $a->{$prop} eq 'HASH')) {
            $a->{$prop} = { %{$a->{$prop}}, %{$b->{$prop}}};
        } elsif (! defined $a->{$prop} || defined $b->{$prop}) {
            #print "defined $prop\n";
            $a->{$prop} = $b->{$prop};
        }
        else {
            #print "ignore $prop: $a->{$prop}, $b->{$prop}\n"
        }
    }

    return $a;
}

sub _no_recursive_merge {
    my ( $self, $propname ) = @_;
    return $propname eq 'datasets';
}

sub _merge_track_configs {
    my ( $self, $a, $b ) = @_;

    return $a unless @$b;

    # index the tracks in `a` by track label
    my %aTracks;
    for my $aT (@$a) {
        $aTracks{$aT->{label}} = $aT;
    }

    for my $bT (@$b) {
        my $aT = $aTracks{$bT->{label}};
        if( $aT ) {
            $self->_merge_configs( $aT, $bT );
        } else {
            push @$a, $bT
        }
    }

    return $a;
}

sub _load_include {
    my ( $self, $include, $baseUrl ) = @_;
    # instantiate the adaptor and load the config
    my $type = $self->_get_config_type( $include );
    my $path = File::Spec->rel2abs( $include->{url}, $baseUrl );
    return {} unless -f $path;
    my $data = $type eq 'conf'
        ? Bio::JBrowse::ConfigurationFile->new( path => $path )->to_hashref
        : slurpJSON( $path );
    $data->{sourceUrl} = $path;
    return $data;
}

sub _regularize_includes {
    my ($self, $includes) = @_;

    return unless $includes;

    # coerce include to an array
    $includes = [ $includes ] unless ref $includes eq 'ARRAY';

    # include array might have undefined elements in it if
    # somebody left a trailing comma in and we are running under
    # IE
    @$includes = grep $_, @$includes;

    return map {
        my $include = $_;

        # coerce bare strings in the includes to URLs
        $include = { url => $include } unless ref $include;

        # set defaults for format and version
        $include->{format} ||= $include->{url} =~ /\.conf$/ ? 'conf' : 'JB_json';

        if( $include->{format} eq 'JB_json' && ! $include->{version} ) {
            $include->{version} = 1;
        }

        $include;
    } @$includes
}


1;
