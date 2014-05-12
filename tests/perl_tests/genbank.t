use strict;
use warnings;

use JBlibs;

use Test::More;
use File::Spec::Functions qw( catfile catdir );

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp';

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

use_ok('Bio::JBrowse::Cmd::FlatFileToJson');

sub run_with(@) {
    #system $^X, 'bin/flatfile-to-json.pl', @_;
    #ok( ! $?, 'flatfile-to-json.pl ran ok' );
    my @args = @_;
    #warnings_are {
      Bio::JBrowse::Cmd::FlatFileToJson->new( @args )->run;
    #} [], 'ran without warnings';
}

sub tempdir {
    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    #diag "using temp dir $tempdir";
    return $tempdir;
}

{
    my $tempdir = tempdir();
    run_with (
        '--out' => $tempdir,
        '--gbk' => catfile('tests','data','gstmu_full_record.gb'),
        '--key' => 'Fooish Bar Data',
        '--trackLabel' => 'foo',
        );
    my $read_json = sub { slurp( $tempdir, @_ ) };
    my $trackdata = FileSlurping::slurp_tree( catdir( $tempdir, qw( tracks foo NG_009246.1 )));

    # test start/stop of parent feature (full record)
    #diag explain $trackdata->{'trackData.json'}{'intervals'}{'nclist'};
    my $class=$trackdata->{'trackData.json'}->{'intervals'}{'nclist'}[0][0];
    my $structure=$trackdata->{'trackData.json'}->{'intervals'}{'classes'}[$class];
    my @structure_attributes=$structure->{attributes};

    my $index=0;
    for(my $i=0; $i < scalar @{$structure_attributes[0]}; $i++) {
        if( $structure_attributes[0][$i] eq 'Type' ) {
            $index=$i+1;
        }
    }

    is( $trackdata->{'trackData.json'}{'intervals'}{'nclist'}[0][1], 5001, "got right start coordinate (full record)" );
    is( $trackdata->{'trackData.json'}{'intervals'}{'nclist'}[0][2], 10950, "got right stop coordinate (full record)" );
    is( $trackdata->{'trackData.json'}{'intervals'}{'nclist'}[0][$index], 'mRNA', "got right type in parent feature (full record)" ) or diag explain $trackdata->{'trackData.json'}{'intervals'}{'nclist'}[0];

    # test that the right attributes are present
     is_deeply( [sort(@{$trackdata->{'trackData.json'}->{'intervals'}->{'classes'}->[0]->{'attributes'}})],
		[sort(@{[ 'Db_xref', 'Description', 'Gene', 'Gene_synonym', 'Name', 'Product', 'Transcript_id', 'Start', 'End',  'Strand',  'COMMENT',  'DEFINITION',  'CLASSIFICATION',  'LOCUS', 'KEYWORDS',  'ACCESSION',  'Seq_id',  'NCBI_TAXON_ID', 'MOL_TYPE', 'ORGANISM',  'Type', 'VERSION',  'SOURCE',  'Subfeatures']})],
		'got the right attributes in trackData.json')
	 or diag explain [sort(@{$trackdata->{'trackData.json'}->{'intervals'}->{'classes'}->[0]->{'attributes'}})];

    # test subfeatures
    # find index of subfeatures (to make test less brittle, in case attributes move around in the array)
    my $subFeatureIndex;
    for my $i ( 0 .. scalar( @{$trackdata->{'trackData.json'}->{'intervals'}->{'classes'}->[0]->{'attributes'}} ) - 1 ) {
	if ( $trackdata->{'trackData.json'}->{'intervals'}->{'classes'}->[0]->{'attributes'}->[$i] =~ m/subfeatures/i ){
	    $subFeatureIndex = $i;
	    last;
	}
    }
    my $actualSubFeatureIndex = $subFeatureIndex + 1; # because the first thing in nclist is 0
    ok( defined( $trackdata->{'trackData.json'}->{'intervals'}->{'nclist'}->[0]->[$actualSubFeatureIndex] ), "got something in subfeatures");

    my $subfeatures = $trackdata->{'trackData.json'}->{'intervals'}->{'nclist'}->[0]->[$actualSubFeatureIndex];
    is ( scalar @{$subfeatures}, 22, "got the right number of subfeatures") or diag explain $subfeatures;
#     ok ( scalar(@{$subfeatures->[0]}) == scalar(@{$trackdata->{'trackData.json'}->{'intervals'}->{'classes'}->[0]->{'attributes'}}) + 1,
#	 "subfeature array is the right length (length of attribute array + 1)");
    # test first subfeature completely
    $class=$subfeatures->[0][0];
    $structure=$trackdata->{'trackData.json'}->{'intervals'}{'classes'}[$class];
    @structure_attributes=$structure->{attributes};

    my $index_subfeature=0;
    for(my $i=0; $i < scalar @{$structure_attributes[0]}; $i++) {
        if( $structure_attributes[0][$i] eq 'Type' ) {
            $index_subfeature=$i+1;
        }
    }

    is ( $subfeatures->[0][0] && $subfeatures->[0][0], 1, "first item set correctly in subfeature");
    is ( $subfeatures->[0][1] && $subfeatures->[0][1], 5001, "start set correctly in subfeature") or diag explain $subfeatures->[0];
    is ( $subfeatures->[0][2] && $subfeatures->[0][2], 5114, "end set correctly in subfeature") or diag explain $subfeatures->[0];
    is ( $subfeatures->[0][$index_subfeature] && $subfeatures->[0][$index_subfeature], 'exon', "type set correctly in subfeature") or diag explain $subfeatures->[0];

}

{
    my $tempdir = tempdir();
    run_with (
        '--out' => $tempdir,
        '--gbk' => catfile('tests','data','gstmu_region_from_chromosome.gb'),
        '--key' => 'Fooish Bar Data',
        '--trackLabel' => 'foo',
        );

    my $read_json = sub { slurp( $tempdir, @_ ) };
    my $trackdata = FileSlurping::slurp_tree( catdir( $tempdir, qw( tracks foo NG_009246.1 )));

    # test subfeatures
    # find index of subfeatures (to make test less brittle, in case attributes move around in the array)
    my $subFeatureIndex;
    for my $i ( 0 .. scalar( @{$trackdata->{'trackData.json'}->{'intervals'}->{'classes'}->[0]->{'attributes'}} ) - 1 ) {
	if ( $trackdata->{'trackData.json'}->{'intervals'}->{'classes'}->[0]->{'attributes'}->[$i] =~ m/subfeatures/i ){
	    $subFeatureIndex = $i;
	    last;
	}
    }
    my $actualSubFeatureIndex = $subFeatureIndex + 1; # because the first thing in nclist is 0
    ok( defined( $trackdata->{'trackData.json'}->{'intervals'}->{'nclist'}->[0]->[$actualSubFeatureIndex] ), "got something in subfeatures when parsing genbank partial region file");

    my $subfeatures = $trackdata->{'trackData.json'}->{'intervals'}->{'nclist'}->[0]->[$actualSubFeatureIndex];
    ok ( exists $subfeatures->[0]->[1] && $subfeatures->[0]->[1] == 5001, "start set correctly in subfeature (partial region of chromosome)") || diag $subfeatures->[0]->[1];
    ok ( exists $subfeatures->[0]->[2] && $subfeatures->[0]->[2] == 5114, "end set correctly in subfeature (partial region of chromosome)") || diag $subfeatures->[0]->[2];

}





done_testing;
