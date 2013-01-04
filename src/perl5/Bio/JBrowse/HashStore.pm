=head1 NAME

Bio::JBrowse::HashStore - on-disk 2-level hash table

=head1 DESCRIPTION

Makes an on-disk hash table, designed to be easily read as static files over HTTP.

Makes a set of JSON-encoded files at paths based on a hash of the key.
For example:

  path/to/dir/29c/c14/fc
  path/to/dir/23f/5ad/11
  path/to/dir/711/7c1/29
  path/to/dir/5ec/b24/6a
  path/to/dir/4de/9ac/c6
  path/to/dir/41b/c43/27
  path/to/dir/28c/d86/e9

Where each file contains a JSON object containing data items like:

  { foo: "bar", ... }

Where "foo" is the original key, and "bar" is the JSON-encoded data.

=cut

package Bio::JBrowse::HashStore;
use strict;
use warnings;

use JSON 2;

use File::Spec ();
use File::Path ();

=head2 open( dir => "/path/to/dir" )

=cut

sub open {
    my $class = shift;

    my $self = bless { @_ }, $class;
    File::Path::mkpath( $self->{dir} );
    return $self;
}

=head2 get( $key )

=cut

sub get {
    my ( $self, $key ) = @_;
    my $bucket = $self->_readBucket( $self->_bucketPath( $key ) );
    return $bucket->{$key};
}

=head2 set( $key, $value )

=cut

sub set {
    my ( $self, $key, $value ) = @_;

    my ( $dir, $file ) = $self->_bucketPath( $key );
    my $fullpath = File::Spec->catdir( $dir, $file );

    my $bucket = $self->_readBucket( $fullpath );
    $bucket->{$key} = $value;

    File::Path::mkpath( $dir );
    CORE::open my $out, '>', $fullpath or die "$! writing $fullpath";
    $out->print( JSON::to_json( $bucket ) );

    return $value;
}

=head2 empty

Clear the store of all contents.  Deletes all files and directories
from the store directory.

=cut

sub empty {
    my ( $self ) = @_;
    File::Path::rmtree( $self->{dir} );
    File::Path::mkpath( $self->{dir} );
}

########## helper methods ###########

sub _bucketPath {
    my ( $self, $key ) = @_;
    my $crc = ( $self->{crc} ||= do { require Digest::Crc32; Digest::Crc32->new } )
                ->strcrc32( $key );
    my $hex = lc sprintf( '%08x', $crc );
    my @dir = ( $self->{dir}, $hex =~ /(.{1,3})/g );
    my $file = pop @dir;
    return ( File::Spec->catdir(@dir), $file );
}

sub _readBucket {
    my ( $self, @path ) = @_;
    my $path = @path > 1 ? File::Spec->catdir( @path ) : $path[0];

    -f $path or return {};

    local $/;
    CORE::open my $in, '<', $path or die "$! reading $path";
    return JSON::from_json( scalar <$in> );
}

1;
