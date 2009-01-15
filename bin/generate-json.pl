#!/usr/bin/perl -w

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use Bio::Graphics::Browser::Util;
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

my $config = JsonGenerator::readJSON($confFile, undef, 1);

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
        @track_labels = keys %{$config->{tracks}};
    }

    foreach my $trackLabel (@track_labels) {
        print "working on track $trackLabel\n";
        my %style = ("key" => $trackLabel,
                     %{$config->{"TRACK DEFAULTS"}},
                     %{$config->{tracks}->{$trackLabel}});
        print "style: " . Dumper(\%style) if ($verbose);

        my @feature_types = @{$config->{tracks}->{$trackLabel}->{feature}};
        print "searching for features of type: " . join(", ", @feature_types) . "\n" if ($verbose);
        if ($#feature_types >= 0) {
            my @features = $seg->features(-type => \@feature_types);

            print "got " . ($#features + 1) . " features for $trackLabel\n";
            next unless @features > 0;

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
			'key' => $style{"key"},
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
