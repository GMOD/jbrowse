package NameHandler;

use strict;
use warnings;
use Carp;
use Fcntl;
use File::Path;
use JSON 2;

# index of the refseq name in the name array
# TODO: find a central place to put this knowledge
our $chromIndex = 3;

my $nameFile = "names.json";

sub new {
    my ($class, $trackDirForChrom) = @_;

    my $self = {
        trackDirForChrom => $trackDirForChrom,
        nameFiles => {}
    };

    bless $self, $class;
    return $self;
}

sub addName {
    my ($self, $nameArr) = @_;
    my $chrom = $nameArr->[$chromIndex];
    unless (defined($chrom)) {
        carp "chrom not defined in " . JSON::to_json($nameArr) . "\n";
    }
    my $nameFile = $self->{nameFiles}->{$chrom};

    if (defined($nameFile)) {
        $nameFile->print(",");
    } else {
        $nameFile = $self->newChrom($chrom);
        $self->{nameFiles}->{$chrom} = $nameFile;
    }

    $nameFile->print(JSON::to_json($nameArr, {pretty => 0}))
        or die "couldn't write to file for $chrom: $!";
}

sub newChrom {
    my ($self, $chrom) = @_;
    my $chromDir = $self->{trackDirForChrom}->($chrom);
    mkpath($chromDir) unless (-d $chromDir);
    unlink "$chromDir/$nameFile";

    my $fh = new IO::File "$chromDir/$nameFile", O_WRONLY | O_CREAT | O_EXCL
        or die "couldn't open $chromDir/$nameFile: $!";

    $fh->print("[");
    return $fh;
}

sub finish {
    my ($self) = @_;
    foreach my $chrom (keys %{$self->{nameFiles}}) {
        my $fh = $self->{nameFiles}->{$chrom};
        $fh->print("]");
        $fh->close()
            or die "couldn't close file for $chrom: $!";
    }
}
