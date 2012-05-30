use strict;
use warnings;

use JBlibs;

use Test::More;
use List::Util 'sum';
use Storable 'dclone';
use Data::Dumper;

use JSON 2;

#use Data::Visitor::Callback;

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
        #diag "making lazy feature [$lazyClass, $start, $end, $id]\n";
        [$lazyClass, $start, $end, $id];
    },
    # load chunk from storage
    sub {
        #diag "lazy-loading chunk $_[0]";
        $nclist_output{ $_[0] }
    },
    # measure size of serialized chunk in bytes
    sub { 1 + length encode_json( $_[0] ) },
    # output chunk
    sub {
        my ($toStore, $chunkId) = @_;
        #diag "writing lazy chunk $chunkId";
        $nclist_output{$chunkId} = $toStore;
    },
    10_000,
  );

my $features = decode_json( slurp( 'tests/data/tomato_features.json' ) );
diag "loaded ".@$features." test features";
my $features_clone = dclone $features;

$list->addSorted( $_ ) for @$features;
$list->finish;

{
    local $TODO = 'not causing problems right now, but needs to be fixed';
    is_deeply( $features,
               $features_clone,
               'LazyNCList did not modify the features it was passed' );

    #find_missing_features( $features_clone, \%nclist_output );

}

# remove this one when the TODO above is passing
#find_missing_features( $features, \%nclist_output );


# #use this to re-dump the correct output if needed at some point
# { open my $f, '>', 'tests/data/tomato_features_nclist_with_chunksize_10000.json' or die;
#   print $f encode_json( \%nclist_output );
# }
my $correct_nclist = decode_json( slurp( 'tests/data/tomato_features_nclist_with_chunksize_10000.json' ) );

is_deeply(
    \%nclist_output,
    $correct_nclist,
    'got the right output chunks'
  );

# test overlapCallback
my $oc_count = 0;
$list->overlapCallback( $list->minStart, $list->maxEnd, sub { $oc_count++ } );
is( $oc_count, scalar @$features, 'overlapCallback hit all features' );

done_testing;

###########

sub slurp { open my $f, '<', $_[0]; local $/; <$f> }

sub find_missing_features {
    my ( $features, $nclist_chunks ) = @_;

    my $keyfunc = sub {
        local $Data::Dumper::Terse = 1;
        Data::Dumper::Dumper( @_ );
    };

    my %original_features;
    my %output_features;
    for ( @$features ) {
        my $key = $keyfunc->($_);
        $original_features{ $key } = 1;
    }

    Data::Visitor::Callback->new(
        array => sub {
            my ( $v, $array ) = @_;
            my $key = $keyfunc->($array);
            #warn "visiting $key";
            if( $array->[0] == 0
                && (@$array == 7 || @$array == 8)
                && ref $array->[6] eq 'ARRAY'
              ) {
                # it's a top-level feature
                my $key = $keyfunc->($array);
                $output_features{ $key  }++;

                # visit its sublist if it has one
                $v->visit( $array->[7]) if $array->[7] && ref $array->[7] eq 'HASH';
            } else {
                # it's something else; recurse
                $v->visit( $_ ) for @$array;
            }
        },
    )->visit( $nclist_chunks );

    is_deeply( \%original_features, \%output_features );

    my $irregular_count = 0;
    for my $key ( keys %original_features ) {
        my $count = $output_features{$key} || 0;
        next if $count == 1;
        $irregular_count++;
        diag "PROBLEM: feature seen $count time(s) in LazyNCList output:\n$key\n";
    }

    is( $irregular_count, 0, "$irregular_count total irregular features" );

    return $irregular_count;
}
