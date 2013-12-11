package Bio::JBrowse::Cmd::IndexNames::BackCompat;
use strict;
use warnings;

use base 'Bio::JBrowse::Cmd::IndexNames';

sub load {
    my ( $self, $ref_seqs, $names_files ) = @_;

    # convert the stream of name records into a stream of operations to do
    # on the data in the hash store
    my $operation_stream = $self->make_operation_stream( $self->make_name_record_stream( $ref_seqs, $names_files ), $names_files );

    # finally copy the temp store to the namestore
    $self->vprint( "Using ".$self->name_store->meta->{hash_bits}."-bit hashing (".$self->requested_hash_bits." requested)\n" );

    $self->close_name_store;

    # make a stream of key/value pairs and load them into the HashStore
    $self->slow_stream_set(
        $operation_stream,
        $self->{stats}{operation_stream_estimated_count},
        ( $self->opt('incremental')
              ? sub {
                  return $self->_mergeIndexEntries( @_ );
                }
              : ()
        )
    );
}

sub slow_stream_set {
    my ( $self, $op_stream, $ops_count, $mergeSub ) = @_;

    my $name_store = $self->name_store_tied_hash;
    my $progressbar = $ops_count && $self->_make_progressbar('Writing index', $ops_count );
    my $progressbar_next_update = 0;

    my $ops_processed = 0;
    while( my $op = $op_stream->() ) {
        $self->do_hash_operation( $name_store, $op );

        $ops_processed++;
        if ( $progressbar && $ops_processed > $progressbar_next_update && $ops_processed < $ops_count ) {
            $progressbar_next_update = $progressbar->update( $ops_processed );
        }
    }
    if ( $progressbar && $ops_count > $progressbar_next_update ) {
        $progressbar->update( $ops_count );
    }
}

sub _make_progressbar {
    my ( $self, $description, $total_count ) = @_;

    return unless $self->opt('verbose');

    eval { require Term::ProgressBar };
    return if $@;

    my $progressbar = Term::ProgressBar->new({ name  => $description,
                                               count => $total_count,
                                               ETA   => 'linear'       });
    $progressbar->max_update_rate(1);
    return $progressbar;
}

sub _hash_operation_freeze { $_[1] }
sub _hash_operation_thaw   { $_[1] }

1;
