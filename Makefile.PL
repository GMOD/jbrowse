
use strict;
use warnings;



use File::Find;
use ExtUtils::MakeMaker 6.30;


my %libhash;
find(sub {
    my $dest=$File::Find::name;
    my $src=$dest;
    if(/pm$/) {
        $dest=~ s/src\/perl5\///;
        $libhash{$src}='$(INST_LIB)/'.$dest;
    }
}, "src/perl5");

my %WriteMakefileArgs = (
  "ABSTRACT" => "A modern web-based genome browser.",
  "AUTHOR" => "Eric Yao, Colin Diesh, & other contributors",
  "BUILD_REQUIRES" => {
    "Test::More" => 0,
    "Test::Warn" => 0,
    "Capture::Tiny" => 0,
    "DBD::SQLite" => 0,
  },
  "CONFIGURE_REQUIRES" => {
    "ExtUtils::MakeMaker" => "6.30"
  },
  "DISTNAME" => "JBrowse",
  "EXE_FILES" => [
    "bin/ucsc-to-json.pl",
    "bin/remove-track.pl",
    "bin/generate-names.pl",
    "bin/maker2jbrowse",
    "bin/prepare-refseqs.pl",
    "bin/biodb-to-json.pl",
    "bin/draw-basepair-track.pl",
    "bin/flatfile-to-json.pl",
    "bin/new-plugin.pl",
    "bin/add-bw-track.pl",
    "bin/add-bam-track.pl",
    "bin/add-json.pl",
    "bin/add-track-json.pl",
    "bin/json2conf.pl",
  ],
  "LICENSE" => "perl",
  "NAME" => "JBrowse",
  "PREREQ_PM" => {
    "Bio::Annotation::SimpleValue" => 0,
    "Bio::FeatureIO" => 0,
    "Bio::GFF3::LowLevel" => "1.8",
    "Bio::GFF3::LowLevel::Parser" => "1.8",
    "Bio::Index::Fasta" => 0,
    "Bio::OntologyIO" => 0,
    "Bio::Root::Version" => "1.006000",
    "Bio::SeqFeature::Annotated" => 0,
    "Bio::SeqFeature::Lite" => 0, #< for Bio::DB::BAM
    "Carp" => 0,
    "Cwd" => 0,
    "DBI" => 0,
    "Data::Dumper" => 0,
    "DB_File" => 0,
    "Devel::Size" => 0,
    "Digest::Crc32" => 0,
    "Exporter" => 0,
    "Fcntl" => 0,
    "File::Basename" => 0,
    "File::Copy::Recursive" => 0,
    "File::Path" => 2,
    "File::Next" => 0,
    "File::Spec" => 0,
    "File::Spec::Functions" => 0,
    "File::Temp" => 0,
    "FindBin" => 0,
    "Getopt::Long" => 0,
    "Hash::Merge" => 0,
    "Heap::Simple" => 0,
    "Heap::Simple::XS" => 0,
    "IO::File" => 0,
    "IO::Uncompress::Gunzip" => 0,
    "JSON" => 2,
    "JSON::XS" => 0,
    "List::Util" => 0,
    "List::MoreUtils" => 0.28,
    "POSIX" => 0,
    "PerlIO::gzip" => 0,
    "Pod::Usage" => 0,
    "Parse::RecDescent" => 0,
    "Scalar::Util" => 0,
    "Storable" => 0,
    "URI::Escape" => 0,
    "base" => 0,
    "constant" => 0,
    "local::lib" => 0,
    "strict" => 0,
    "vars" => 0,
    "warnings" => 0
  },
  "VERSION" => "dev",
  "test" => {
    "TESTS" => "t/*.t"
  },
  "PM" => \%libhash
);


unless ( eval { ExtUtils::MakeMaker->VERSION(6.56) } ) {
  my $br = delete $WriteMakefileArgs{BUILD_REQUIRES};
  my $pp = $WriteMakefileArgs{PREREQ_PM};
  for my $mod ( keys %$br ) {
    if ( exists $pp->{$mod} ) {
      $pp->{$mod} = $br->{$mod} if $br->{$mod} > $pp->{$mod};
    }
    else {
      $pp->{$mod} = $br->{$mod};
    }
  }
}

delete $WriteMakefileArgs{CONFIGURE_REQUIRES}
  unless eval { ExtUtils::MakeMaker->VERSION(6.52) };

WriteMakefile(%WriteMakefileArgs);



