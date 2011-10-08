package JsonFileStorage;

use strict;
use warnings;
use File::Spec;
use File::Path qw(make_path remove_tree);
use JSON 2;
use IO::File;
use Fcntl ":flock";
use PerlIO::gzip;

sub new {
    my ($class, $outDir, $compress, $opts) = @_;

    # create JSON object
    my $json = new JSON;
    # set opts
    if (defined($opts) and ref($opts) eq 'HASH') {
        for my $method (keys %$opts) {
            $json->$method( $opts->{$method} );
        }
    }

    my $self = {
                outDir => $outDir,
                ext => $compress ? ".jsonz" : ".json",
                compress => $compress,
                json => $json
               };
    bless $self, $class;

    make_path $outDir unless (-d $outDir);

    return $self;
}

sub fullPath {
    my ($self, $path) = @_;
    return File::Spec->join($self->{outDir}, $path);
}

sub ext {
    return shift->{ext};
}

sub encodedSize {
    my ($self, $obj) = @_
    return length($self->{json}->encode($obj));
}

sub put {
    my ($self, $path, $obj) = @_;

    my $file = $self->fullPath($path);
    my $fh = new IO::File $file, O_WRONLY | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    $fh->seek(0, SEEK_SET);
    $fh->truncate(0);
    if ($self->{compress}) {
        binmode($fh, ":gzip")
            or die "couldn't set binmode: $!";
    }
    $fh->print($self->{json}->encode($toWrite));
    $fh->close()
      or die "couldn't close $file: $!";
}

sub get {
    my ($path, $default) = @_;

    my $file = $self->fullPath($path);
    if (-s $file) {
        my $OLDSEP = $/;
        my $fh = new IO::File $file, O_RDONLY
            or die "couldn't open $file: $!";
        binmode($fh, ":gzip") if $self->{compress};
        flock $fh, LOCK_SH;
        undef $/;
        $default = $self->{json}->decode(<$fh>)
            or die "couldn't read from $file: $!";
        $fh->close()
            or die "couldn't close $file: $!";
        $/ = $OLDSEP;
    }
    return $default;
}

sub modify {
    my ($self, $path, $callback) = @_;

    my $file = $self->fullPath($path);
    my ($data, $assign);
    my $fh = new IO::File $file, O_RDWR | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    # if the file is non-empty,
    if (($fh->stat())[7] > 0) {
        # get data
        my $jsonString = join("", $fh->getlines());
        $data = $self->{json}->decode($jsonString) if (length($jsonString) > 0);
        # prepare file for re-writing
        $fh->seek(0, SEEK_SET);
        $fh->truncate(0);
    }
    # modify data, write back
    $fh->print($self->{json}->encode($callback->($data)))
      or die "couldn't write to $file: $!";
    $fh->close()
      or die "couldn't close $file: $!";
}

1;
