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

my @track_labels;
if (defined $onlyLabel) {
    @track_labels = ($onlyLabel);
} else {
    @track_labels = $browser->labels;
}

sub unique {
    my %saw;
    return (grep(!$saw{$_}++, @_));
}

foreach my $label (@track_labels) {
    print "working on track $label\n";
    my %style = ($conf->style("TRACK DEFAULTS"),
                 $conf->style($label));
    print "style: " . Dumper(\%style) if ($verbose);

    my @feature_types = $conf->label2type($label, $seg->length);
    print "searching for features of type: " . join(", ", @feature_types) . "\n" if ($verbose);
    if ($#feature_types >= 0) {
	my @features = $seg->features(-type => \@feature_types);

	print "got " . ($#features + 1) . " features for $label\n";
	next if ($#features < 0);

	JsonGenerator::generateTrack(
				     $label, $segName,
				     "$outdir/$segName/$label.json",
				     "$outdir/$segName/$label.names",
				     \@features, \%style,
				     [], []
				    );

	print Dumper($features[0]) if ($verbose);

	JsonGenerator::modifyJSFile("$outdir/trackInfo.js", "trackInfo",
		 sub {
		     my $segMap = shift;
		     my $trackList = $segMap->{$segName}->{'trackList'};
		     my $i;
		     for ($i = 0; $i <= $#{$trackList}; $i++) {
			 last if ($trackList->[$i]->{'label'} eq $label);
		     }
		     $trackList->[$i] =
		       {
			'label' => $label,
			'key' => $style{-key} || $label,
			'url' => "$outdir/$seq/$label.json",
			'type' => "SimpleFeatureTrack",
		       };
		     $segMap->{$segName} =
		       {
			"start"     => $seg->start - 1,
			"end"       => $seg->end,
			"length"    => $seg->length,
			"name"      => $segName,
			"trackList" => $trackList
		       };
		     return $segMap;
		 });
    } else {
	print "no features found for $label\n";
    }
}
