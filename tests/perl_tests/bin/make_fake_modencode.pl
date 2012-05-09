#!/usr/bin/env perl

=head1 DESCRIPTION

Takes a simile-format JSON file of modENCODE track metadata, and makes
a fake JBrowse data directory with a configuration that matches it.

=cut

use strict;
use warnings;
use autodie ':all';

use Storable 'dclone';

use JSON;
use File::Slurp 'slurp';

my $metadata = from_json( slurp(@ARGV) );
my $volvox_tracklist = from_json( slurp('sample_data/json/volvox/trackList.json') );

system <<'';
set -e;
cp -r sample_data/json/volvox sample_data/json/modencode
rm -rf sample_data/json/modencode/tracks;
mkdir sample_data/json/modencode/tracks;
ln -s ../../volvox/tracks/volvox_microarray.wig sample_data/json/modencode/tracks/volvox_microarray.wig;

# make a trackList.json to match
my $tracklist = dclone( $volvox_tracklist );
my $microarray_conf = (grep $_->{label} eq 'volvox_microarray.wig', @{ $volvox_tracklist->{tracks}})[0];
$tracklist->{tracks} = [
    $tracklist->{tracks}[0], #DNA track
];

for my $tracklabel ( map $_->{label}, @{ $metadata->{items} } ) {
    my $trackconf = dclone( $microarray_conf );
    $trackconf->{label} = $trackconf->{key} = $tracklabel;
    push @{$tracklist->{tracks}}, $trackconf;
}

{ open my $f, '>', 'sample_data/json/modencode/trackList.json';
  $f->print( to_json( $tracklist ) );
}

