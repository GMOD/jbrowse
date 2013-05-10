=head1 NAME

Bio::JBrowse::ExternalSorter - efficiently sort serializable items with a given comparison function

=head1 SYNOPSIS

  # make a new sorter that sorts arrayrefs by column 4, then column 3
  my $sorter = Bio::JBrowse::ExternalSorter->new(
                sub ($$) {
                        $_[0]->[4] <=> $_[1]->[4]
                        ||
                        $_[1]->[3] <=> $_[0]->[3];
                }, $sortMem);

   for my $arrayref ( @arrayrefs ) {
       $sorter->add( $arrayref );
   }

   # finalize sort
   $sorter->finish;

   # iterate through the sorted arrayrefs
   while( my $arrayref = $sorter->get ) {

   }

=head1 METHODS

=cut


package Bio::JBrowse::ExternalSorter;

use strict;
use warnings;

use Carp;
use PerlIO::gzip;
use Storable qw(store_fd fd_retrieve);
use Devel::Size qw(size total_size);
use Heap::Simple;
use File::Temp;

=head1 new( \&comparison, $ramInBytes, $tmpDir )

Make a new sorter using the given comparison function, using at most
$ramInBytes bytes of RAM.  Optionally, can also pass $tmpDir, a path
to the temporary directory to use for intermediate files.

The comparison function must have a ($$) prototype.

=cut

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

=head1 add( $item )

Add a new item to the sort buffer.

=cut

sub add {
    my ($self, $item) = @_;
    $self->{curSize} += total_size($item);
    push @{$self->{curList}}, $item;
    if ($self->{curSize} >= $self->{ram}) {
        $self->flush();
    }
}

=head1 finish()

Call when all items have been added.  Finalizes the sort.

=cut

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
        @{$self->{curList}} = sort $compare @{$self->{curList}};
    }
    $self->{finished} = 1;
}

=head1 flush()

Write a sorted version of the list to temporary storage.

=cut

sub flush {
    my ($self) = @_;
    my $compare = $self->{compare};
    my @sorted = sort $compare @{$self->{curList}};

    # each segment must have at least one element
    return if ($#sorted < 0);
    croak "Bio::JBrowse::ExternalSorter is already finished"
        if $self->{finished};

    my $fh = File::Temp->new( $self->{tmpDir} ? (DIR => $self->{tmpDir}) : (),
                              SUFFIX => '.sort',
                              UNLINK => 0 )
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
    push @{$self->{segments}}, "$fn";
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

sub DESTROY {
    shift->cleanup();
}

sub cleanup {
    unlink $_ for @{shift->{segments}||[]}
}

1;
