use strict;
use warnings;

use JBlibs;

use Test::More;

use_ok( 'Bio::JBrowse::FeatureStream::Genbank::LocationParser' );


my @tests = (
    [ '123' => [ { start => 123, end => 123 } ] ],
    [ '<123' => [ { start => 123, end => 123 } ] ],
    [ '123.456' => [ { seq_id => undef, start => 289, end => 289 } ] ],
    [ '123 . 456' => [ { seq_id => undef, start => 289, end => 289 } ] ],
    [ '123..456' => [ { seq_id => undef, start => 123, end => 456 } ] ],
    [ 'join(join(complement(4918..5163),complement(foo:2691..4571)))' =>
  [
      {
          'end' => '5163',
          'seq_id' => undef,
          'start' => '4918',
          'strand' => -1
          },
      {
          'end' => '4571',
          'seq_id' => 'foo',
          'start' => '2691',
          'strand' => -1
          }
      ]
  ],
    );
for my $test ( @tests ) {
    my $features = Bio::JBrowse::FeatureStream::Genbank::LocationParser->parse( $test->[0] );
    is_deeply( $features, $test->[1], 'parse location '.$test->[0] ) or diag explain $features;
}


done_testing;
