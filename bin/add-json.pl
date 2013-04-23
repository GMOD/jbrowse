#!/usr/bin/env perl
use strict;
use warnings;

use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";
use JBlibs;

use IO::Handle;
use Pod::Usage;

use JSON 2;

my $j = JSON->new->pretty->relaxed;

my ( $json, $filename ) = @ARGV;
pod2usage() unless $json && $filename;

die "cannot read '$filename' not found" unless -f $filename && -r $filename;

my $in = $j->decode( $json );
my $data = $j->decode(do {
    open my $f, '<', $filename or die "$! reading $filename";
    local $/;
    scalar <$f>
});

%$data = ( %$data, %$in );

open my $f, '>', $filename or die "$! writing $filename";
$f->print( $j->encode( $data ) );

__END__

=head1 NAME

add-json.pl - write values into an existing JSON file

=head1 USAGE

    # set dataset_id in an existing config file
    add-json.pl '{ "dataset_id": "volvox" }' sample_data/json/volvox/trackList.json

=cut

