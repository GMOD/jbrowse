=head1 NAME

GenomeDB - central "handle" for a directory tree of JBrowse JSON data

=head1 SYNOPSIS

    my $gdb = GenomeDB->new( '/path/to/data/dir' );

    my $track = $gdb->getTrack($tableName, $trackConfig, $track->{shortLabel} );
    #returns an object for the track, e.g. a FeatureTrack

    unless( defined $track ) {
        $track = $gdb->createFeatureTrack( $trackLabel,
                                           $trackConfig,
                                           $track->{shortLabel} );
    }

=head1 DESCRIPTION

Central "handle" on a directory tree of JBrowse JSON data, containing
accessors for accessing the tracks and (soon) reference sequences it
contains.

=head1 METHODS

=cut

package GenomeDB;

use strict;
use warnings;

use File::Spec;
use IO::File;
use Storable 'dclone';

use Hash::Merge ();

use JsonFileStorage;

use Bio::JBrowse::ConfigurationManager;

my $defaultTracklist = {
                        formatVersion => 1,
                        tracks => []
                       };

my $trackListPath = "trackList.json";
my @trackDirHeirarchy = ("tracks", "{tracklabel}", "{refseq}");

=head2 new( '/path/to/data/dir' )

Create a new handle for a data dir.

=cut

sub new {
    my ($class, $dataDir) = @_;

    my $self = {
                dataDir => $dataDir,
                rootStore => JsonFileStorage->new($dataDir, 0, {pretty => 1}),
                trackDirTempl => File::Spec->join($dataDir, @trackDirHeirarchy),
                trackUrlTempl => join("/", @trackDirHeirarchy)
               };
    bless $self, $class;

    # drop a .htaccess file in the root of the data dir to apply CORS
    # requests
    {
        my $f = File::Spec->catfile($dataDir,'.htaccess');
        open my $ht, '>', $f
            or die "$! writing $f";
        $ht->print( $self->CORS_htaccess );
    }

    return $self;
}

=head2 writeTrackEntry( $track_object )

Record an entry for a new track in the data dir.

=cut

sub writeTrackEntry {
    my ($self, $track) = @_;

    my $setTrackEntry = sub {
        my ($trackData) = @_;
        unless (defined($trackData)) {
            $trackData = $defaultTracklist;
        }
        # we want to add this track entry to the "tracks" list,
        # replacing any existing entry with the same label,
        # and preserving the original ordering
        my $trackIndex;
        my $trackList = $trackData->{tracks};
        foreach my $index (0..$#{$trackList}) {
            $trackIndex = $index
              if ($trackList->[$index]->{label} eq $track->label);
        }
        $trackIndex = ($#{$trackList} + 1) unless defined($trackIndex);

        $trackList->[$trackIndex] = {
                                     %{ $track->config || {} },
                                     type => $track->config->{trackType} || $track->type,
                                     label => $track->label,
                                     key => $track->key,
                                    };

        return $trackData;
    };

    $self->modifyTrackList( $setTrackEntry );
}

=head2 modifyTrackList( sub {} )

Modify the trackList.json file with the given subroutine.

=cut

sub modifyTrackList {
    my ( $self, $sub ) = @_;
    $self->{rootStore}->touch( 'tracks.conf' );
    $self->{rootStore}->modify($trackListPath, $sub);
}


=head2 createFeatureTrack( $label, \%config, $key, $jsclass )

Create a new FeatureTrack object in this data dir with the given
label, config, key, and (JavaScript) class.

$jsclass is optional, and defaults to C<FeatureTrack>.

=cut

sub createFeatureTrack {
    my $self = shift;
    push( @_, 'FeatureTrack' ) if @_ < 4;
    $self->_create_track( FeatureTrack => @_ );
}

=head2 createImageTrack( $label, \%config, $key, $jsclass )

Create a new ImageTrack object in this data dir with the given
label, config, key, and (JavaScript) class.

$jsclass is optional, and defaults to C<ImageTrack>.

=cut

sub createImageTrack {
    my $self = shift;
    push( @_, 'ImageTrack' ) if @_ < 4;
    $self->_create_track( ImageTrack => @_ );
}

sub _create_track {
    my ($self, $class, $trackLabel, $config, $key, $jsclass) = @_;
    eval "require $class"; die $@ if $@;
    (my $baseUrl = $self->{trackUrlTempl}) =~ s/\{tracklabel\}/$trackLabel/g;
    return $class->new( $self->trackDir($trackLabel), $baseUrl,
                        $trackLabel, $config, $key, $jsclass );
}

=head2 getTrack( $trackLabel, $config, $key, $jsclass )

Get a track object (FeatureTrack or otherwise) from the GenomeDB.  If
$config, $key, and/or $jsclass are provided, they are merged into and
override the existing settings for that track.

=cut

sub getTrack {
    my ($self, $trackLabel, $config, $key, $jsclass ) = @_;

    my $trackList = $self->trackList();
    my ( $trackDesc ) = my @selected =
        grep { $_->{label} eq $trackLabel } @$trackList;

    return unless @selected;

    # this should never happen
    die "multiple tracks labeled $trackLabel" if @selected > 1;

    # merge the $config into the trackdesc
    if( $config ) {
        $trackDesc = {
            %$trackDesc,
            %$config,
            style => { %{$trackDesc->{style}||{}}, %{$config->{style}||{}} },
        };
    }
    # merge the $key into the trackdesc
    $trackDesc->{key} = $key if defined $key;
    # merge the jsclass into the trackdesc
    $trackDesc->{type} = $jsclass if defined $jsclass;


    my $type = $trackDesc->{type};
    $type =~ s/\./::/g;
    $type =~ s/[^\w:]//g;

    # make a list of perl packages to try, finding the most specific
    # perl track class that matches the type in the JSON file.  For
    # example, ImageTrack.Wiggle.Frobnicated will try first to require
    # ImageTrack::Wiggle::Frobnicated, then ImageTrack::Wiggle, then
    # finally ImageTrack.
    my @packages_to_try = ( $type );
    while( $type =~ s/::[^:]+$// ) {
        push @packages_to_try, $type;
    }
    for( @packages_to_try ) {
        eval "require $_";
        last unless $@;
    }
    die $@ if $@;

    (my $baseUrl = $self->{trackUrlTempl}) =~ s/\{tracklabel\}/$trackLabel/g;

    return $type->new( $self->trackDir($trackLabel),
                       $baseUrl,
                       $trackDesc->{label},
                       $trackDesc,
                       $trackDesc->{key},
                     );
}

# private method
# Get the data subdirectory for a given track, using its label.
sub trackDir {
    my ($self, $trackLabel) = @_;
    (my $result = $self->{trackDirTempl}) =~ s/\{tracklabel\}/$trackLabel/g;
    return $result;
}

=head2 refSeqs

Returns a arrayref of hashrefs defining the reference sequences, as:

    [ {
        name         => 'ctgB',
        seqDir       => 'seq/ctgB',

        start        => 0
        end          => 66,
        length       => 66,

        seqChunkSize => 20000,
      },
      ...
    ]

=cut

sub refSeqs {
    my $self = shift;
    my $conf = Bio::JBrowse::ConfigurationManager->new( conf => {
        baseUrl => "$self->{dataDir}",
        include => [ $trackListPath, 'tracks.conf' ],
    })->get_final_config;

    if(my $seqs = $conf->{refSeqs}) {
        if($seqs =~ /.fai$/) {
            my @refs;
            my $file = File::Spec->join($self->{dataDir}, $seqs);
            open FAI, "<$file" or die "Unable to read from $file $!\n";
            while (<FAI>) {
                if (/([^\t]+)\t(\d+)\t(\d+)\t(\d+)\t(\d+)/) {
                    push(@refs, {
                        name => $1,
                        start => 0,
                        end => $2+0,
                        offset => $3,
                        line_length => $4,
                        line_byte_length => $5
                    });
                } else {
                    die "Improperly-formatted line in fai file ($file):\n$_\n"
                }
            }
            close FAI;
            return \@refs;
        }
    } else {
        return $self->{rootStore}->get( 'seq/refSeqs.json', [] );
    }
}


=head2 trackList

Return an arrayref of track definition hashrefs similar to:

    [
        {
          compress => 0,
          feature => ["remark"],
          style => { className => "feature2" },
          track => "ExampleFeatures",
          urlTemplate => "tracks/ExampleFeatures/{refseq}/trackData.json",
          key    => "Example Features",
          label  => "ExampleFeatures",
          type   => "FeatureTrack",
        },
        ...
    ]

=cut

sub trackList {
    my ( $self ) = @_;
    my $conf = Bio::JBrowse::ConfigurationManager->new( conf => {
        baseUrl => "$self->{dataDir}",
        include => [ $trackListPath, 'tracks.conf' ],
    })->get_final_config;
    my $tracks = $conf->{tracks} || [];
    @$tracks = sort { $a->{label} cmp $b->{label} } @$tracks;
    return $tracks;
}

=head2 CORS_htaccess

Static method to return a string to write into a .htaccess file that
will instruct Apache (if AllowOverride is on) to set the proper
"Access-Control-Allow-Origin *" headers on data files to enable
cross-origin data sharing.

=cut

sub CORS_htaccess {
    my ( $self ) = @_;

    my $class = ref $self || $self;
    return <<EOA;
# This Apache .htaccess file is generated by JBrowse ($class) for
# allowing cross-origin requests as defined by the Cross-Origin
# Resource Sharing working draft from the W3C
# (http://www.w3.org/TR/cors/).  In order for Apache to pay attention
# to this, it must have mod_headers enabled, and its AllowOverride
# configuration directive must allow FileInfo overrides.
<IfModule mod_headers.c>
    Header onsuccess set Access-Control-Allow-Origin *
    Header onsuccess set Access-Control-Allow-Headers X-Requested-With,Range
</IfModule>
EOA

}

=head2 precompression_htaccess( @precompressed_extensions )

Static method to return a string to write into a .htaccess file that
will instruct Apache (if AllowOverride is on) to set the proper
"Content-Encoding gzip" headers on precompressed files (.jsonz and
.txtz).

=cut

sub precompression_htaccess {
    my ( $self, @extensions ) = @_;

    my $re = '('.join('|',@extensions).')$';
    $re =~ s/\./\\./g;

    my $package = ref $self || $self;
    return <<EOA;
# This Apache .htaccess file is generated by JBrowse ($package) for
# serving precompressed files (@extensions) with the proper
# Content-Encoding HTTP headers.  In order for Apache to pay attention
# to this, its AllowOverride configuration directive for this
# filesystem location must allow FileInfo overrides.
<IfModule mod_gzip.c>
    mod_gzip_item_exclude "$re"
</IfModule>
<IfModule setenvif.c>
    SetEnvIf Request_URI "$re" no-gzip dont-vary
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "$re">
    Header onsuccess set Content-Encoding gzip
  </FilesMatch>
</IfModule>
EOA
}


1;

=head1 AUTHOR

Mitchell Skinner E<lt>jbrowse@arctur.usE<gt>

Copyright (c) 2007-2011 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
