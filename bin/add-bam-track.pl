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

my $STORE_CLASS    = "JBrowse/Store/SeqFeature/BAM";
my $BIGWIG_STORE_CLASS    = "JBrowse/Store/SeqFeature/BigWig";
my $ALIGNMENT_TYPE = "JBrowse/View/Track/Alignments2";
my $COVERAGE_TYPE  = "JBrowse/View/Track/SNPCoverage";

my $in_file;
my $out_file;
my $label;
my $bam_url;
my $key;
my $bigwigCoverage = undef;
my $coverage = 0;
my $classname = undef;
my $min_score = undef;
my $max_score = undef;
my $additional_config;
my $category;

parse_options();
add_bam_track();
exit;

sub parse_options {
    my $help;
    GetOptions("in|i=s"		=> \$in_file,
           "out|o=s"		=> \$out_file,
           "label|l=s"		=> \$label,
           "bam_url|u=s"	=> \$bam_url,
           "key|k=s"		=> \$key,
           "classname|c=s"	=> \$classname,
           "bigwigCoverage|b=s"	=> \$bigwigCoverage,
           "coverage|C"		=> \$coverage,
           "min_score|s=i"	=> \$min_score,
           "max_score|S=i"	=> \$max_score,
           "category=s"	=> \$category,
           "config=s"         => \$additional_config,
           "help|h"		=> \$help);
        pod2usage( -verbose => 2 ) if $help;
    pod2usage("Missing label option") if !$label;
    pod2usage("Missing bam_url option") if !$bam_url;
    pod2usage("Missing min_score option") if $coverage && !defined $min_score;
    pod2usage("Missing max_score option") if $coverage && !defined $max_score;
    $key ||= $label;
    $in_file  ||= 'data/trackList.json';
    $out_file ||= $in_file;
}


sub add_bam_track {
    my $json = new JSON;
    local $/;
    my $in;
    $in = new IO::File($in_file) or
        die "Error reading input $in_file: $!";
    my $track_list_contents = <$in>;
    $in->close();
    my $track_list = $json->decode($track_list_contents);
    my $bam_entry;
    my $index;
    my $tracks = $track_list->{tracks} || [];
    for ($index = 0; $index < scalar(@{$tracks}); ++$index) {
        my $track = $tracks->[$index];
        if ($track->{label} eq $label) {
            $bam_entry = $track;
            last;
        }
    }
    if (!$bam_entry) {
        $bam_entry = !$coverage ? generate_new_bam_alignment_entry() :
                generate_new_bam_coverage_entry();
        push @{$track_list->{tracks}}, $bam_entry;
    }
    else {
        if ($coverage) {
            if ($bam_entry->{type} eq $ALIGNMENT_TYPE) {
                $bam_entry = generate_new_bam_coverage_entry();
                $tracks->[$index] = $bam_entry;
            }
        }
        else {
            if ($bam_entry->{type} eq $COVERAGE_TYPE) {
                $bam_entry = generate_new_bam_alignment_entry();
                $tracks->[$index] = $bam_entry;
            }
        }
    }
    $bam_entry->{label} = $label;
    $bam_entry->{urlTemplate} = $bam_url;
    $bam_entry->{key} = $key;
    if (!$coverage) {
          if (defined $classname)  {
            if (! $bam_entry->{style}) {
              $bam_entry->{style} = {};
            }
            $bam_entry->{style}->{className} = $classname;
          }
      if ($bigwigCoverage) {
            $bam_entry->{histograms} =  {
        storeClass	=> $BIGWIG_STORE_CLASS,
        urlTemplate	=> $bigwigCoverage
        };
          }
    }
    else {
        $bam_entry->{min_score} = $min_score;
        $bam_entry->{max_score} = $max_score;
    }

    if( $category ) {
        $bam_entry->{category} = $category;
    }

    if ($additional_config) {
        my $conf = $json->decode( $additional_config );
        unless ( $conf && ref $conf eq 'HASH') {
            die "invalid --config option, --config must be valid JSON";
        }
        %$bam_entry = (%$bam_entry, %$conf)
    }

    my $out;
    $out = new IO::File($out_file, "w") or
        die "Error writing output $out_file: $!";
    print $out $json->pretty->encode($track_list);
    $out->close();
}

sub generate_new_bam_alignment_entry {
    return {
        storeClass	=> $STORE_CLASS,
        type		=> $ALIGNMENT_TYPE,
    };
}

sub generate_new_bam_coverage_entry {
    return {
        storeClass	=> $STORE_CLASS,
        type		=> $COVERAGE_TYPE
    };
}

__END__


=head1 NAME

add_bam_track.pl - add track configuration snippet(s) for BAM track(s)

=cut

=head1 USAGE

  add_bam_track.pl
    [ --in <input_trackList.json>  ]       \
        [ --out <output_trackList.json>        \
    --label <track_label>                  \
    --bam_url <url_to_bam_file>            \
    [ --key <track_key> ]                  \
    [ --classname <css_class> ]            \
    [ --bigwigCoverage <url_to_bw_file> ]                       \
    [ --coverage ]                         \
    [ --min_score <min_score> ]            \
    [ --max_score <max_score> ]            \
    [ --help ]

=head1 ARGUMENTS

=over 4

=item --in <file>

input trackList.json file. Default: data/trackList.json.

=item --out <file>

Output trackList.json file. Default: data/trackList.json.

=item --bam_url <url>

URL to BAM file (can be a relative path)

=item --label <unique_label>

unique track label for the new track.

=item --key <keyname>

key (display name) for track [default: label value]

=item --classname <classname>

CSS class for display [default: bam]

=item --bigwigCoverage <url>

URL to BW file correlated to BAM file. Display coverage depth when zoomed out.

=item --coverage

display coverage data instead of alignments

=item --min_score <score>

optional minimum score to use for generating coverage plot (only applicable with --coverage option)

=item --max_score <score>

optional maximum score to use for generating coverage plot (only applicable with --coverage option)

=item --config '{ "my_key": "my_value", ... }'

optional additional data to include in the track configuration. Any values provided here will override
the values generated by the rest of the script.

=back

=cut
