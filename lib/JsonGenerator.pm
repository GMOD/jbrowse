package JsonGenerator;

use strict;
use warnings;

use NCList;
use JSON;
use IO::File;
use Fcntl ":flock";

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
	      );
my @mapHeaders = ('start', 'end', 'strand', 'id');

sub featureLabelSub {
    return $_[0]->display_name if $_[0]->can('display_name');
    return $_[0]->info         if $_[0]->can('info'); # deprecated
    return $_[0]->seq_id       if $_[0]->can('seq_id');
    return eval{$_[0]->primary_tag};
}

my %builtinDefaults =
  (
   "-label"        => \&featureLabelSub,
   "-autocomplete" => "none",
   "-class"        => "feature"
  );

sub unique {
    my %saw;
    return (grep(!$saw{$_}++, @_));
}

sub readJSON {
    my ($file, $default) = @_;
    if (-s $file) {
        my $OLDSEP = $/;
        undef $/;
        my $fh = new IO::File $file, O_RDONLY
            or die "couldn't open $file: $!";
        flock $fh, LOCK_SH;
        $default = JSON::from_json(<$fh>);
        $fh->close()
            or die "couldn't close $file: $!";
        $/ = $OLDSEP;
    }
    return $default;
}

sub writeJSON {
    my ($file, $toWrite) = @_;
    my $fh = new IO::File $file, O_WRONLY | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    $fh->seek(0, SEEK_SET);
    $fh->truncate(0);
    $fh->print(JSON::to_json($toWrite, {pretty => 0}));
    $fh->close()
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
    $fh->print(JSON::to_json($callback->($data), {pretty => 1}));
    $fh->close()
      or die "couldn't close $file: $!";
}

sub generateTrack {
    my ($label, $segName, $outFile, $nameFile,
	$features, $setStyle, $extraMap, $extraHeaders) = @_;

    my %style = ("-key" => $label,
                 %builtinDefaults,
		 %$setStyle);

    my $getLabel = ($style{"-autocomplete"} =~ /label|all/);
    my $getAlias = ($style{"-autocomplete"} =~ /alias|all/);

    my @curFeatMap = (@featMap, @$extraMap);
    my @curMapHeaders = (@mapHeaders, @$extraHeaders);

    if ($style{"-label"}) {
	push @curFeatMap, $style{"-label"};
	push @curMapHeaders, "name";
    }

    if ($style{"-phase"}) {
        push @curFeatMap, sub {shift->phase};
        push @curMapHeaders, "phase";
    }

    if ($style{"-type"}) {
        push @curFeatMap, sub {shift->primary_tag};
        push @mapHeaders, "type";
    }

    if ($style{"-subfeatures"}) {
        push @curFeatMap, sub {
            my ($feat, $flatten) = @_;
            my @subfeat = $feat->sub_SeqFeature;
            return &$flatten(@subfeat) if (@subfeat);
            return undef;
        };
        push @curMapHeaders, 'subfeatures';
    }

    my @nameMap =
      (
       sub {$label},
       $style{"-label"},
       sub {$segName},
       sub {int(shift->start) - 1},
       sub {int(shift->end)},
       sub {$_[0]->can('primary_id') ? $_[0]->primary_id : $_[0]->id}
      );

    if ($getLabel || $getAlias) {
	if ($getLabel && $getAlias) {
	    unshift @nameMap, sub {[unique($style{"-label"}->($_[0]),
					   $_[0]->attributes("Alias"))]};
	} elsif ($getLabel) {
	    unshift @nameMap, sub {[$style{"-label"}->($_[0])]};
	} elsif ($getAlias) {
	    unshift @nameMap, sub {[$_[0]->attributes("Alias")]};
	}

	my @names = map {my $feat = $_; [map {$_->($feat)} @nameMap]} @$features;

	writeJSON($nameFile, \@names);
    }

    my $sublistIndex = $#curFeatMap + 1;
    my $featList = NCList->new($sublistIndex, @$features);
    #print Dumper($featList->{'topList'});
    writeJSON($outFile,
	      {
	       'label' => $label,
	       'key' => $style{-key},
	       'sublistIndex' => $sublistIndex,
	       'map' => \@curMapHeaders,
	       'featureCount' => $#{$features} + 1,
	       'type' => "SimpleFeatureTrack",
	       'className' => $style{-class},
	       'featureNCList' => $featList->flatten(@curFeatMap)
	      });
}

1;
