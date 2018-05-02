use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use Test::More;

use File::Spec::Functions 'catfile';
use File::Temp;
use Capture::Tiny 'capture';

use FileSlurping 'slurp_tree';

my $tempdir = File::Temp->newdir;

## check behavior for missing ref seqs

my ( $stdout, $stderr ) = capture {
    system $^X, 'bin/prepare-refseqs.pl', (
        '--conf' => 'sample_data/raw/yeast_genbank.json',
        '--refs' => 'DOES NOT EXIST',
        '--out'  => $tempdir,
        );
};
ok( ! $?, 'script succeeded for nonexistent ref' );
like( $stderr, qr/DOES NOT EXIST.+not found/i, 'warning message looks right' );

## check basic formatting of volvox sequence

$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    #'--refs'  => 'ctgA',
    '--fasta' => 'sample_data/raw/volvox/volvox.fa',
    '--out'   => $tempdir,
    '--nohash',
    '--trackConfig' => '{ "foo": "bar" }'
   );

my $output = slurp_tree( $tempdir );
is_deeply( $output,
           slurp_tree('tests/data/volvox_formatted_refseqs'),
           'got the right volvox formatted sequence',
          )
#    or diag explain $output
;


## check basic formatting with --noSort

$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--fasta' => 'sample_data/raw/random_contigs.fa',
    '--out'   => $tempdir,
    '--noSort',
   );

$output = slurp_tree( $tempdir );
is_deeply( $output,
           slurp_tree('tests/data/random_contigs_formatted_refseqs'),
           'got the right random contigs formatted sequence',
          )
#    or diag explain $output
;


## check genbank formatting
$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--refs'  => 'NC_001133',
    '--conf' => 'sample_data/raw/yeast_genbank.json',
    '--out'   => $tempdir
   );

ok( !$?, 'yeast genbank formatting ran OK' );
my @chunks = glob("$tempdir/seq/010/83b/05/NC_001133-*.txt");
is( scalar @chunks, 12, 'see 12 uncompressed seq chunks' ) or diag explain \@chunks;
#diag explain [glob("$tempdir/seq/*/*/*/*.txt")];

## check --reftypes support
$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--reftypes'  => 'chromosome,nonexistent',
    '--conf' => 'sample_data/raw/yeast_genbank.json',
    '--out'   => $tempdir
   );

ok( !$?, 'yeast genbank formatting ran OK with --reftypes' );
@chunks = glob("$tempdir/seq/010/83b/05/NC_001133-*.txt");
is( scalar @chunks, 12, 'see 12 uncompressed seq chunks' ) or diag explain \@chunks;
#diag explain [glob("$tempdir/seq/*/*/*/*.txt")];

## check compressed formatting
$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--refs'  => 'NC_001133',
    '--conf' => 'sample_data/raw/yeast_genbank.json',
    '--out'   => $tempdir,
    '--compress',
   );

ok( !$?, 'yeast genbank formatting ran OK' );

@chunks = glob("$tempdir/seq/*/*/*/NC_001133-*.txtz");
is( scalar @chunks, 3, 'see 3 COMPRESSED seq chunks' );
#diag explain \@chunks;

## check formatting from gff

$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--gff' => 'tests/data/embedded_sequence.gff3',
    '--out'   => $tempdir,
   );

$output = slurp_tree( $tempdir );

is_deeply( $output->{"seq/refSeqs.json"},
           [
               {
                   end => 10000,
                   length => 10000,
                   name => "Group1.36",
                   seqChunkSize => 20000,
                   start => 0,
               }
           ]);


## check formatting from --sizes
$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--sizes' => 'tests/data/volvox.sizes',
    '--out'   => $tempdir,
   );

$output = slurp_tree( $tempdir );

is_deeply( $output->{"seq/refSeqs.json"},
           [
               {
                   'end' => '50001',
                   'length' => '50001',
                   'name' => 'ctgA',
                   'start' => 0
               },
               {
                   'end' => '6079',
                   'length' => '6079',
                   'name' => 'ctgB',
                   'start' => 0
               }
           ]) or diag explain $output;

## check formatting from --gff-sizes
$tempdir = File::Temp->newdir;

system $^X, 'bin/prepare-refseqs.pl', (
    '--gff-sizes' => 'tests/data/tomato_sequence_regions.gff3',
    '--out'   => $tempdir,
   );

$output = slurp_tree( $tempdir );

is_deeply( $output->{"seq/refSeqs.json"},
  [
     {
       'end' => 20852292,
       'length' => 20852292,
       'name' => 'SL3.0ch00',
       'start' => 0
     },
     {
       'end' => 98455869,
       'length' => 98455869,
       'name' => 'SL3.0ch01',
       'start' => 0
     },
     {
       'end' => 55977580,
       'length' => 55977580,
       'name' => 'SL3.0ch02',
       'start' => 0
     },
     {
       'end' => 72290146,
      'length' => 72290146,
      'name' => 'SL3.0ch03',
      'start' => 0
    },
    {
      'end' => 66557038,
      'length' => 66557038,
      'name' => 'SL3.0ch04',
      'start' => 0
    },
    {
      'end' => 66723567,
      'length' => 66723567,
      'name' => 'SL3.0ch05',
      'start' => 0
    },
    {
      'end' => 49794276,
      'length' => 49794276,
      'name' => 'SL3.0ch06',
      'start' => 0
    },
    {
      'end' => 68175699,
      'length' => 68175699,
      'name' => 'SL3.0ch07',
      'start' => 0
    },
    {
      'end' => 65987440,
      'length' => 65987440,
      'name' => 'SL3.0ch08',
      'start' => 0
    },
    {
      'end' => 72906345,
      'length' => 72906345,
      'name' => 'SL3.0ch09',
      'start' => 0
    },
    {
      'end' => 65633393,
      'length' => 65633393,
      'name' => 'SL3.0ch10',
      'start' => 0
    },
    {
      'end' => 56597135,
      'length' => 56597135,
      'name' => 'SL3.0ch11',
      'start' => 0
    },
    {
      'end' => 68126176,
      'length' => 68126176,
      'name' => 'SL3.0ch12',
      'start' => 0
    }
  ]) or diag explain $output;

## test formatting from a Bio::DB::SeqFeature::Store with a
## biodb-to-json.pl conf file

$tempdir = File::Temp->newdir();
diag $tempdir;
($stdout, $stderr) = capture {
    local $ENV{PATH} = "extlib/bin:$ENV{PATH}";
    local $ENV{PERL5LIB} = join ':', @INC;

   system 'bp_seqfeature_load.pl', (
        '--adaptor' => 'DBI::SQLite',
        '--dsn'     => "$tempdir/sqliteDB",
        '--create',
        'sample_data/raw/volvox/volvox.gff3',
        'sample_data/raw/volvox/volvox.fa',
       );
};
unlike( $stderr, qr/error/i, 'no errors stderr from bp_seqfeature_load' );
is( $stdout, '', 'nothing on stdout from bp_seqfeature_load' );

{ open my $conf, '>', "$tempdir/conf" or die; $conf->print( <<EOCONF ); }
{
   "TRACK DEFAULTS" : {
      "autocomplete" : "all",
      "class" : "feature"
   },
   "db_args" : {
      "-adaptor" : "DBI::SQLite",
      "-dsn" : "$tempdir/sqliteDB"
   },
   "description" : "Sequence Test Database",
   "db_adaptor" : "Bio::DB::SeqFeature::Store"
}
EOCONF



{ open my $conf, '>', "$tempdir/conf" or die; $conf->print( <<EOCONF ); }
{
system $^X, 'bin/prepare-refseqs.pl', (
    '--conf' => "$tempdir/conf",
    '--out'   => "$tempdir/out",
    '--refs'  => 'ctgA,ctgB',
    '--nohash'
   );
$output = slurp_tree( "$tempdir/out" );
is_deeply( $output,
           slurp_tree('tests/data/volvox_formatted_refseqs'),
           'got the right volvox formatted sequence with --nohash',
          );# or diag explain $output;
}
EOCONF
done_testing;

