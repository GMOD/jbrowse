#!/usr/bin/env perl
use strict;
use warnings;

use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";
use JBlibs;

use IO::Handle;
use Pod::Usage;

use Bio::JBrowse::JSON;

@ARGV or pod2usage( -verbose => 2 );

# read in the JSON
my $j = Bio::JBrowse::JSON->new->pretty;
my $json_fh =
    @ARGV == 1 ? \*STDIN : do {
        my $file = shift @ARGV;
        open( my $fh, '<', $file ) or die "$! reading $file";
        $fh
    };
my $track_data = $j->decode( do{ local $/; scalar <$json_fh> } );

# if it's a single definition, coerce to an array
if( ref $track_data eq 'HASH' ) {
    $track_data = [ $track_data ];
}

# validate the track JSON structure
for my $def ( @$track_data ) {
    $def->{label} or die "invalid track JSON: missing a label element\n";
}

# read and parse the target file
my $target_file = shift @ARGV or pod2usage();
my $target_file_data = $j->decode_file( $target_file );

for my $def ( @$track_data ) {
    for( my $i = 0; $i < @{$target_file_data->{tracks}|| []}; $i++ ) {
        my $track = $target_file_data->{tracks}[$i];
        if( $track->{label} eq $def->{label} ) {
            $target_file_data->{tracks}[$i] = $def;
            undef $def;
        }
    }

    if( $def ) {
        push @{ $target_file_data->{tracks} ||= [] }, $def;
    }
}

{
    open my $fh, '>', $target_file or die "$! writing $target_file";
    print $fh $j->encode( $target_file_data );
}


__END__

=head1 NAME

add-track-json.pl - add a single JSON track configuration snippet(from STDIN
or from a file) to the given JBrowse configuration file

=head1 DESCRIPTION

Reads a block of JSON describing a track from a file or from standard
input or from a file, and adds it to the target JBrowse configuration
file.

For example, if you wanted to add a sequence track to
data/trackList.json, you could run something like:

  echo ' { "urlTemplate" : "seq/{refseq}/",
           "label" : "DNA",
           "type" : "SequenceTrack"
         } ' | bin/add-track-json.pl data/trackList.json


=head1 USAGE

  bin/add-track-json.pl myTrack.json data/trackList.json

  # OR

  cat track.json | bin/add-track-json.pl data/trackList.json

=head2 OPTIONS

none yet

=cut
