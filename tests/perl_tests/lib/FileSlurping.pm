=head1 NAME

FileSlurping - utility functions for slurping the contents of files in tests

=head1 FUNCTIONS

All functions below are exportable.

=cut

package FileSlurping;
use strict;
use warnings;

use base 'Exporter';
our @EXPORT_OK = qw( slurp_tree slurp );

use File::Next;

use JsonFileStorage;

=head2 slurp_tree( $dir )

Slurp an entire file tree full of .json files into a hashref indexed
by the B<relative> file name.  If two directory trees contain the same
files, slurp_tree on each of them will return the same contents.

=cut

sub slurp_tree {
    my ( $dir ) = @_;

    my %data;

    my $storage   = JsonFileStorage->new( $dir );
    my $storage_z = JsonFileStorage->new( $dir, 'compress' );

    my $output_files_iter = File::Next::files( $dir );
    while( my $file = $output_files_iter->() ) {
        my $rel = File::Spec->abs2rel( $file, $dir );
        $data{ $rel } = $rel =~ /\.json$/  ? $storage->get( $rel )   :
                        $rel =~ /\.jsonz$/ ? $storage_z->get( $rel ) :
                                             slurp( $file );
    }

    return \%data;
}

=head2 slurp

Slurp a single file and return it.

Because adding a dep on L<File::Slurp> for this is silly.

=cut

sub slurp {
    open my $f, '<', $_[0] or die "$! reading $_[0]";
    local $/;
    <$f>
}


1;
