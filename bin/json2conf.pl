#!/usr/bin/env perl

=head1 NAME

json2conf.pl - convert JBrowse JSON conf files into the new text
format that is easier to hand-edit

=head1 USAGE

  json2conf.pl file.json > file.conf

=head1 OPTIONS

=over 4

=item --track | -t

The file is a track configuration of the type used with add-track-json.pl.

=cut

use strict;
use warnings;

use Getopt::Long;
use Pod::Usage;
use JSON 2;

my $isTrackConf;
my $help;
GetOptions( "track|t" => \$isTrackConf,
            "help|h|?" => \$help
            )
  or pod2usage();
$help and pod2usage( verbose => 2 );
@ARGV or pod2usage();

for my $file ( @ARGV ) {
    my $data = JSON->new->relaxed->decode( do {
        open my $f, $file or die "$! reading $file";
        local $/;
        scalar <$f>
    });

    if( $isTrackConf ) {
        if( ref $data ne 'ARRAY' ) {
            $data = [ $data ];
        }
        $data = { tracks => $data };
    }

    eval {
        print to_conf( $data );
    }; if( $@ ) {
        die "error converting $file: $@";
    }
}

exit;

###########################################

sub to_conf {
    my ( $data ) = @_;

    my $out = '';

    ref $data eq 'HASH'
        or die "invalid conf data: $data";

    while( my ( $key, $val ) = each %$data ) {
        $key =~ s/\./_/g;
        my $ref = ref $val;
        if( $key eq 'tracks' ) {
            $out .= convert_tracks( $val );
        }
        elsif( $ref eq 'HASH' ) {
            $out .= "\[ $key \]\n";
            $out .= to_flat_kv( $val );
        }
        elsif( $ref eq 'ARRAY' ) {
            for my $subv ( @$val ) {
                if( ref $subv ) {
                    $subv = 'json:'.JSON->new->encode( $subv );
                }
                $out .= "$key += $subv\n";
            }
        }
        else {
            $out .= "$key = $val\n";
        }
    }

    return $out;
}

sub convert_tracks {
    my ( $tracks ) = @_;
    my $out = '';
    for my $track ( @$tracks ) {
        $track->{label} =~ s/\./_/g;
        $out .= "[ tracks . $track->{label} ]\n";
        delete $track->{label};
        $out .= to_flat_kv( $track);
    }
    return $out;
}


sub to_flat_kv {
    my ( $data, $path ) = @_;
    $path ||= '';
    my $out = '';

    while( my ( $key, $val ) = each %$data ) {
        $key =~ s/\./_/g;
        my $ref = ref $val;
        if( $ref eq 'HASH' ) {
            $out .= to_flat_kv( $val, "$path$key." );
        }
        elsif( $ref eq 'ARRAY' ) {
            for my $subv ( @$val ) {
                if( ref $subv ) {
                    $subv = 'json:'.JSON->new->encode( $subv );
                }
                $out .= "$path$key += $subv\n";
            }
        }
        else {
            $out .= "$path$key = $val\n";
        }
    }
    return $out;
}
