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
my $trackRel = "tracks";
my $track_label = 'Chromosome';
GetOptions("conf=s" => \$confFile,
           "label=s" => $track_label,
           "out=s" => $outdir);

mkdir($outdir) unless (-d $outdir);

my @refSeqs = @{JsonGenerator::readJSON("$outdir/refSeqs.js", [], 1)};
die "run prepare-refseqs.pl first to supply information about your reference sequences" if $#refSeqs < 0;

my $conf = JsonGenerator::readJSON($confFile);

foreach my $refInfo (@refSeqs) {
    if($confFile) {
        if(my $chrom_data = $conf->{$refInfo->{'name'}}) {
            mkdir("$outdir/$trackRel/".$refInfo->{"name"}."/$track_label")
            unless (-d "$outdir/$trackRel/".$refInfo->{'name'}."/$track_label");
            open(my $out, ">$outdir/$trackRel/".$refInfo->{'name'}."/$track_label/trackData.json") || warn "trackData.json didn't open";
            print $out '{ "centromere": '.$chrom_data->{"centromere"} . ",";
            print $out '  "chromBands": [';
            my $chromBands = $chrom_data->{"chromBands"};
            foreach my $band (@{$chromBands}) {
                print $out '{ "loc":'.$band->{"loc"}.', "length": '.$band->{"length"}.'},';
            }
            print $out "]}";
            close($out);
        }        
    }
    else {
        print "Do you want a chromosome ideogram displayed for ",$refInfo->{"name"},"?\n";
        my $chrom_display = <STDIN>;

        if($chrom_display =~ /^(\w*\s+)*y(es)?\W/i) {
            mkdir("$outdir/$trackRel/".$refInfo->{"name"}."/$track_label")
            unless (-d "$outdir/$trackRel/".$refInfo->{'name'}."/$track_label");

            open(my $out, ">$outdir/$trackRel/".$refInfo->{'name'}."/$track_label/trackData.json") || warn "trackData.json didn't open";
            print $out '{ "centromere": '.getCentromere($refInfo->{"name"}, $refInfo->{"length"}) . ",";
            print $out '  "chromBands": [';
            my $chromBands = getChromBands($refInfo->{"name"});
            foreach my $band (@{$chromBands}) {
                print $out '{ "loc":'.$band->[0].', "length": '.$band->[1].'},';
            }
            print $out "]}";
            close($out);
        }
    }
    JsonGenerator::modifyJSFile("$outdir/overviewTrackInfo.js", "overviewTrackInfo",
                                sub {
                                    my $trackList = shift;
                                    my $i;
                                    for ($i = 0; $i <= $#{$trackList}; $i++) {
                                        last if ($trackList->[$i]->{'label'}
                                                 eq
                                                 $track_label);
                                    }
                                    $trackList->[$i] =
                                      {
                                       'label' => $track_label,
                                       'type' => 'ChromIdeogram',
                                       'url' => "$trackRel/{refseq}/$track_label/trackData.json"
                                      };
                                    return $trackList;
                            });
}

sub getChromBands {
    my ($name) = @_;

    my @bands = ();

    print "How many bands does $name have?\n";
    my $num_bands = <STDIN>;
    $num_bands =~ /(\d+)/;
    $num_bands = int $num_bands;

    for(my $i = 1; $i <= $num_bands; $i++) {
        print "What is the start postion of band $i?\n";
        my $pos = <STDIN>;
        $pos =~ /(\d+)/;
        $pos = int $pos;
        print "What is the length of band $i?\n";
        my $len = <STDIN>;
        $len =~ /(\d+)/;
        $len = int $len;
        push @bands, [$pos, $len];
    }
    return \@bands;
}
sub getCentromere {
    my ($name, $length) = @_;

    print "What is the centromere coordinate for $name? \nEnter 0 for no centromere\nNote: The length of the $name is $length\n";
    my $centro = <STDIN>;
    $centro =~ /(\d+)/;
    return int $1;
}

