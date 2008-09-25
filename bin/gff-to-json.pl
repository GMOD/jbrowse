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
