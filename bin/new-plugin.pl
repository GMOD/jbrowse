#!/usr/bin/env perl

=head1 NAME

new-plugin.pl - Make the file and directory skeleton of a new JBrowse plugin.

=head1 USAGE

    bin/new-plugin.pl MyNewPlugin

=cut

use strict;
use warnings;
use File::Spec::Functions;
use File::Path 2 qw( make_path );
use Pod::Usage;
use Getopt::Long;

my $help;
GetOptions( "help|h|?" => \$help );
pod2usage( -verbose => 2 ) if $help;

@ARGV or die "Must provide a plugin name.\n";

my ( $plugin_name ) = @ARGV;
my $plugin_dir = catdir( 'plugins', $plugin_name );

-e $plugin_dir and die "Something already exists at $plugin_dir, aborting.\n";

for ( qw( js img css ) ) {
    my $dir = catdir( $plugin_dir, $_ );
    make_path( $dir,  { verbose => 1 });
    -d $dir or die "Could not create directory $dir.\n";
}

# make a skeleton main.js
{
    my $main_js = catfile( $plugin_dir, 'js', 'main.js' );
    open my $main, '>', $main_js or die "$! writing $main_js\n";
    print $main <<EOF;
define([
           'dojo/_base/declare',
           'JBrowse/Plugin'
       ],
       function(
           declare,
           JBrowsePlugin
       ) {
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        var browser = args.browser;

        // do anything you need to initialize your plugin here
        console.log( "$plugin_name plugin starting" );

    }
});
});
EOF
print STDERR "wrote $main_js\n";
}

{ # put a blank main.css in
    my $main_css = catfile( $plugin_dir, 'css', 'main.css' );
    open my $f, '>', $main_css or die "$! writing $main_css\n";
    print STDERR "wrote $main_css\n";
}


