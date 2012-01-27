use strict;
use warnings FATAL => 'all';

use Test::More;

use lib 'lib';
use FastaDatabase;

my $db = FastaDatabase->from_fasta( 'sample_data/raw/volvox/volvox.fa', glob 'sample_data/raw/yeast_scaffolds/chr*.fa.*' );
my $seq_ids = [ sort $db->seq_ids ];
is_deeply( $seq_ids,
           [ sort 'chrI','chrII', 'ctgA' ],
           'got right seq ids from FastaDatabase with multiple fasta files, some compressed, some not'
         )
  or diag explain $seq_ids;

is( $db->segment('chrII',2000,2100)->seq->seq,
    'GCATTGGTACTGGCATTAGTGTTGGAGTTGGTACTTTCAGTGGTAGTCGCACTAGTCCTGACGTTGATGCTGGCAGTGGTAGTAGCATTAGTGCTGGAGTT',
    'fetched a sequence OK' );

done_testing;
