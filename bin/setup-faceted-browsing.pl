#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use JsonGenerator;
use Data::Dumper;
use HTML::Template;

my $confFile;
my $outdir = "data";
GetOptions("conf=s" => \$confFile,
           "out=s" => $outdir);

my %possible_track_info = ();
my %possible_track_info_options = ();
my @tracks;
my @facetes;
my @track_fields;

mkdir($outdir) unless (-d $outdir);

if($confFile) {

    my $config = JsonGenerator::readJSON($confFile);

    eval "require $config->{db_adaptor}; 1" or die $@;

    @tracks = @{$config->{tracks}};

    if($config->{facets}) {
        @facetes = @{$config->{facets}};
    }
    if($config->{extra_track_info}) {
        @track_fields = @{$config->{extra_track_info}};
    }
}
else {
    my @trackInfo = @{JsonGenerator::readJSON("$outdir/trackInfo.js", [], 1)};
    die "run biodb-to-json.pl first to supply information about your track sequences" if $#trackInfo < 0;

    @tracks = @trackInfo;
}

my @browsing_tracks;
foreach my $track (@tracks) {
    foreach my $key (keys %$track) {
        if($possible_track_info{$key}) {
            $possible_track_info{$key} += 1;
        }
        else {
            $possible_track_info{$key} = 1;
            $possible_track_info_options{$key}{$track->{$key}} = 0;
        }
        $possible_track_info_options{$key}{$track->{$key}} += 1;
    }

    if($confFile) {
        $track->{'label'} = $track->{'key'};
        delete $track->{'key'};
    }

    if($confFile || ($track->{'type'} ne 'TrackGroup' && $track->{'type'} ne 'ROOT')) {
        push @browsing_tracks, $track;
    }
}
@tracks = @browsing_tracks;

JsonGenerator::writeJSON("$outdir/faceted_browsing.json",
                               {
                                   'items' => \@tracks,
                               });

# create faceted_browser.html file for iframe to work

if(!@facetes || !@track_fields) {
    my $num_tracks = @tracks;
    my $populate_facetes = !@facetes;
    my $populate_track_fields = !@track_fields;
    foreach my $field (keys %possible_track_info) {
        my $num_field_options = $possible_track_info_options{$field};
        my $num_field_populated = $possible_track_info{$field};

        my $max_times_used = 0;
        foreach my $option (keys %{$possible_track_info_options{$field}}) {
            my $times_used = $possible_track_info_options{$field}{$option};
            if($times_used > $max_times_used) {
                $max_times_used = $times_used;
            }
        }

        if($populate_facetes && ($field ne 'type') && ($max_times_used >= 2) && ($num_field_options >= 2)) {
            push @facetes, { field => $field , label => $field};
        }
        if($populate_track_fields && ($field ne 'track') && ($field ne 'type') && ($field ne 'key') && ($field ne 'label') && ($field ne 'url') && ($num_field_populated >= (int $num_tracks*0.5))) {
            push @track_fields, { field_label => $field , field_name => $field};
        }
    }
}

my $template = HTML::Template->new(filename => 'faceted_browsing.tmpl');

$template->param( BROWSING_FACETES => \@facetes);
$template->param( TRACK_INFO_FIELDS => \@track_fields);

open(my $out_file, ">faceted_browsing.html");
print $out_file $template->output;

