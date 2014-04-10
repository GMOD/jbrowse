=head1 NAME

JBlibs - when included, sets JBrowse Perl module paths

=cut

package JBlibs;

use Carp::Heavy; #< work around some types of broken perl installations

#find the jbrowse root dir
use File::Basename 'dirname';
use File::Spec::Functions qw( catfile catdir updir );
my $dir = dirname($INC{'JBlibs.pm'}) or die;
my $extlib;
for my $d ( $dir, catdir( $dir, updir() ), catdir( $dir, updir(), updir() )) {
    $extlib = catfile( $d, 'extlib' );
    last if -e $extlib;
}

require lib;

if( -e $extlib ) {
    lib->import( "$extlib/lib/perl5" );
    require local::lib;
    local::lib->import( $extlib );
}

# add all plugin dirs to the lib path also
for my $pluginLib ( glob 'plugins/*/perl5' ) {
    lib->import( $pluginLib );
}

1;
