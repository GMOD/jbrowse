use strict;
use warnings;

use JBlibs;

use Test::More;
use File::Temp;

use Bio::JBrowse::FeatureStream::GFF3_LowLevel;

sub tempdir {
    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    #diag "using temp dir $tempdir";
    return $tempdir;
}


{
    require Bio::GFF3::LowLevel::Parser;
    my $p = Bio::GFF3::LowLevel::Parser->open( 'tests/data/redundant.gff3' );

    my $s = Bio::JBrowse::FeatureStream::GFF3_LowLevel->new(
        parser => $p,
        track_label => 'faketracklabel'
     );

    my @i = $s->next_items;
    is_deeply( \@i,
[
  {
    'alias' => 'noggin',
    'end' => '180744',
    'id' => 'au9.g1002',
    'name' => 'au9.g1002',
    'name2' => 'foobar',
    'score' => '0.84',
    'score2' => '20',
    'seq_id' => 'Group1.36',
    'source' => 'AU9',
    'start' => '176975',
    'start2' => '99839',
    'strand' => '+',
    'type' => 'gene'
  }
]
 ) or diag explain \@i, $p;
}

done_testing;
