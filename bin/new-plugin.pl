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

# make a dojo build profile
{
    my $profile_js = catfile( $plugin_dir, 'js', $plugin_name.'.profile.js' );
    open my $profile, '>', $profile_js or die "$! writing $profile_js\n";
    print $profile <<EOF;
function copyOnly(mid) {
    return mid in {
        // There are no modules right now that are copy-only. If you have some, though, just add
        // them here like this:
        // 'app/module': 1
    };
}

var profile = {
    action: 'release',
    cssOptimize: 'comments',
    mini: true,

    basePath: '../../../src',
    packages: [
        {name: '$plugin_name', location: '../plugins/$plugin_name/js' }
    ],

    layerOptimize: 'closure',
    stripConsole: 'normal',
    selectorEngine: 'acme',

    layers: {
        '$plugin_name/main': {
            include: [
                '$plugin_name',
            ],
            exclude: [ 'JBrowse' ]
        }
    },

    staticHasFeatures: {
        'dojo-trace-api':0,
        'dojo-log-api':0,
        'dojo-publish-privates':0,
        'dojo-sync-loader':0,
        'dojo-xhr-factory':0,
        'dojo-test-sniff':0
    },

    resourceTags: {
        // Files that contain test code.
        test: function (filename, mid) {
            return false;
        },

        // Files that should be copied as-is without being modified by the build system.
        copyOnly: function (filename, mid) {
            return copyOnly(mid);
        },

        // Files that are AMD modules.
        amd: function (filename, mid) {
            return !copyOnly(mid) && /\.js\$/.test(filename);
        },

        // Files that should not be copied when the “mini” compiler flag is set to true.
        miniExclude: function (filename, mid) {
            return ! ( /^$plugin_name/.test(mid) );
        }
    }
};
EOF
print STDERR "wrote $profile_js\n";

}

{ # put a blank main.css in
    my $main_css = catfile( $plugin_dir, 'css', 'main.css' );
    open my $f, '>', $main_css or die "$! writing $main_css\n";
    print STDERR "wrote $main_css\n";
}


