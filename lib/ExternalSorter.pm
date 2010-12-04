package ExternalSorter;

use strict;
use warnings;

use Carp;
#use IO::File;
#use IO::Compress::Gzip qw(:level $GzipError);
#use IO::Uncompress::Gunzip qw($GunzipError);
use PerlIO::gzip;
use Storable qw(store_fd fd_retrieve);
use Devel::Size qw(size total_size);
use Heap::Simple;
use File::Temp;

# the comparison function must have an ($$) prototype
# $ram is the amount of RAM to use before writing to disk (i.e., the size
#     of each external sort segment)
# tmpDir is an (optional) directory in which to create the temporary files
sub new {
    my ($class, $compare, $ram, $tmpDir) = @_;
    my $self = {
        tmpDir => $tmpDir,
        compare => $compare,
        ram => $ram,
        segments => [],
        curList => [],
        curSize => 0,
        finished => 0
    };
    bless $self, $class;
    return $self;
}

# add new item
sub add {
    my ($self, $item) = @_;
    $self->{curSize} += total_size($item);
    push @{$self->{curList}}, $item;
    if ($self->{curSize} >= $self->{ram}) {
        $self->flush();
    }
}

# to be called when all items have been added
sub finish {
    my ($self) = @_;
    my $compare = $self->{compare};
    if ($#{$self->{segments}} >= 0) {
        $self->flush();
        # my @unzipSegments =
        #     map {
        #         my $zip = IO::Uncompress::Gunzip->new($_)
        #             or croak "couldn't create gunzip: $GunzipError\n";
        #         $zip;
        #     } @{$self->{segments}};
        my @unzipFiles =
            map {
                my $zip;
                open $zip, "<:gzip", $_
                    or croak "couldn't open $_: $!\n";
                $zip;
            }  @{$self->{segments}};
        my $readSegments =
            Heap::Simple->new(order => sub {$compare->($_[0], $_[1]) < 0},
                              elements => "Any");
        foreach my $fh (@unzipFiles) {
            $readSegments->key_insert(readOne($fh), $fh);
        }
        $self->{readSegments} = $readSegments;
    } else {
        $self->{curList} =
            [sort $compare @{$self->{curList}}];
    }
    $self->{finished} = 1;
}

# write out a sorted version of the current list
sub flush {
    my ($self) = @_;
    my $compare = $self->{compare};
    my @sorted = sort $compare @{$self->{curList}};

    # each segment must have at least one element
    return if ($#sorted < 0);
    croak "ExternalSorter is already finished"
        if $self->{finished};

    my $fh = File::Temp->new($self->{tmpDir} ? (DIR => $self->{tmpDir}) : (),
                             UNLINK => 0)
        or croak "couldn't open temp file: $!\n";
    my $fn = $fh->filename;
    $fh->close()
        or croak "couldn't close temp file: $!\n";
    open $fh, ">:gzip", $fn
        or croak "couldn't reopen $fn: $!\n";
    #print STDERR "opened temp file $fn\n";
    # my $zip = IO::Compress::Gzip->new($fh, Level => Z_BEST_SPEED)
    #     or croak "IO::Compress::Gzip failed: $GzipError\n";
    foreach my $item (@sorted) {
        # my $frozen = freeze($item);
        # # the format of records in the file is a length, written in pack("w")
        # # format, followed by the Storable frozen version of the item itself.
        # # see the readOne method
        # $zip->write(pack("w", length($frozen)))
        #     or croak "couldn't write length: $GzipError\n"; #should this be $! ?
        # $zip->write($frozen)
        store_fd($item, $fh)
            or croak "couldn't write item: $!\n";
    }
    # $zip->flush()
    #     or croak "couldn't flush gzip stream: $GzipError $!\n";
    # $zip->close()
    #     or croak "couldn't close gzip stream: $GzipError $!\n";
    $fh->flush()
        or croak "couldn't flush segment file: $!\n";
    # $fh->seek(0, 0)
    #     or croak "couldn't seek to beginning of segment file: $!\n";
    $fh->close()
        or croak "couldn't close $fn: $!\n";
    push @{$self->{segments}}, $fn;
    $self->{curList} = [];
    $self->{curSize} = 0;
}

# get one item from the big list
sub get {
    my ($self) = @_;
    croak "External sort not finished\n"
        unless $self->{finished};
    if ($#{$self->{segments}} >= 0) {
        my $item = $self->{readSegments}->first_key();
        my $fh = $self->{readSegments}->extract_first();
        # if we're out of items, return undef
        if (!defined($fh)) { return undef; }
        my $newItem = readOne($fh);
        if (defined($newItem)) {
            $self->{readSegments}->key_insert($newItem, $fh);
        }
        return $item;
    } else {
        return shift @{$self->{curList}};
    }
}

# read one item from a file handle
sub readOne {
    my ($fh) = @_;
    #my @lenBytes;
    #my $byte;
    if ($fh->eof()) {
        $fh->close();
        return undef;
    }
    # # the format of records in the file is a length, written in pack("w")
    # # format, followed by the Storable frozen version of the item itself.
    # # see the flush method
    # do {
    #     $byte = $fh->getc()
    #         or croak "couldn't read item length from file; current length takes up " . ($#lenBytes + 1) . " bytes; at line " . $fh->input_line_number() . " in file " . $fh->fileno() . "\n";
    #     push @lenBytes, $byte;
    # } until (ord($byte) < 128);
    # my $len = unpack("w", join("", @lenBytes));
    # my $frozen;
    # $fh->read($frozen, $len)
    #     or croak "couldn't read item from file";
    # return thaw($frozen);
    my $item = fd_retrieve($fh)
        or croak "couldn't retrieve item: $!\n";
    return $item;
}

1;
