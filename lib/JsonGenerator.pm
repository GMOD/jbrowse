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
my @featMap = (
	       sub {shift->start - 1},
	       sub {int(shift->end)},
	       sub {int(shift->strand)},
	       \&featureIdSub,
	      );
my @mapHeaders = ('start', 'end', 'strand', 'id');

sub featureIdSub {
    return $_[0]->can('primary_id') ? $_[0]->primary_id : $_[0]->id;
}

sub featureLabelSub {
    return $_[0]->display_name if $_[0]->can('display_name');
    return $_[0]->info         if $_[0]->can('info'); # deprecated
    return $_[0]->seq_id       if $_[0]->can('seq_id');
    return eval{$_[0]->primary_tag};
}

my %builtinDefaults =
  (
   "label"        => \&featureLabelSub,
   "autocomplete" => "none",
   "class"        => "feature"
  );

sub unique {
    my %saw;
    return (grep(defined($_) && !$saw{$_}++, @_));
}

sub readJSON {
    my ($file, $default, $skipAssign) = @_;
    if (-s $file) {
        my $OLDSEP = $/;
        my $fh = new IO::File $file, O_RDONLY
            or die "couldn't open $file: $!";
        flock $fh, LOCK_SH;
        # optionally skip variable assignment line
        $fh->getline() if $skipAssign;
        undef $/;
        $default = JSON::from_json(<$fh>);
        $fh->close()
            or die "couldn't close $file: $!";
        $/ = $OLDSEP;
    }
    return $default;
}

sub writeJSON {
    my ($file, $toWrite, $opts) = @_;
    my $fh = new IO::File $file, O_WRONLY | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    $fh->seek(0, SEEK_SET);
    $fh->truncate(0);
    $fh->print(JSON::to_json($toWrite, $opts));
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

# turn perl subs from the config file into callable functions
sub evalSubStrings {
    my $hashref = shift;
    foreach my $key (keys %{$hashref}) {
        next if ("CODE" eq (ref $hashref->{$key}));

        if ("HASH" eq (ref $hashref->{$key})) {
            evalSubStrings($hashref->{$key});
        } else {
            $hashref->{$key} = eval($hashref->{$key})
              if (defined($hashref->{$key}) && $hashref->{$key} =~ /^\s*sub\s*{.*}\s*$/);
        }
    }
}

sub generateTrack {
    my ($label, $segName, $outDir, $featureLimit,
	$features, $setStyle, $extraMap, $extraHeaders) = @_;

    mkdir($outDir) unless (-d $outDir);

    my %style = ("key" => $label,
                 %builtinDefaults,
		 %$setStyle);

    evalSubStrings(\%style);

    my $getLabel = ($style{"autocomplete"} =~ /label|all/);
    my $getAlias = ($style{"autocomplete"} =~ /alias|all/);

    my @curFeatMap = (@featMap, @$extraMap);
    my @curMapHeaders = (@mapHeaders, @$extraHeaders);

    if ($style{"label"}) {
	push @curFeatMap, $style{"label"};
	push @curMapHeaders, "name";
    }

    if ($style{"phase"}) {
        push @curFeatMap, sub {shift->phase};
        push @curMapHeaders, "phase";
    }

    if ($style{"type"}) {
        push @curFeatMap, sub {shift->primary_tag};
        push @curMapHeaders, "type";
    }

    if ($style{"extraData"}) {
        foreach my $extraName (keys %{$style{"extraData"}}) {
            push @curMapHeaders, $extraName;
            push @curFeatMap, $style{"extraData"}->{$extraName};
        }
    }

    my @allSubfeatures;
    # %seenSubfeatures is so that shared subfeatures don't end up
    # in @allSubfeatures more than once
    my %seenSubfeatures;
    if ($style{"subfeatures"}) {
        push @curFeatMap, sub {
            my ($feat, $flatten) = @_;
            my @subFeatures = $feat->sub_SeqFeature;
            return undef unless (@subFeatures);

            my $sfClasses = $style{"subfeature_classes"};
            my @subfeatIndices;
            foreach my $subFeature (@subFeatures) {
                #filter out subfeatures we don't care about
                #print "type: " . $subFeature->primary_tag . " (" . $sfClasses->{$subFeature->primary_tag} . ")\n";
                next unless
                  $sfClasses && $sfClasses->{$subFeature->primary_tag};
                my $subId = featureIdSub($subFeature);
                my $subIndex = $seenSubfeatures{$subId};
                if (!defined($subIndex)) {
                    push @allSubfeatures, $subFeature;
                    $subIndex = $#allSubfeatures;
                    $seenSubfeatures{$subId} = $subIndex;
                }
                push @subfeatIndices, $subIndex;
            }
            return \@subfeatIndices;
        };
        push @curMapHeaders, 'subfeatures';
    }

    my @nameMap =
      (
       sub {$label},
       $style{"label"},
       sub {$segName},
       sub {int(shift->start) - 1},
       sub {int(shift->end)},
       sub {$_[0]->can('primary_id') ? $_[0]->primary_id : $_[0]->id}
      );

    if ($getLabel || $getAlias) {
	if ($getLabel && $getAlias) {
	    unshift @nameMap, sub {[unique($style{"label"}->($_[0]),
					   $_[0]->attributes("Alias"))]};
	} elsif ($getLabel) {
	    unshift @nameMap, sub {[$style{"label"}->($_[0])]};
	} elsif ($getAlias) {
	    unshift @nameMap, sub {[$_[0]->attributes("Alias")]};
	}

	my @names = map {my $feat = $_; [map {$_->($feat)} @nameMap]} @$features;

	writeJSON("$outDir/names.json", \@names, {pretty => 0});
    }

    my $sublistIndex = $#curFeatMap + 1;
    my $featList = NCList->new($sublistIndex, @$features);
    my $flatFeatures = $featList->flatten(@curFeatMap);
    my $rangeMap = [];
    my @subfeatMap = (@featMap, sub {shift->primary_tag});
    my @subfeatHeaders = (@mapHeaders, "type");

    if ($style{"subfeatures"} && (@allSubfeatures)) {
        #flatten subfeatures
        my $flatSubs = [
                        map {
                            my $feat = $_;
                            [map {&$_($feat)} @subfeatMap];
                        } @allSubfeatures
                       ];

        #chunk subfeatures
        my $firstIndex = 0;
        my $subFile = 1;
        while ($firstIndex < $#$flatSubs) {
            my $lastIndex = $firstIndex + $featureLimit - 1;
            $lastIndex = $#$flatSubs if $lastIndex > $#$flatSubs;
            writeJSON("$outDir/subfeatures-$subFile.json",
                      [@{$flatSubs}[$firstIndex..$lastIndex]],
                      {pretty => 0});
            push @$rangeMap, {start => int($firstIndex),
                              end   => int($lastIndex),
                              url   => "$outDir/subfeatures-$subFile.json"};
            $subFile++;
            $firstIndex = $lastIndex + 1;
        }
    }

    #use Data::Dumper;
    #$Data::Dumper::Maxdepth = 2;
    #print Dumper($featList->{'topList'});
    my $trackData = {
                     'label' => $label,
                     'key' => $style{"key"},
                     'sublistIndex' => $sublistIndex,
                     'headers' => \@curMapHeaders,
                     'featureCount' => $#{$features} + 1,
                     'type' => "FeatureTrack",
                     'className' => $style{"class"},
                     'subfeatureClasses' => $style{"subfeature_classes"},
                     'arrowheadClass' => $style{"arrowheadClass"},
                     'clientConfig' => $style{"clientConfig"},
                     'featureNCList' => $flatFeatures,
                     'rangeMap' => $rangeMap,
                     'subfeatureHeaders' => \@subfeatHeaders
                    };
    $trackData->{"urlTemplate"} = $style{"urlTemplate"}
      if defined($style{"urlTemplate"});
    writeJSON("$outDir/trackData.json",
              $trackData,
              {pretty => 0});
}

1;

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
