#!/usr/bin/perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";

use Getopt::Long;
use Bio::DB::SeqFeature::Store;
use JsonGenerator;

my ($path, $trackLabel, $key, $cssClass);
my $autocomplete = "none";
my $outdir = "data";
my ($getType, $getPhase, $getSubs, $getLabel) = (0, 0, 0, 0);
GetOptions("gff=s" => \$path,
	   "out=s" => \$outdir,
	   "tracklabel=s" => \$trackLabel,
	   "key=s" => \$key,
	   "cssclass=s" => \$cssClass,
	   "autocomplete=s" => \$autocomplete,
	   "type" => \$getType,
	   "phase" => \$getPhase,
	   "subs" => \$getSubs,
	   "featlabel" => \$getLabel);

if (!defined($path)) {
    print <<USAGE;
USAGE: $0 --gff <gff file> [--out <output directory>] --tracklabel <track identifier> --key <human-readable track name> [--cssclass <CSS class for displaying features>] [--autocomplete none|label|alias|all] [--type] [--phase] [--subs] [--featlabel]

    --out: defaults to "data"
    --cssclass: defaults to "feature"
    --autocomplete: make these features searchable by their "label", by their "alias"es, both ("all"), or "none".
    --type: include the type of the features in the json
    --phase: include the phase of the features in the json
    --subs:  include subfeatures in the json
    --featlabel: include a label for the features in the json
USAGE
}

# hackily get list of refseqs
# seriously, why doesn't Bio::DB::SeqFeature::Store::memory implement seq_ids()?
open GFF, "<$path"
  or die "couldn't open $path: $!";
my %refseqs;
while (<GFF>) {
  next if /^#/;
  /^(.*?)\t/;
  $refseqs{$1} = 1;
}
close GFF
  or die "couldn't close $path: $!";

sub gffLabelSub {
    return $_[0]->display_name if ($_[0]->can('display_name') && defined($_[0]->display_name));
    if ($_[0]->can('attributes')) {
	return $_[0]->attributes('load_id') if $_[0]->attributes('load_id');
	return $_[0]->attributes('Alias') if $_[0]->attributes('Alias');
    }
    #return eval{$_[0]->primary_tag};
}

my $db = Bio::DB::SeqFeature::Store->new(-adaptor => 'memory',
					 -dsn     => $path);

foreach my $seq (keys %refseqs) {
    print "working on seq $seq\n";

    my @features = $db->features("-seqid" => $seq);

    print "got $#features features\n";

    if (!defined($trackLabel)) { $trackLabel = $features[0]->primary_tag };
    if (!defined($key)) { $key = $trackLabel };

    my %style = ("-autocomplete" => $autocomplete,
		 "-type"         => $getType,
		 "-phase"        => $getPhase,
		 "-subfeatures"  => $getSubs,
		 "-class"        => $cssClass,
		 "-label"        => $getLabel ? \&gffLabelSub : 0);

    JsonGenerator::generateTrack(
				 $trackLabel, $seq,
				 "$outdir/$seq/$trackLabel.json",
				 "$outdir/$seq/$trackLabel.names",
				 \@features, \%style,
				 [], []
				);

    JsonGenerator::modifyJSFile("$outdir/trackInfo.js", "trackInfo",
		 sub {
		     my $segMap = shift;
		     my $trackList = $segMap->{$seq}->{'trackList'};
		     my $i;
		     for ($i = 0; $i <= $#{$trackList}; $i++) {
			 last if ($trackList->[$i]->{'label'} eq $trackLabel);
		     }
		     $trackList->[$i] =
		       {
			'label' => $trackLabel,
			'key' => $key,
			'url' => "$outdir/$seq/$trackLabel.json",
			'type' => "SimpleFeatureTrack",
		       };
# 		     $segMap->{$segName} =
# 		       {
# 			"start"     => $seg->start - 1,
# 			"end"       => $seg->end,
# 			"length"    => $seg->length,
# 			"name"      => $segName,
# 			"trackList" => $trackList
# 		       };
		     return $segMap;
		 });

}
