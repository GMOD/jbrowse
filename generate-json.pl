#!/usr/bin/perl -w

use strict;
use warnings;
use Getopt::Long;
use Bio::Graphics::Browser::Util;
use Data::Dumper;
use NCList;
use JSON;
use IO::File;
use Fcntl ":flock";

my ($CONF_DIR, $ref, $refid, $source, $onlyLabel);
my $outdir = "data";
my ($getSubs, $getPhase, $getType) = (0, 0, 0, 0, 0);
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

sub readJSON {
    my ($file, $default) = @_;
    if (-s $file) {
        my $OLDSEP = $/;
        undef $/;
        open JSON, "<$file"
          or die "couldn't open $file: $!";
        $default = JSON::from_json(<JSON>);
        close JSON
          or die "couldn't close $file: $!";
        $/ = $OLDSEP;
    }
    return $default;
}

sub writeJSON {
    my ($file, $toWrite) = @_;
    open JSON, ">$file"
      or die "couldn't open $file: $!";
    print JSON JSON::to_json($toWrite);
    close JSON
      or die "couldn't close $file: $!";
}

sub modifyJSFile {
    my ($file, $varName, $callback) = @_;
    my ($data, $assign);
    my $fh = new IO::File $file, O_RDWR | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    # if the file is non-empty,
    if (($fh->stat())[7] > 0) {
        # get variable assignment line
        $assign = $fh->getline();
        # get data
        my $jsonString = join("", $fh->getlines());
        $data = JSON::from_json($jsonString) if (length($jsonString) > 0);
        # prepare file for re-writing
        $fh->seek(0, SEEK_SET);
        $fh->truncate(0);
    }
    # add assignment line
    $fh->print("$varName = \n");
    # modify data, write back
    $fh->print(JSON::to_json($callback->($data)));
    $fh->close()
      or die "couldn't close $file: $!";
}

foreach my $label (@track_labels) {
    print "working on track $label\n";
    my %style = $conf->style($label);
    print "style: " . Dumper(\%style);
    my $getLabel = $style{"-autocomplete"} && ($style{"-autocomplete"} =~ /label|all/);
    my $getAlias = $style{"-autocomplete"} && ($style{"-autocomplete"} =~ /alias|all/);

    my @feature_types = $conf->label2type($label, $seg->length);
    print "searching for features of type: " . join(", ", @feature_types) . "\n";
    if ($#feature_types >= 0) {
	my @features = $seg->features(-type => \@feature_types);

	print "got " . ($#features + 1) . " features\n";
	next if ($#features < 0);

        my $labelSub =
          ($style{"label"} && (ref $style{"label"} eq "CODE"))
            ? $style{"label"}
              : sub {
                  return $_[0]->display_name if $_[0]->can('display_name');
                  return $_[0]->info         if $_[0]->can('info'); # deprecated
                  return $_[0]->seq_id       if $_[0]->can('seq_id');
                  return eval{$_[0]->primary_tag};
              };

        my @nameMap = (
               sub {$label},
               $labelSub,
               sub {$segName},
	       sub {shift->start - 1},
	       sub {shift->end},
	       sub {$_[0]->can('primary_id') ? $_[0]->primary_id : $_[0]->id}
              );

        if ($getLabel || $getAlias) {
            if ($getLabel && $getAlias) {
                unshift @nameMap, sub {[unique($labelSub->($_[0]),
                                               $_[0]->attributes("Alias"))]};
            } elsif ($getLabel) {
                unshift @nameMap, sub {[$labelSub->($_[0])]};
            } elsif ($getAlias) {
                unshift @nameMap, sub {[$_[0]->attributes("Alias")]};
            }

            my @names = map {my $feat = $_; [map {$_->($feat)} @nameMap]} @features;

            writeJSON("$outdir/$segName/$label.names", \@names);
        }

	print Dumper($features[0]);
	my $sublistIndex = $#featMap + 1;
	my $featList = NCList->new($sublistIndex, @features);
	#print Dumper($featList->{'topList'});
	writeJSON("$outdir/$segName/$label.json",
                  {
                   'label' => $label,
                   'key' => $style{-key} || $label,
                   'typeList' => \@feature_types,
                   'sublistIndex' => $sublistIndex,
                   'map' => $mapHeaders,
                   'featureCount' => $#features + 1,
		   'type' => "SimpleFeatureTrack",
		   'className' => $style{-class} || "feature",
                   'featureNCList' => $featList->flatten(@featMap)
                  });

        modifyJSFile("$outdir/trackInfo.js", "trackInfo",
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
                              'url' => "$outdir/$segName/$label.json",
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
	print "no features found\n";
    }
}
