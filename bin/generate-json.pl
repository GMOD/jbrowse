#!/usr/bin/perl -w

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use Bio::Graphics::Browser::Util;
use Data::Dumper;
use JsonGenerator;

my ($CONF_DIR, $ref, $refid, $source, $onlyLabel, $verbose);
my $outdir = "data";
GetOptions("conf=s" => \$CONF_DIR,
	   "ref=s" => \$ref,
	   "src=s" => \$source,
	   "refid=s" => \$refid,
	   "track=s" => \$onlyLabel,
	   "out=s" => \$outdir,
           "v+" => \$verbose);

my $browser = open_config($CONF_DIR);
$browser->source($source) or die "ERROR: source $source not found (the choices are: " . join(", ", $browser->sources) . "\n";

my $conf = $browser->config;
my $db = open_database($browser);
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

foreach my $seg (@segs) {
    my $segName = $seg->name;
    $segName = $seg->{'uniquename'} if $seg->{'uniquename'};
    $segName =~ s/:.*$//; #get rid of coords if any
    print "\nworking on refseq $segName\n";

    mkdir("$outdir/$segName") unless (-d "$outdir/$segName");

    my @track_labels;
    if (defined $onlyLabel) {
        @track_labels = ($onlyLabel);
    } else {
        @track_labels = $browser->labels;
    }

    foreach my $trackLabel (@track_labels) {
        print "working on track $trackLabel\n";
        my %style = ("-key" => $trackLabel,
                     $conf->style("TRACK DEFAULTS"),
                     $conf->style($trackLabel));
        print "style: " . Dumper(\%style) if ($verbose);

        my @feature_types = $conf->label2type($trackLabel, $seg->length);
        print "searching for features of type: " . join(", ", @feature_types) . "\n" if ($verbose);
        if ($#feature_types >= 0) {
            my @features = $seg->features(-type => \@feature_types);

            print "got " . ($#features + 1) . " features for $trackLabel\n";

            JsonGenerator::generateTrack(
                $trackLabel, $segName,
                "$outdir/$segName/$trackLabel",
                5000,
                #"$outdir/$segName/$trackLabel.names",
                \@features, \%style,
                [], []
                );

            print Dumper($features[0]) if ($verbose && ($#features >= 0));

            JsonGenerator::modifyJSFile("$outdir/trackInfo.js", "trackInfo",
		 sub {
		     my $trackList = shift;
		     my $i;
		     for ($i = 0; $i <= $#{$trackList}; $i++) {
			 last if ($trackList->[$i]->{'label'} eq $trackLabel);
		     }
		     $trackList->[$i] =
		       {
			'label' => $trackLabel,
			'key' => $style{-key},
			'url' => "$outdir/{refseq}/$trackLabel/trackData.json",
			'type' => "SimpleFeatureTrack",
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
