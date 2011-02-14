package ExternalSorter;

use strict;
use warnings;

use Carp;
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
        my @unzipFiles =
            map {
                my $zip;
                open $zip, "<:gzip", $_
                    or croak "couldn't open $_: $!\n";
                unlink $_
                    or croak "couldn't unlink $_: $!\n";
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
                             UNLINK => 0,
                             TEMPLATE => 'sort-XXXXXXXXXX')
        or croak "couldn't open temp file: $!\n";
    my $fn = $fh->filename;
    $fh->close()
        or croak "couldn't close temp file: $!\n";
    open $fh, ">:gzip", $fn
        or croak "couldn't reopen $fn: $!\n";
    foreach my $item (@sorted) {
        store_fd($item, $fh)
            or croak "couldn't write item: $!\n";
    }
    $fh->flush()
        or croak "couldn't flush segment file: $!\n";
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
    if ($fh->eof()) {
        $fh->close();
        return undef;
    }
    my $item = fd_retrieve($fh)
        or croak "couldn't retrieve item: $!\n";
    return $item;
}

1;
