=head1 NAME

NameHandler - create indices of feature names

=head1 SYNOPSIS

  # instantiate with a callback that gives the directory to use for a
  # given reference sequence
  my $nameHandler = NameHandler->new(
     sub { "$trackDir/" . $_[0] . "/" . $track->{"track"}; };
  );

  for my $name ( @feature_names ) {
      $nameHandler->addName( $name );
  }

  # write out the finished names index
  $nameHandler->finish;

=head1 METHODS

=cut

package NameHandler;

use strict;
use warnings;

use Carp;
use File::Path;
use IO::File;

use JSON 2;

# index of the refseq name in the name array
# TODO: find a central place to put this knowledge
our $chromIndex = 3;

my $nameFile = "names.txt";

=head1 new( \&directory_callback )

Make a new NameHandler.  Takes a subroutine reference that should take
a reference sequence name as an argument and return the path to the
directory that should contain the name index we generate.

=cut

sub new {
    my ($class, $trackDirForChrom) = @_;

    my $self = {
        trackDirForChrom => $trackDirForChrom,
        nameFiles => {}
    };

    bless $self, $class;
    return $self;
}

=head1 addName( \@name_record )

Name record (an arrayref) to add to the names index.

=cut

sub addName {
    my ($self, $nameArr) = @_;

    my $chrom = $nameArr->[$chromIndex];

    unless (defined($chrom)) {
        carp "chrom not defined in " . JSON::to_json($nameArr) . "\n";
    }

    my $nameFile = $self->{nameFiles}->{$chrom} ||= $self->_newChrom($chrom);
    $nameFile->print( JSON::to_json( $nameArr, {pretty => 0} ), "\n" )
        or die "couldn't write to file for $chrom: $!";
}


# Given the name of the reference sequence, opens and returns a filehandle to the
# proper name index file.  Makes a new directory to hold the file if
# necessary.
sub _newChrom {
    my ($self, $chrom) = @_;

    my $chromDir = $self->{trackDirForChrom}->($chrom);
    mkpath( $chromDir ) unless -e $chromDir;

    my $namefile = "$chromDir/$nameFile";

    my $fh = IO::File->new( $namefile, '>' ) or die "$! writing $namefile";
    return $fh;
}

=head1 finish

Finalize and flush to disk any currently open name index.

=cut

sub finish {
    my ($self) = @_;
    foreach my $chrom (sort keys %{$self->{nameFiles}}) {
        my $fh = $self->{nameFiles}->{$chrom};
        if( $fh && $fh->opened ) {
            $fh->close or die "$! closing names file for ref seq $chrom";
        }
    }
}

sub DESTROY { shift->finish }
