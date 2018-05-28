#!/usr/bin/env perl
use strict;
use warnings;

use FindBin qw($RealBin);
use lib "$RealBin/../src/perl5";
use JBlibs;

use Getopt::Long qw(:config no_ignore_case bundling);
use IO::File;
use File::Basename;
use JSON;

use Pod::Usage;

my $STORE_CLASS = "JBrowse/Store/SeqFeature/BigWig";
my $HEATMAP_TYPE = "JBrowse/View/Track/Wiggle/Density";
my $PLOT_TYPE =  "JBrowse/View/Track/Wiggle/XYPlot";

my $in_file;
my $out_file;
my $label;
my $bw_url;
my $key;
my $additional_config;
my $category = undef;
my $plot = 0;
my $bicolor_pivot = "zero";
my $pos_color = undef;
my $neg_color = undef;
my $min_score = undef;
my $max_score = undef;
my $clip_marker_color = undef;
my $bg_color = undef;
my $height = undef;

parse_options();
add_bw_track();

sub parse_options {
    my $help;
    GetOptions("in|i=s"		=> \$in_file,
           "out|o=s"		=> \$out_file,
           "label|l=s"		=> \$label,
           "bw_url|u=s"		=> \$bw_url,
           "key|k=s"		=> \$key,
           "category=s"	=> \$category,
           "config=s"         => \$additional_config,
           "plot|P"		=> \$plot,
           "bicolor_pivot|b=s"	=> \$bicolor_pivot,
           "pos_color|c=s"	=> \$pos_color,
           "neg_color|C=s"	=> \$neg_color,
           "min_score|s=i"	=> \$min_score,
           "max_score|S=i"      => \$max_score,
           "clip_marker_color|M=s"  => \$clip_marker_color,
           "bg_color|B=s"           => \$bg_color,
           "height|H=s"             => \$height,		   
           "help|h"		=> \$help);
    pod2usage( -verbose => 2 ) if $help;
    pod2usage( "Missing label option" ) if !$label;
    pod2usage( "Missing bw_url option" ) if !$bw_url;
    $key ||= $label;
        $in_file  ||= 'data/trackList.json';
        $out_file ||= $in_file;
}

sub add_bw_track {
    my $json = new JSON;
    local $/;
    my $in;
    $in = new IO::File($in_file) or
        die "Error reading input $in_file: $!";
    my $track_list_contents = <$in>;
    $in->close();
    my $track_list = $json->decode($track_list_contents);
    my $bw_entry;

    my $index;
    my $tracks = $track_list->{tracks} || []; # create tracklist if not there
    for ($index = 0; $index < scalar(@{$tracks}); ++$index) {
        my $track = $tracks->[$index];
        if ($track->{label} eq $label) {
            $bw_entry = $track;
            last;
        }
    }

#	foreach my $track (@{$track_list->{tracks}}) {
#		if ($track->{label} eq $label) {
#			$bw_entry = $track;
#			last;
#		}
#	}
    if (!$bw_entry) {
        # $bw_entry = generate_new_bw_heatmap_entry();
        $bw_entry = !$plot ? generate_new_bw_heatmap_entry() :
                generate_new_bw_plot_entry();

        push @{$track_list->{tracks}}, $bw_entry;
    }
    else {
        if ($plot) {
            if ($bw_entry->{type} eq $HEATMAP_TYPE) {
                $bw_entry = generate_new_bw_plot_entry();
                $tracks->[$index] = $bw_entry;
            }
        }
        else {
            if ($bw_entry->{type} eq $PLOT_TYPE) {
                $bw_entry = generate_new_bw_heatmap_entry();
                $tracks->[$index] = $bw_entry;
            }
        }
    }

    $bw_entry->{label} = $label;
        $bw_entry->{autoscale} = "local";
    $bw_entry->{urlTemplate} = $bw_url;
    $bw_entry->{key} = $key;
    $bw_entry->{bicolor_pivot} = $bicolor_pivot;
    if (defined $category) {
        $bw_entry->{category} = $category;
    }
    else {
        delete $bw_entry->{category};
    }
    if ($additional_config) {
        my $conf = $json->decode( $additional_config );
        unless ( $conf && ref $conf eq 'HASH') {
            die "invalid --config option, --config must be valid JSON";
        }
        %$bw_entry = (%$bw_entry, %$conf)
    }
    if (defined $min_score) {
        $bw_entry->{min_score} = $min_score;
    }
    else {
        delete $bw_entry->{min_score};
    }
    if (defined $max_score) {
        $bw_entry->{max_score} = $max_score;
    }
    else {
        delete $bw_entry->{max_score};
    }
    if ($pos_color) {
        $bw_entry->{style}->{pos_color} = $pos_color;
    }
    else {
        delete $bw_entry->{style}->{pos_color};
    }
    if ($neg_color) {
        $bw_entry->{style}->{neg_color} = $neg_color;
    }
    else {
        delete $bw_entry->{style}->{neg_color};
    }
    if ($clip_marker_color) {
        $bw_entry->{style}->{clip_marker_color} = $clip_marker_color;
    }
    else {
        delete $bw_entry->{style}->{clip_marker_color};
    }
    if ($bg_color) {
        $bw_entry->{style}->{bg_color} = $bg_color;
    }
    else {
        delete $bw_entry->{style}->{bg_color};
    }
    if ($height) {
        $bw_entry->{style}->{height} = $height;
    }
    else {
        delete $bw_entry->{style}->{height};
    }
    delete $bw_entry->{style} if !scalar(keys %{$bw_entry->{style}});
    my $out;
    $out = new IO::File($out_file, "w") or
        die "Error writing output $out_file: $!";
    print $out $json->pretty->encode($track_list);
    $out->close();
}

sub generate_new_bw_heatmap_entry {
    return {
        storeClass	=> $STORE_CLASS, 
        type		=> $HEATMAP_TYPE
    };
}

sub generate_new_bw_plot_entry {
    return {
        storeClass	=> $STORE_CLASS, 
        type		=> $PLOT_TYPE
    };
}

__END__


=head1 NAME

add-bw-track.pl - add track configuration snippet(s) for BAM track(s)

=cut

=head1 USAGE

  add-bw-track.pl
    [ --in <input_trackList.json> ]                    \
    [ --out <output_trackList.json> ]                  \
    --label <track_label>                              \
    --bw_url <url_to_big_wig_file>                     \
    [ --key <track_key> ]                              \
    [ --category 'Category in JBrowse' ]               \
    [ --plot ]                                         \
    [ --bicolor_pivot <pivot_for_changing_colors> ]    \
    [ --pos_color <color_for_positive_side_of_pivot> ] \
    [ --neg_color <color_for_negative_side_of_pivot> ] \
    [ --min_score <min_score> ]                        \
    [ --max_score <max_score> ]                        \
        [ --clip_marker_color <color> ]                    \
        [ --bg_color <color> ]                             \
        [ --height <value> ]                               \
    [ -h|--help ]

=head1 ARGUMENTS

=over 4

=item --bicolor_pivot <value>

point where to set pivot for color changes - can be "mean", "zero", or
a numeric value [default: zero]

=item --plot

display as XY plot instead of density heatmap

=item --pos_color <color>

CSS color for positive side of pivot [default: blue]

=item --neg_color <color>

CSS color for negative side of pivot [default: red]

=item --in <file>

input trackList.json file. Default: data/trackList.json.

=item --out <file>

Output trackList.json file. Default: data/trackList.json.

=item --bw_url <url>

URL to BigWig file (can be relative to the trackList.json)

=item --label <unique_label>

unique track label for the new track.

=item --key <keyname>

key (display name) for track [default: label value]

=item --category "Category Name / Subcategory Name"

track category. Used by the default Hierarchical track selector.

=item --classname <classname>

CSS class for display [default: bam]

=item --mismatches

display mismatches in alignment (generates no subfeatures)

=item --coverage

display coverage data instead of alignments

=item --min_score <score>

optional minimum score to be graphed

=item --max_score <score>

optional maximum score to be graphed

=item --clip_marker_color <color>

optional clip marker color

=item --bg_color <color>

optional background color

=item --height <value>

optional height

=item --config '{ "my_key": "my_value", ... }'

optional additional data to include in the track configuration. Any values provided here will override
the values generated by the rest of the script.

=back

=cut
