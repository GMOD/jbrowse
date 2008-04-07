#!/usr/bin/perl -w

use strict;
use warnings;
use Getopt::Long;
use Bio::Graphics::Browser::Util;
use Data::Dumper;
use NCList;
use JSON;

my ($CONF_DIR, $ref, $refid, $source, $onlyLabel);
my $outdir = "data";
my ($getSubs, $getPhase, $getType) = (0, 0, 0);
GetOptions("conf=s" => \$CONF_DIR,
	   "ref=s" => \$ref,
	   "src=s" => \$source,
	   "refid=s" => \$refid,
	   "track=s" => \$onlyLabel,
	   "out=s" => \$outdir,
	   "sub" => \$getSubs,
	   "phase" => \$getPhase,
	   "type" => \$getType);

my $browser = open_config($CONF_DIR);
$browser->source($source) or die "ERROR: source $source not found (the choices are: " . join(", ", $browser->sources) . "\n";

my $conf = $browser->config;
my $db = open_database($browser);
my $seg;
if (defined $refid) {
    $seg = $db->segment(-db_id => $refid);
} elsif (defined $ref) {
    $seg = $db->segment(-name => $ref);
} else {
    die "need a reference sequence name or ID";
}

my $segName = $seg->name;
$segName = $seg->uniquename if ($seg->can('uniquename'));
$segName =~ s/:.*$//; #get rid of coords if any

mkdir($outdir) unless (-d $outdir);
mkdir("$outdir/$segName") unless (-d "$outdir/$segName");

#in JSON, features are represented by arrays (we could use
#hashes, but then we'd have e.g. "start" and "end" in the JSON
#for every feature, which would take up too much space/bandwidth)
#@featMap maps from feature objects to arrays
$Data::Dumper::Maxdepth = 2;
my @featMap = (
	       sub {shift->start - 1},
	       sub {int(shift->end)},
	       sub {int(shift->strand)},
	       sub {$_[0]->can('primary_id') ? $_[0]->primary_id : $_[0]->id},
	       sub {shift->display_name},
	      );
my $mapHeaders = ['start', 'end', 'strand', 'id', 'name'];

if ($getPhase) {
    push @featMap, sub {shift->phase};
    push @$mapHeaders, "phase";
}

if ($getType) {
    push @featMap, sub {shift->primary_tag};
    push @$mapHeaders, "type";
}

if ($getSubs) {
    push @featMap, sub {
	my ($feat, $flatten) = @_;
	my @subfeat = $feat->sub_SeqFeature;
	#print Dumper(@subfeat) if @subfeat;
	return &$flatten(@subfeat) if (@subfeat);
	return undef;
    };
    push @$mapHeaders, 'subfeatures';
}


#if (-e "$outdir/$segName.json") {
#}

my @track_labels;
if (defined $onlyLabel) {
    @track_labels = ($onlyLabel);
} else {
    @track_labels = $browser->labels;
}

foreach my $label (@track_labels) {
    print "working on track $label\n";
    my %style = $conf->style($label);
    print "style: " . Dumper(\%style);

    my @feature_types = $conf->label2type($label, $seg->length);
    print "searching for features of type: " . join(", ", @feature_types) . "\n";
    if ($#feature_types >= 0) {
	my @features = $seg->features(-type => \@feature_types);

	print "got " . ($#features + 1) . " features\n";
	next if ($#features < 0);


	print Dumper($features[0]);
	my $sublistIndex = $#featMap + 1;
	my $featList = NCList->new($sublistIndex, @features);
	#print Dumper($featList->{'topList'});
	open TRACK, ">$outdir/$segName/$label.json";
	print TRACK "(" . JSON::to_json
	  ({
	    'label' => $label,
	    'key' => $style{-key} || $label,
	    'typeList' => \@feature_types,
	    'sublistIndex' => $sublistIndex,
	    'map' => $mapHeaders,
	    'featureCount' => $#features + 1,
	    'featureNCList' => $featList->flatten(@featMap)
	   },
	   {'pretty' => 0}
	  ) . ")";
	close TRACK;
    } else {
	print "no features found\n";
    }
}

open REFJSON, ">$outdir/$segName.json";
print REFJSON JSON::to_json({
			     "start", $seg->start - 1,
			     "end", $seg->end,
			     "length", $seg->length,
			     "name", $segName
			    });
close REFJSON
