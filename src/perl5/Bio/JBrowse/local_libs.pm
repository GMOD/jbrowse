=head1 NAME

Bio::JBrowse::local_libs - when included, sets JBrowse Perl module paths

=cut

package Bio::JBrowse::local_libs;

#find the jbrowse root dir
use File::Basename 'dirname';
use File::Spec::Functions qw( catfile catdir updir );
my $dir = catdir( dirname($INC{'Bio/JBrowse/local_libs.pm'}), updir(), updir() ) or die;
my $extlib;
for my $d ( $dir, catdir( $dir, updir() ), catdir( $dir, updir(), updir() )) {
    $extlib = catfile( $d, 'extlib' );
    last if -e $extlib;
}

require lib;

if( -e $extlib ) {
    lib->import( 'extlib/lib/perl5' );
    require local::lib;
    local::lib->import( $extlib );
}

# add all plugin dirs to the lib path also
for my $pluginLib ( glob 'plugins/*/perl5' ) {
    lib->import( $pluginLib );
}

1;
