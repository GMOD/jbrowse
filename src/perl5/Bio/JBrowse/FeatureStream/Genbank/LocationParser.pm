package Bio::JBrowse::FeatureStream::Genbank::LocationParser;
use strict;
use warnings;

use Parse::RecDescent;

my $p = Parse::RecDescent->new( <<'EOG' );

location_expression: join | complement | order | location | <error>

complement: 'complement' '(' location_expression ')'
   {
     $_->{strand} = -($_->{strand}||1) for @{$item[3]};
     $return = [ reverse @{$item[3]} ];
   }

order: 'order' '(' loc_list ')'
   { $return = $item[3] }

join: 'join' '(' loc_list ')'
   { $return = $item[3] }

loc_list: <leftop: location_expression "," location_expression >
   { $return = [ map @$_, map @$_, @item[1..$#item] ] }

location:  range | point_range | point

range: point ".." point
  { $return = [{ seq_id => $item[1][0]{seq_id}, start => $item[1][0]{start}, end => $item[3][0]{start} }] }

point_range: point "." point
  {
    my $loc = sprintf('%d',($item[1][0]{start}+$item[3][0]{start})/2 );
    $return = [{ seq_id => $item[1][0]{seq_id}, start => $loc, end => $loc }];
  }

point: local_point | remote_point

local_point: /[<>]?(\d+)/
  { $return = [{ start => $1, end => $1 }] }

remote_point: /[<>]?([^\(\),:]+):(\d+)/
  { $return = [{ seq_id => $1, start => $2, end => $2 }] }


EOG

sub parse {
    my ( $class, $expr ) = @_;
    return $p->location_expression( $expr );
}

1;
