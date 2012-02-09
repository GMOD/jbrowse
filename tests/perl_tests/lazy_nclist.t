use strict;
use warnings;

use Test::More;
use List::Util 'sum';

use JSON 2;

use ArrayRepr;

use_ok('LazyNCList');

my $lazyClass = 2;
my %nclist_output;
my $list = LazyNCList->new(
    # array spec
    ArrayRepr->new([
        { attributes => [qw( Start End Strand Id Name Subfeatures )],
          isArrayAttr => { 'Subfeatures' => 1 },
        },
        { attributes  => [qw( Start End Strand Type )] },
        { attributes  => [qw( Start End Chunk )],
          isArrayAttr => {'Sublist' => 1}
        },
        ]
    ),
    # class number for lazy class
    $lazyClass,
    # make lazy feature
    sub {
        my ( $start, $end, $id ) = @_;
        #make feature
        diag "making lazy feature [$lazyClass, $start, $end, $id]\n";
        [$lazyClass, $start, $end, $id];
    },
    # load chunk from storage
    sub { $nclist_output{ $_[0] } },
    # measure size of serialized chunk in bytes
    sub { 1 + length encode_json( $_[0] ) },
    # output chunk
    sub {
        my ($toStore, $chunkId) = @_;
        $nclist_output{$chunkId} = $toStore;
    },
    10_000,
  );

my $features = decode_json( slurp( 'tests/data/tomato_features.json' ) );
diag "loaded ".@$features." test features";

$list->addSorted( $_ ) for @$features;

#{ open my $f, '>', 'tests/data/tomato_features_nclist_with_chunksize_10000.json' or die;
#  print $f encode_json( \%nclist_output );
#}
#my $correct_nclist = decode_json( slurp( 'tests/data/tomato_features_nclist_with_chunksize_10000.json' ) );
my $correct_nclist = {}; # set to empty for now, because we don't know the correct output

is( sum( map scalar @$_, values %nclist_output ), scalar @$features, 'all the features got into the nclists' )
   or find_missing_features( $features, \%nclist_output );

is_deeply(
    \%nclist_output,
    $correct_nclist,
    'got the right output chunks'
  ) or diag explain \%nclist_output;

done_testing;

###########

sub slurp { open my $f, '<', $_[0]; local $/; <$f> }

sub find_missing_features {
    my ( $features, $nclist_chunks ) = @_;

    require Data::Dump;
    my $keyfunc = \&Data::Dump::dump;

    my %seen;
    my %original_features;
    for ( @$features ) {
        my $key = $keyfunc->($_);
        $original_features{ $key } = 1;
        $seen{ $key } = 1;
    }

    require Data::Visitor::Callback;

    Data::Visitor::Callback->new(
        array => sub {
            my ( $v, $array ) = @_;
            my $key = $keyfunc->($array);
            #warn "visiting $key";
            if( $array->[0] == 0 && @$array == 7 && ref $array->[6] eq 'ARRAY' ) {
                # it's a top-level feature
                my $key = $keyfunc->($array);
                #warn "seen $key";
                $seen{ $key  }++;
            } else {
                # it's something else; recurse
                $v->visit( $_ ) for @$array;
            }
        },
    )->visit( $nclist_chunks );

    my $irregular_count = 0;
    for my $key ( keys %seen ) {
        my $count = $seen{$key};
        $count-- if $original_features{$key};
        next if $count == 1;
        $irregular_count++;
        diag "PROBLEM: feature seen $count time(s) in LazyNCList output: $key\n";
    }
    diag "$irregular_count total irregular features";
}
