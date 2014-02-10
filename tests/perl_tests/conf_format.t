use strict;
use warnings;

use Test::More;
use JBlibs;
use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp';

use_ok( 'Bio::JBrowse::ConfigurationFile' );

my $gbConfig = Bio::JBrowse::ConfigurationFile
  ->new( path => 'tests/js_tests/spec/GBrowseParseTestBasic.conf' )
  ->to_hashref;

ok($gbConfig->{'TRACK DEFAULTS'});
is($gbConfig->{'TRACK DEFAULTS'}{'glyph'           },'generic');
is($gbConfig->{'TRACK DEFAULTS'}{'height'          },8);
is($gbConfig->{'TRACK DEFAULTS'}{'bgcolor'         },'#fefefe');
is($gbConfig->{'TRACK DEFAULTS'}{'fgcolor'         },'black');
is($gbConfig->{'TRACK DEFAULTS'}{'label density'   },25);
is($gbConfig->{'TRACK DEFAULTS'}{'bump density'    },25);
is($gbConfig->{'TRACK DEFAULTS'}{'fogbat'    },'');

ok($gbConfig->{'Markers:region'});
is($gbConfig->{'Markers:region'}{'feature'         },'match:ITAG_sgn_markers');
is($gbConfig->{'Markers:region'}{'ignore_sub_part' },'match_part');
is($gbConfig->{'Markers:region'}{'key'             },'Markers');
is($gbConfig->{'Markers:region'}{'fgcolor'         },'black');
is($gbConfig->{'Markers:region'}{'bgcolor'         },'yellow');
is($gbConfig->{'Markers:region'}{'glyph'           },'generic');
is($gbConfig->{'Markers:region'}{'label density'   },100);
is($gbConfig->{'Markers:region'}{'bump density'    },100);
is($gbConfig->{'Markers:region'}{'link'            },'/search/quick?term=$name');
is($gbConfig->{'Markers:region'}{'citation'        },'GenomeThreader alignments of SGN marker sequences.');

ok($gbConfig->{'DM_BAC'});
is($gbConfig->{'DM_BAC'}{'feature'}, '"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_sg" "BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_sb" "BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_lg" "BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_lb" "BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_hg" "BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_hb"');
is($gbConfig->{'DM_BAC'}{'citation' },'BAC ends from the \'POTATO-B-01-100-110KB\' library aligned using SSAHA2. The clone ends pair correctly (solid connector) or not (dashed connector), and are color coded by insert-size.  Provided by Dan Bolser, <a href="http://www.compbio.dundee.ac.uk/">University of Dundee</a>.');

is($gbConfig->{'sub'}{'section'}{'giant word'},'Antidisestablishmentarianism');
is($gbConfig->{'sub'}{'section'}{'multiline'},'herp derp');
is($gbConfig->{'sub'}{'section'}{'fancyMultiline'},'Le herp derp');
is( scalar @{$gbConfig->{sub}{section}{array}}, 3 );
is( $gbConfig->{sub}{section}{array}[0], 1 );
is( $gbConfig->{sub}{section}{array}[1], 2 );
is( $gbConfig->{sub}{section}{array}[2], 3 );
is( $gbConfig->{sub}{section}{inline}{subsection}{deeply} , 'hihi' );
is( $gbConfig->{sub}{section}{inline}{con}{spaces} , 'hoho' );

is( $gbConfig->{threshold}, -1234221e-02 );

is( scalar( @{$gbConfig->{em}{bedded}{json}{myjson}}), 2 )
    or diag explain $gbConfig->{em}{bedded}{json};
is( $gbConfig->{em}{bedded}{json}{myjson}[0]{zee} ,'hallo');
is( $gbConfig->{em}{bedded}{json}{myjson}[1], 53 );

like( $gbConfig->{function_testing}{randomNumberTitle}, qr/}$/ );

like( $gbConfig->{function_testing}{alertTest}, qr/}$/ );

is( $gbConfig->{array_of_objects}{foo}[0]{nog}, 1 );
is( $gbConfig->{array_of_objects}{foo}[1]{egg}, 2 );

is( $gbConfig->{array_of_objects}{bar}[0], 'one' );
is( $gbConfig->{array_of_objects}{bar}[1], 'two' );
is( $gbConfig->{array_of_objects}{bar}[2], 'three and a half' );
is( $gbConfig->{array_of_objects}{bar}[3], 'four' );

done_testing;
