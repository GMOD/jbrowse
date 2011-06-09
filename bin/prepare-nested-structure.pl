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
           "out=s" => $outdir);

my %categories;
my @rootChildren = ();

my $trackRel = "tracks";
my $trackDir = "$outdir/$trackRel";
mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

my $config = JsonGenerator::readJSON($confFile);

eval "require $config->{db_adaptor}; 1" or die $@;


my $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})} or warn $@;
die "Could not open database: $@" unless $db;

$db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
$db->absolute(1)               if $db->can('absolute');

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};

die "run prepare-refseqs.pl first to supply information about your reference sequences" if $#refSeqs < 0;

foreach my $seg (@refSeqs) {
    my $segName = $seg->{name};
    print "\nworking on refseq $segName\n";

    mkdir("$trackDir/$segName") unless (-d "$trackDir/$segName");

    my @tracks = @{$config->{tracks}};

    foreach my $track (@tracks) {
        if($track->{"category"}) {
            if($categories{$track->{"category"}}) {
                push @{$categories{$track->{"category"}}}, $track->{"track"};
            }
            else {
                $categories{$track->{"category"}} = [$track->{"track"}];
            }
        }
        else {
            push @rootChildren, $track->{"track"};
        }
    }
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
    push @rootChildren, $category;
}

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


