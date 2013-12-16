package Bio::JBrowse::Cmd::IndexNames2;
use strict;
use warnings;

use base 'Bio::JBrowse::Cmd::IndexNames';


sub load {
    my ( $self, $ref_seqs, $names_files ) = @_;

    # convert the stream of name records into a stream of operations to do
    # on the data in the hash store
    my $operation_stream = $self->make_operation_stream( $self->make_name_record_stream( $ref_seqs, $names_files ), $names_files );

    # hash each operation and write it to a log file
    $self->name_store->stream_do(
        $operation_stream,
        sub {
            my ( $operation, $data ) = @_;
            my %fake_store = ( $operation->[0] => $data );
            $self->do_hash_operation( \%fake_store, $operation );
            return $fake_store{ $operation->[0] } || {};
        },
        $self->{stats}{operation_stream_estimated_count},
        );

}

sub _hash_operation_freeze { $_[1] }
sub _hash_operation_thaw   { $_[1] }

1;

