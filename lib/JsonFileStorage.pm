=head1 NAME

JsonFileStorage - manage a directory structure of .json or .jsonz files

=head1 SYNOPSIS

    my $storage = JsonFileStorage->new( $outDir, $self->config->{compress} );
    $storage->put( 'relative/path/to/file.jsonz', \%data );
    my $data = $storage->get( 'relative/path/to/file.jsonz' );

    $storage->modify( 'relative/path/to/file.jsonz',
                      sub {
                         my $json_data = shift;
                         # do something with the data
                         return $json_data;
                      })

=head1 METHODS

=cut

package JsonFileStorage;

use strict;
use warnings;
use File::Spec;
use File::Path qw( mkpath );
use JSON 2;
use IO::File;
use Fcntl ":flock";
use PerlIO::gzip;

=head2 new( $outDir, $compress, \%opts )

Constructor.  Takes the directory to work with, boolean flag of
whether to compress the results, and an optional hashref of other
options as:

  # TODO: document options hashref

=cut

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

    mkpath( $outDir ) unless (-d $outDir);

    return $self;
}

=head2 fullPath( 'path/to/file.json' )

Get the full path to the given filename in the output directory.  Just
calls File::Spec->join with the C<<$outDir>> that was set at
construction.

=cut

sub fullPath {
    my ($self, $path) = @_;
    return File::Spec->join($self->{outDir}, $path);
}

=head2 ext

Accessor for the file extension currently in use for the files in this
storage directory.  Usually either '.json' or '.jsonz'.

=cut

sub ext {
    return shift->{ext};
}

=head2 encodedSize

=cut

sub encodedSize {
    my ($self, $obj) = @_;
    return length($self->{json}->encode($obj));
}

=head2 put

=cut

sub put {
    my ($self, $path, $toWrite) = @_;

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
    $fh->print($self->{json}->encode($toWrite))
      or die "couldn't write to $file: $!";
    $fh->close()
      or die "couldn't close $file: $!";
}

=head2 get

=cut

sub get {
    my ($self, $path, $default) = @_;

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

=head2 modify

=cut

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
