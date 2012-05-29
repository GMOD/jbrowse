package IntervalStore;
use strict;
use warnings;
use Carp;
use Storable ();

use ArrayRepr;
use LazyNCList;

=head1 NAME

IntervalStore - manages a set of intervals (genomic features)

=head1 SYNOPSIS

  my $js = JsonStore->new($pathTempl, $compress);
  my $is = IntervalStore->new({
               store   => $js,
               classes => [
                   {
                     attributes => ["Start", "End", "Strand"],
                   },
               ],
               urlTemplate => "lf-{Chunk}.jsonz",
           );
  my $chunkBytes = 80_000;
  $is->startLoad($chunkBytes);
  $is->addSorted([10, 100, -1])
  $is->addSorted([50, 80, 1])
  $is->addSorted([90, 150, -1])
  $is->finishLoad();
  $is->overlap(60, 85)

  => ([10, 100, -1], [50, 80, 1])

=head1 METHODS

=head2 new

 Title   : new
 Usage   : IntervalStore->new(
               store => $js,
               classes => {attributes => ["Start", "End", "Strand"]},
           )
 Function: create an IntervalStore
 Returns : an IntervalStore object
 Args    : The IntervalStore constuctor accepts the named parameters:
           store: object with put(path, data) method, will be used to output
                  feature data
           classes: describes the feature arrays; will be used to construct
                    an ArrayRepr
           urlTemplate (optional): template for URLs where chunks of feature
                                   data will be stored.  This is relative to
                                   the directory with the "trackData.json" file
           lazyClass (optional): index in classes->{attributes} array for
                                 the class indicating a lazy feature
           nclist (optional): the root of the nclist
           count (optional): the number of intervals in this IntervalStore
           minStart (optional): the earliest interval start point
           maxEnd (optional): the latest interval end point

           If this IntervalStore hasn't been loaded yet, the optional
           parameters aren't necessary.  But to access a previously-loaded
           IntervalStore, the optional parameters *are* needed.

=cut

sub new {
    my ($class, $args) = @_;

    my $self = {
                store => $args->{store},
                classes => Storable::dclone( $args->{classes} ),
                lazyClass => $args->{lazyClass},
                urlTemplate => $args->{urlTemplate} || ("lf-{Chunk}"
                                                        . $args->{store}->ext),
                attrs => ArrayRepr->new($args->{classes}),
                nclist => $args->{nclist},
                minStart => $args->{minStart},
                maxEnd => $args->{maxEnd},
                loadedChunks => {}
               };

    if (defined($args->{nclist})) {
        # we're already loaded
        $self->{lazyNCList} = 
          LazyNCList->importExisting($self->{attrs},
				     $args->{lazyClass},
                                     $args->{count},
                                     $args->{minStart},
                                     $args->{maxEnd},
                                     sub { $self->_loadChunk( @_ ); },
                                     $args->{nclist} );
    }

    bless $self, $class;

    return $self;
}

sub _loadChunk {
    my ($self, $chunkId) = @_;
    my $chunk = $self->{loadedChunks}->{$chunkId};
    if (defined($chunk)) {
        return $chunk;
    } else {
        (my $path = $self->{urlTemplate}) =~ s/\{Chunk\}/$chunkId/g;
        $chunk = $self->{store}->get($path);
        # TODO limit the number of chunks that we keep in memory
        $self->{loadedChunks}->{$chunkId} = $chunk;
        return $chunk;
    }
}

=head2 startLoad( $measure, $chunkBytes )

=cut

sub startLoad {
    my ($self, $measure, $chunkBytes) = @_;

    if (defined($self->{nclist})) {
        confess "loading into an already-loaded IntervalStore";
    } else {
        # add a new class for "fake" features
        push @{$self->{classes}}, {
                                   'attributes' => ['Start', 'End', 'Chunk'],
                                   'isArrayAttr' => {'Sublist' => 1}
                                  };
        $self->{lazyClass} = $#{$self->{classes}};
        my $makeLazy = sub {
            my ($start, $end, $chunkId) = @_;
            return [$self->{lazyClass}, $start, $end, $chunkId];
        };
        my $output = sub {
            my ($toStore, $chunkId) = @_;
            (my $path = $self->{urlTemplate}) =~ s/\{Chunk\}/$chunkId/g;
            $self->{store}->put($path, $toStore);
        };
        $self->{attrs} = ArrayRepr->new($self->{classes});
        $self->{lazyNCList} =
          LazyNCList->new($self->{attrs},
			  $self->{lazyClass},
                          $makeLazy,
                          sub { $self->_loadChunk( @_); },
                          $measure,
                          $output,
                          $chunkBytes);
    }
}

=head2 addSorted( \@feature )

=cut

sub addSorted {
    my ($self, $feat) = @_;
    $self->{lazyNCList}->addSorted($feat);
}

=head2 finishLoad()

=cut

sub finishLoad {
    my ($self) = @_;
    $self->{lazyNCList}->finish();
    $self->{nclist} = $self->lazyNCList->topLevelList();
}

=head2 overlapCallback( $from, $to, \&func )

Calls the given function once for each of the intervals that overlap
the given interval if C<<$from <= $to>>, iterates left-to-right, otherwise
iterates right-to-left.

=cut

sub overlapCallback {
    my ($self, $start, $end, $cb) = @_;
    $self->lazyNCList->overlapCallback($start, $end, $cb);
}


sub lazyNCList   { shift->{lazyNCList}        }
sub count        { shift->{lazyNCList}->count }
sub hasIntervals { shift->count > 0           }
sub store        { shift->{store}             }
sub classes      { shift->{classes}           }

=head2 descriptor

 Title   : descriptor
 Usage   : IntervalStore->descriptor()
 Returns : a hash containing the data needed to re-construct this
           IntervalStore, including the root of the NCList plus some
           metadata and configuration.
           The return value can be passed to the constructor later.

=cut

sub descriptor {
    my ($self) = @_;
    return {
            classes => $self->{classes},
            lazyClass => $self->{lazyClass},
            nclist => $self->{nclist},
            urlTemplate => $self->{urlTemplate},
            count => $self->count,
            minStart => $self->lazyNCList->minStart,
            maxEnd => $self->lazyNCList->maxEnd
           };
}

1;

=head1 AUTHOR

Mitchell Skinner E<lt>jbrowse@arctur.usE<gt>

Copyright (c) 2007-2011 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
