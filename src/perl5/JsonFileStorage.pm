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

use constant DEFAULT_MAX_JSON_DEPTH => 2048;

=head2 new( $outDir, $compress, \%opts )

Constructor.  Takes the directory to work with, boolean flag of
whether to compress the results, and an optional hashref of other
options as:

  # TODO: document options hashref

=cut

sub new {
    my ($class, $outDir, $compress, $opts) = @_;

    # create JSON object
    my $json = JSON->new->relaxed->max_depth( DEFAULT_MAX_JSON_DEPTH );
    # set opts
    if (defined($opts) and ref($opts) eq 'HASH') {
        for my $method (sort keys %$opts) {
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

sub _write_htaccess {
    my ( $self ) = @_;
    if( $self->{compress} && ! $self->{htaccess_written} ) {
        require IO::File;
        require GenomeDB;
        my $hn = File::Spec->catfile( $self->{outDir}, '.htaccess' );
        open my $h, '>', $hn or die "$! writing $hn";
        $h->print( GenomeDB->precompression_htaccess( '.jsonz', '.txtz', '.txt.gz' ));
        $self->{htaccess_written} = 1;
    }
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
    return length($self->{json}->canonical()->encode($obj));
}

=head2 put

=cut

sub put {
    my ($self, $path, $toWrite) = @_;

    $self->_write_htaccess;

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
    $fh->print($self->{json}->canonical()->encode($toWrite))
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
        eval {
            $default = $self->{json}->decode(<$fh>)
        }; if( $@ ) {
            die "Error parsing JSON file $file: $@\n";
        }
        $default or die "couldn't read from $file: $!";
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

    $self->_write_htaccess;

    my $file = $self->fullPath($path);
    my ($data, $assign);
    my $fh = new IO::File $file, O_RDWR | O_CREAT
      or die "couldn't open $file: $!";
    flock $fh, LOCK_EX;
    # if the file is non-empty,
    if (($fh->stat())[7] > 0) {
        # get data
        my $jsonString = join("", $fh->getlines());
        if ( length( $jsonString ) > 0 ) {
            eval {
                $data = $self->{json}->decode($jsonString);
            }; if( $@ ) {
                die "Error parsing JSON file $file: $@\n";
            }
        }
        # prepare file for re-writing
        $fh->seek(0, SEEK_SET);
        $fh->truncate(0);
    }
    # modify data, write back
    $fh->print($self->{json}->canonical()->encode($callback->($data)))
      or die "couldn't write to $file: $!";
    $fh->close()
      or die "couldn't close $file: $!";
}

=head2 touch( $file )

=cut

sub touch {
    my $file = shift->fullPath(@_);
    open my $f, '>>', $file or die "$! touching $file";
}

1;
