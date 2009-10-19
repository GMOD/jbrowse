#!/usr/bin/env perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use Data::Dumper;
use JsonGenerator;

my ($confFile, $ref, $refid, $onlyLabel, $verbose);
my $outdir = "data";
GetOptions("conf=s" => \$confFile,
	   "ref=s" => \$ref,
	   "refid=s" => \$refid,
	   "track=s" => \$onlyLabel,
	   "out=s" => \$outdir,
           "v+" => \$verbose);
my $trackDir = "$outdir/tracks";

if (!defined($confFile)) {
    print <<HELP;
USAGE: $0 --conf <conf file> [--ref <ref seq names> | --refid <ref seq ids>] [--track <track name>] [--out <output directory>]

    <conf file>: path to the configuration file
    <ref seq names>: comma-separated list of reference sequence names
        $0 will process features on these ref seqs
        default: all of the ref seqs that prepare-refseqs.pl has seen
    <ref seq ids>: comma-separated list of reference sequence ids
        $0 will process features on these ref seqs
        default: all of the ref seqs that prepare-refseqs.pl has seen
    <output directory>: directory where output should go
        default: $outdir
HELP
exit;
}

my $config = JsonGenerator::readJSON($confFile);

eval "require $config->{db_adaptor}; 1" or die $@;

my $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})} or warn $@;
die "Could not open database: $@" unless $db;

if (my $refclass = $config->{'reference class'}) {
    eval {$db->default_class($refclass)};
}
$db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
$db->absolute(1)               if $db->can('absolute');

my @segs;
if (defined $refid) {
    push @segs, $db->segment(-db_id => $refid);
} elsif (defined $ref) {
    push @segs, $db->segment(-name => $ref);
} else {
    foreach my $segInfo (@{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)}) {
        if (defined($segInfo->{"id"})) {
            push @segs, $db->segment(-db_id => $segInfo->{"id"});
        } else {
            push @segs, $db->segment(-name => $segInfo->{"name"});
        }
    }
}

mkdir($outdir) unless (-d $outdir);
mkdir($trackDir) unless (-d $trackDir);

foreach my $seg (@segs) {
    my $segName = $seg->name;
    $segName = $seg->{'uniquename'} if $seg->{'uniquename'};
    $segName =~ s/:.*$//; #get rid of coords if any
    print "\nworking on refseq $segName\n";

    mkdir("$trackDir/$segName") unless (-d "$trackDir/$segName");

    my @tracks;
    if (defined $onlyLabel) {
        @tracks = grep { $_->{"track"} eq $onlyLabel } @{$config->{tracks}};
    } else {
        @tracks = @{$config->{tracks}};
    }

    foreach my $track (@tracks) {
        print "working on track " . $track->{"track"} . "\n";
        my %style = ("key" => $track->{"track"},
                     %{$config->{"TRACK DEFAULTS"}},
                     %{$track});
        print "style: " . Dumper(\%style) if ($verbose);

        my @feature_types = @{$track->{"feature"}};
        print "searching for features of type: " . join(", ", @feature_types) . "\n" if ($verbose);
        if ($#feature_types >= 0) {
            my @features = $seg->features(-type => \@feature_types);

            print "got " . ($#features + 1) . " features for " . $track->{"track"} . "\n";
            next unless $#features >= 0;

            my $jsonGen = JsonGenerator->new($track->{"track"}, $segName,
                                             \%style, [], []);

            $jsonGen->addFeature($_) foreach (@features);

            $jsonGen->generateTrack("$trackDir/$segName/" . $track->{"track"},
                                    5000);

            # JsonGenerator::generateTrack(
            #     $track->{"track"}, $segName,
            #     "$trackDir/$segName/" . $track->{"track"},
            #     5000,
            #     \@features, \%style,
            #     [], []
            #     );

            print Dumper($features[0]) if ($verbose && ($#features >= 0));

            JsonGenerator::modifyJSFile("$outdir/trackInfo.js", "trackInfo",
		 sub {
		     my $trackList = shift;
		     my $i;
		     for ($i = 0; $i <= $#{$trackList}; $i++) {
			 last if ($trackList->[$i]->{'label'} eq $track->{"track"});
		     }
		     $trackList->[$i] =
		       {
			'label' => $track->{"track"},
			'key' => $style{"key"},
			'url' => "$trackDir/{refseq}/"
                                 . $track->{"track"}
                                 . "/trackData.json",
			'type' => "FeatureTrack",
		       };
		     return $trackList;
		 });
        }
    }
}

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
