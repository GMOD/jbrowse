#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use JsonGenerator;
use Data::Dumper;

my $confFile;
my $outdir = "data";
GetOptions("conf=s" => \$confFile,
           "out=s" => \$outdir);

my %categories;
my @seqTracks;
my %definedTracks;
my @rootChildren = ('Favourites');
my %seq;

my $trackRel = "tracks";
my $trackDir = "$outdir/$trackRel";
mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};
die "run prepare-refseqs.pl first to supply information about your reference sequences" if $#refSeqs < 0;
my @trackInfo = @{JsonGenerator::readJSON("$outdir/trackInfo.js", [], 1)};
die "run biodb-to-json.pl first to supply information about your track sequences" if $#trackInfo < 0;

foreach my $track (@trackInfo) {
    $definedTracks{$track->{"key"}} = 1;
}

$definedTracks{'ROOT'} = 3;
$definedTracks{'General'} = 3;
$definedTracks{'Favourites'} = 3;

my @top_categories = ();
if($confFile) {

    my $config = JsonGenerator::readJSON($confFile);

    my @tracks = @{$config->{tracks}};
    foreach my $track (@tracks) {
        my $group;
        if(! $track->{"category"}) {
            $group = "General";
            @rootChildren = ('Favourites', 'General');
        }
        else {
            $group = $track->{"category"};
        }

        my $ref = $track->{"track"};
        if(! defined $track->{"type"}) {
            $track->{"type"} = " ";
        }

        if(!$definedTracks{$ref} && ($track->{"type"} ne "TrackGroup")) {
            warn "track " . $ref . " is not defined in trackInfo.js";
        }
        elsif(($track->{"type"} ne "TrackGroup") && ($definedTracks{$ref} == 2)) {
            warn "track " . $ref . " is duplicated";
        }

        if($categories{$group}) {
            push @{$categories{$group}}, $ref;
        }
        else {
           $categories{$group} = [$ref];
        }
        $definedTracks{$ref} = 2;
    }

    if(defined $config->{"top_categories"}) {
        @top_categories = @{$config->{top_categories}};
    }
}
else {
    foreach my $track (@trackInfo) {
        my $group = "General";
        my $ref = $track->{"key"};
        if((!$seq{$ref}) && ($track->{"type"} ne "TrackGroup") && ($track->{"type"} ne "ROOT")) {
            if($categories{$group}) {
                push @{$categories{$group}}, $ref;
            }
            else {
                $categories{$group} = [$ref];
            }
        }
        $definedTracks{$ref} = 2;
    }
    @top_categories = ('General');
}

foreach my $category (keys %categories) {
    my @children_ref = ();
    foreach my $track (@{ $categories{$category} }) {
        push @children_ref, { '_reference' => $track};
    }
    JsonGenerator::writeTrackEntry("$outdir/trackInfo.js",
                                   {
                                       'label' => $category,
                                       'key' => $category,
                                       'type' => "TrackGroup",
                                       'children' => \@children_ref
                                   });
    #push @rootChildren, $category;
    $definedTracks{$category} = 3;
}

push @rootChildren, @top_categories;

foreach my $track (keys %definedTracks) {
    if($definedTracks{$track} == 1) {  warn "track ". $track . " is not in a category"; }
}

JsonGenerator::writeTrackEntry("$outdir/trackInfo.js",
                               {
                                   'label' => 'Favourites',
                                   'key' => 'Favourites',
                                   'type' => 'TrackGroup',
                               });

my @children_ref = ();
foreach my $child (@rootChildren) {
    push @children_ref, { '_reference' => $child};
}
JsonGenerator::writeTrackEntry("$outdir/trackInfo.js",
                               {
                                   'label' => 'ROOT',
                                   'key' => 'ROOT',
                                   'type' => 'ROOT',
                                   'children' => \@children_ref
                               });

