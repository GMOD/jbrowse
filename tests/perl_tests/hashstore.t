use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use Test::More;
use File::Temp 'tempdir';

use FileSlurping qw( slurp md5sum_tree );


my $tempdir = tempdir( CLEANUP => 1 );
diag $tempdir;

use_ok( 'Bio::JBrowse::HashStore');

my $store = Bio::JBrowse::HashStore->open(
    dir => $tempdir,
    empty => 1,
    nosync => 1,
    hash_bits => 16
);

my $key_counter = 0;
$store->stream_set( sub {
  if( $key_counter < 5_000 ) {
      return ( "key".$key_counter++ => [ map $key_counter+$_, 40..1 ] );
  }
  return;
});

#system "rm -rf tests/data/hash_store/test1; cp -r $tempdir tests/data/hash_store/test1";
my $output_sums = md5sum_tree( $tempdir );
# {
#     use JSON;
#     open my $f, '>', 'tests/data/hash_store/test1_sums.json' or die $!;
#     $f->print( JSON->new->encode( $output_sums ) );
# }

is_deeply( $output_sums, slurp( 'tests/data/hash_store/test1_sums.json' ), 'got right output' );

done_testing;

