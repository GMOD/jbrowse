=head1 NAME

FileSlurping - utility functions for slurping the contents of files in tests

=head1 FUNCTIONS

All functions below are exportable.

=cut

package FileSlurping;
use strict;
use warnings;

use base 'Exporter';
our @EXPORT_OK = qw( slurp_tree slurp md5sum_tree );

use File::Spec;

use File::Next;
use JSON 2 ();

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
        next if $file =~ /\.htaccess$/;
        my $rel = File::Spec->abs2rel( $file, $dir );
        $data{ $rel } = $rel =~ /\.json$/  ? $storage->get( $rel )   :
                        $rel =~ /\.jsonz$/ ? $storage_z->get( $rel ) :
                                             slurp( $file );
    }

    return \%data;
}

=head2 md5sum_tree

Return a hashref like { "path/to/file" => "123abc" } with md5sums of all
the files in the given directory.

=cut

sub md5sum_tree {
    my ( $dir ) = @_;

    my $md5 = _find_md5_implementation();

    my %sums;
    my $output_files_iter = File::Next::files( $dir );
    while( my $file = $output_files_iter->() ) {
        next if $file =~ /\.htaccess$/;
        my $rel = File::Spec->abs2rel( $file, $dir );
        $sums{$rel} = $md5->( $file );
    }
    return \%sums;
}

use Digest::MD5;
sub _find_md5_implementation {
    return sub {
        open my $f, '<', shift or die;
        return Digest::MD5->new->addfile( $f )->hexdigest;
    };
}

=head2 slurp

Slurp a single file and return it.  Uncompresses .jsonz and .gz files,
and decodes the JSON in .json and .jsonz files.

Because adding a dep on L<File::Slurp> for this is silly.

=cut

sub slurp {
    if( @_ > 1 ) {
        @_ = ( File::Spec->catfile( @_ ) );
    }

    my $gzip = $_[0] =~ m!\.(gz|jsonz)$! ? ':gzip' : '';
    my $contents = do {
        open my $f, "<$gzip", $_[0] or die "$! reading $_[0]";
        local $/;
        <$f>;
    };

    if( $_[0] =~ /\.jsonz?$/ ) {
        $contents = JSON::from_json( $contents );
    }

    return $contents;
}

1;
