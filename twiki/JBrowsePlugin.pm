# Plugin for TWiki Enterprise Collaboration Platform, http://TWiki.org/
#
# Copyright (C) 2000-2003 Andrea Sterbini, a.sterbini@flashnet.it
# Copyright (C) 2001-2006 Peter Thoeny, peter@thoeny.org
# and TWiki Contributors. All Rights Reserved. TWiki Contributors
# are listed in the AUTHORS file in the root of this distribution.
# NOTE: Please extend that file, not this notice.
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version. For
# more details read LICENSE in the root of this distribution.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
#
# For licensing info read LICENSE file in the TWiki root.

=pod

---+ package JBrowsePlugin

(based on EmptyPlugin)

JBrowse genome browser plugin.

__NOTE:__ To interact with TWiki use ONLY the official API functions
in the TWiki::Func module. Do not reference any functions or
variables elsewhere in TWiki, as these are subject to change
without prior warning, and your plugin may suddenly stop
working.

For increased performance, all handlers except initPlugin are
disabled below. *To enable a handler* remove the leading DISABLE_ from
the function name. For efficiency and clarity, you should comment out or
delete the whole of handlers you don't use before you release your
plugin.

__NOTE:__ When developing a plugin it is important to remember that
TWiki is tolerant of plugins that do not compile. In this case,
the failure will be silent but the plugin will not be available.
See %TWIKIWEB%.TWikiPlugins#FAILEDPLUGINS for error messages.

__NOTE:__ Defining deprecated handlers will cause the handlers to be 
listed in %TWIKIWEB%.TWikiPlugins#FAILEDPLUGINS. See
%TWIKIWEB%.TWikiPlugins#Handlig_deprecated_functions
for information on regarding deprecated handlers that are defined for
compatibility with older TWiki versions.

__NOTE:__ When writing handlers, keep in mind that these may be invoked
on included topics. For example, if a plugin generates links to the current
topic, these need to be generated before the afterCommonTagsHandler is run,
as at that point in the rendering loop we have lost the information that we
the text had been included from another topic.

=cut

# change the package name and $pluginName!!!
package TWiki::Plugins::JBrowsePlugin;

# Always use strict to enforce variable scoping
use strict;

require TWiki::Func;    # The plugins API
require TWiki::Plugins; # For the API version

# $VERSION is referred to by TWiki, and is the only global variable that
# *must* exist in this package.
use vars qw( $VERSION $RELEASE $SHORTDESCRIPTION $debug $pluginName $NO_PREFS_IN_TOPIC );

# For the "last build..." string, we want nicely-formatted times
use POSIX qw(strftime);

# This should always be $Rev: 15942 (22 Jan 2008) $ so that TWiki can determine the checked-in
# status of the plugin. It is used by the build automation tools, so
# you should leave it alone.
$VERSION = '$Rev: 15942 (22 Jan 2008) $';

# This is a free-form string you can use to "name" your own plugin version.
# It is *not* used by the build automation tools, but is reported as part
# of the version number in PLUGINDESCRIPTIONS.
$RELEASE = 'TWiki-4.2';

# Short description of this plugin
# One line description, is shown in the %TWIKIWEB%.TextFormattingRules topic:
$SHORTDESCRIPTION = 'JBrowse genome browser plugin';

# You must set $NO_PREFS_IN_TOPIC to 0 if you want your plugin to use preferences
# stored in the plugin topic. This default is required for compatibility with
# older plugins, but imposes a significant performance penalty, and
# is not recommended. Instead, use $TWiki::cfg entries set in LocalSite.cfg, or
# if you want the users to be able to change settings, then use standard TWiki
# preferences that can be defined in your Main.TWikiPreferences and overridden
# at the web and topic level.
$NO_PREFS_IN_TOPIC = 0;

# Name of this Plugin, only used in this module
$pluginName = 'JBrowsePlugin';

# Variables specific to this plugin
my $MakefilePath = '/TWiki/Plugins/JBrowsePlugin/Makefile.jbrowse';
my $MakefileOutput = 'make.out';
my $DiagnosticOutput = 'diagnostics.html';
my $MakefileDepRegexp = '^config\.js|.*\.(gff|gff3|fa|fasta|wig|bed)$';

=pod

---++ initPlugin($topic, $web, $user, $installWeb) -> $boolean
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$user= - the login name of the user
   * =$installWeb= - the name of the web the plugin is installed in

REQUIRED

Called to initialise the plugin. If everything is OK, should return
a non-zero value. On non-fatal failure, should write a message
using TWiki::Func::writeWarning and return 0. In this case
%FAILEDPLUGINS% will indicate which plugins failed.

In the case of a catastrophic failure that will prevent the whole
installation from working safely, this handler may use 'die', which
will be trapped and reported in the browser.

You may also call =TWiki::Func::registerTagHandler= here to register
a function to handle variables that have standard TWiki syntax - for example,
=%MYTAG{"my param" myarg="My Arg"}%. You can also override internal
TWiki variable handling functions this way, though this practice is unsupported
and highly dangerous!

__Note:__ Please align variables names with the Plugin name, e.g. if 
your Plugin is called FooBarPlugin, name variables FOOBAR and/or 
FOOBARSOMETHING. This avoids namespace issues.


=cut

sub initPlugin {
    my( $topic, $web, $user, $installWeb ) = @_;

    # check for Plugins.pm versions
    if( $TWiki::Plugins::VERSION < 1.026 ) {
        TWiki::Func::writeWarning( "Version mismatch between $pluginName and Plugins.pm" );
        return 0;
    }

    # Example code of how to get a preference value, register a variable handler
    # and register a RESTHandler. (remove code you do not need)

    # Set plugin preferences in LocalSite.cfg, like this:
    # $TWiki::cfg{Plugins}{JBrowsePlugin}{ExampleSetting} = 1;
    # Always provide a default in case the setting is not defined in
    # LocalSite.cfg. See TWiki.TWikiPlugins for help in adding your plugin
    # configuration to the =configure= interface.
#    my $setting = $TWiki::cfg{Plugins}{JBrowsePlugin}{ExampleSetting} || 0;
    $debug = $TWiki::cfg{Plugins}{JBrowsePlugin}{Debug} || 0;

    # register the _JBROWSE function to handle %JBROWSE{...}%
    # This will be called whenever %JBROWSE% or %JBROWSE{...}% is
    # seen in the topic text.
    TWiki::Func::registerTagHandler( 'JBROWSE', \&_JBROWSE );

    # Allow a sub to be called from the REST interface 
    # using the provided alias
#    TWiki::Func::registerRESTHandler('example', \&restExample);

    # Plugin correctly initialized
    return 1;
}

# The function used to handle the %EXAMPLETAG{...}% variable
# You would have one of these for each variable you want to process.
sub _EXAMPLETAG {
    my($session, $params, $theTopic, $theWeb) = @_;
    # $session  - a reference to the TWiki session object (if you don't know
    #             what this is, just ignore it)
    # $params=  - a reference to a TWiki::Attrs object containing parameters.
    #             This can be used as a simple hash that maps parameter names
    #             to values, with _DEFAULT being the name for the default
    #             parameter.
    # $theTopic - name of the topic in the query
    # $theWeb   - name of the web in the query
    # Return: the result of processing the variable

    # For example, %EXAMPLETAG{'hamburger' sideorder="onions"}%
    # $params->{_DEFAULT} will be 'hamburger'
    # $params->{sideorder} will be 'onions'
}

=pod

---++ earlyInitPlugin()

This handler is called before any other handler, and before it has been
determined if the plugin is enabled or not. Use it with great care!

If it returns a non-null error string, the plugin will be disabled.

=cut

sub DISABLE_earlyInitPlugin {
    return undef;
}

=pod

---++ initializeUserHandler( $loginName, $url, $pathInfo )
   * =$loginName= - login name recovered from $ENV{REMOTE_USER}
   * =$url= - request url
   * =$pathInfo= - pathinfo from the CGI query
Allows a plugin to set the username. Normally TWiki gets the username
from the login manager. This handler gives you a chance to override the
login manager.

Return the *login* name.

This handler is called very early, immediately after =earlyInitPlugin=.

*Since:* TWiki::Plugins::VERSION = '1.010'

=cut

sub DISABLE_initializeUserHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $loginName, $url, $pathInfo ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::initializeUserHandler( $_[0], $_[1] )" ) if $debug;
}

=pod

---++ registrationHandler($web, $wikiName, $loginName )
   * =$web= - the name of the web in the current CGI query
   * =$wikiName= - users wiki name
   * =$loginName= - users login name

Called when a new user registers with this TWiki.

*Since:* TWiki::Plugins::VERSION = '1.010'

=cut

sub DISABLE_registrationHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $web, $wikiName, $loginName ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::registrationHandler( $_[0], $_[1] )" ) if $debug;
}

=pod

---++ commonTagsHandler($text, $topic, $web, $included, $meta )
   * =$text= - text to be processed
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$included= - Boolean flag indicating whether the handler is invoked on an included topic
   * =$meta= - meta-data object for the topic MAY BE =undef=
This handler is called by the code that expands %<nop>TAGS% syntax in
the topic body and in form fields. It may be called many times while
a topic is being rendered.

For variables with trivial syntax it is far more efficient to use
=TWiki::Func::registerTagHandler= (see =initPlugin=).

Plugins that have to parse the entire topic content should implement
this function. Internal TWiki
variables (and any variables declared using =TWiki::Func::registerTagHandler=)
are expanded _before_, and then again _after_, this function is called
to ensure all %<nop>TAGS% are expanded.

__NOTE:__ when this handler is called, &lt;verbatim> blocks have been
removed from the text (though all other blocks such as &lt;pre> and
&lt;noautolink> are still present).

__NOTE:__ meta-data is _not_ embedded in the text passed to this
handler. Use the =$meta= object.

*Since:* $TWiki::Plugins::VERSION 1.000

=cut

sub DISABLE_commonTagsHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $text, $topic, $web, $meta ) = @_;

  return unless
    $_[0] =~ m/%(JBROWSE)({.*?})?%/;

  $_[0] =~ s/\%JBROWSE%/_JBROWSE("",@_[1,2])/eg;
  $_[0] =~ s/\%JBROWSE{(.*)}%/_JBROWSE($1,@_[1,2])/eg;

#    TWiki::Func::writeDebug( "- ${pluginName}::commonTagsHandler( $_[2].$_[1] )" ) if $debug;
}

# expand a %JBROWSE{...}% tag
sub _JBROWSE {
  my($session, $attrs, $topic, $web) = @_;

  my $jbTopic = $attrs->remove( 'topic' )
      || $topic;

  my $navigateTo = $session->{'cgiQuery'}->param( 'loc' )
      || $attrs->remove( 'navigateTo' )
      || TWiki::Func::getPreferencesValue ('${pluginName}_NAVIGATE', $web);

  my $showTracks = $session->{'cgiQuery'}->param( 'tracks' )
      || $attrs->remove( 'showTracks' )
      || TWiki::Func::getPreferencesValue ('${pluginName}_SHOW', $web);

  if (defined $showTracks) {
      $showTracks =~ s/ *, */,/g;  # strip whitespace around commas
      $showTracks =~ s/ /_/g;  # remaining whitespace gets turned into underscores in the label field
  }

  my $jbRoot = TWiki::Func::getPreferencesValue ("${pluginName}_ROOT", $web)
      || '/jbrowse';

  my $jbDataRoot = join '/', TWiki::Func::getPubUrlPath(), $web, $jbTopic;
  my $jbDataPath = join '/', TWiki::Func::getPubDir(), $web, $jbTopic;

  my @makeLinks;
  if (-e "$jbDataPath/$MakefileOutput") {
      my @mstat = stat("$jbDataPath/$MakefileOutput");
      my $mtime = $mstat[9];
      my $mtime_string = strftime ("%a %b %e %H:%M:%S %Y", localtime($mtime));
      push @makeLinks, "last JBrowse build $mtime_string", "<a href=\"$jbDataRoot/$MakefileOutput\" onClick=\"return jbrowseTWikiPopup(this, 'Makefile transcript')\">transcript</a>";
  }
  if (-e "$jbDataPath/$DiagnosticOutput") {
      push @makeLinks, "<a href=\"$jbDataRoot/$DiagnosticOutput\" onClick=\"return jbrowseTWikiPopup(this, 'Diagnostic information')\">diagnostic information</a>";
  }

  my $makeLink = "";
  if (@makeLinks) {
      $makeLink = <<JBCODE;
<script type="text/javascript">
<!--
function jbrowseTWikiPopup(mylink, windowname)
{
if (! window.focus)return true;
var href;
if (typeof(mylink) == 'string')
   href=mylink;
else
   href=mylink.href;
window.open(href, windowname, 'width=400,height=200,scrollbars=yes,resizable=yes');
return false;
}
//-->
</script>
JBCODE
      $makeLink .= "<small> (" . join ("; ", @makeLinks) . ") </small>";
  }

  my $editUrl = "$TWiki::cfg{ScriptUrlPath}/edit/$web/$jbTopic";
  my $viewUrl = "$TWiki::cfg{ScriptUrlPath}/view/$web/$topic";
  my $bookmarkOrigin = "Bookmarked%20from%20";
  $bookmarkOrigin .= "$jbTopic%20via%20" if $jbTopic ne $topic;
  $bookmarkOrigin .= $topic;

  my $jbCode = <<JBCODE;
    <link rel="stylesheet" type="text/css" href="$jbRoot/jslib/dijit/themes/tundra/tundra.css"></link>
    <link rel="stylesheet" type="text/css" href="$jbRoot/jslib/dojo/resources/dojo.css"></link>
    <link rel="stylesheet" type="text/css" href="$jbRoot/genome.css"></link>
    <style type="text/css">
      html, body { height: 100%; width: 100%; padding: 0; border: 0; }
    </style>

    <script type="text/javascript" src="$jbRoot/jslib/dojo/dojo.js" djConfig="isDebug: true"></script>
    <script type="text/javascript" src="$jbRoot/jslib/dojo/jbrowse_dojo.js" ></script>

    <script type="text/javascript" src="$jbRoot/js/Browser.js"></script>
    <script type="text/javascript" src="$jbRoot/js/Util.js"></script>
    <script type="text/javascript" src="$jbRoot/js/NCList.js"></script>
    <script type="text/javascript" src="$jbRoot/js/LazyPatricia.js"></script>
    <script type="text/javascript" src="$jbRoot/js/Track.js"></script>
    <script type="text/javascript" src="$jbRoot/js/SequenceTrack.js"></script>
    <script type="text/javascript" src="$jbRoot/js/FeatureTrack.js"></script>
    <script type="text/javascript" src="$jbRoot/js/StaticTrack.js"></script>
    <script type="text/javascript" src="$jbRoot/js/ImageTrack.js"></script>
    <script type="text/javascript" src="$jbRoot/js/GenomeView.js"></script>

    <script type="text/javascript" src="$jbDataRoot/data/refSeqs.js"></script>
    <script type="text/javascript" src="$jbDataRoot/data/trackInfo.js"></script>

    $makeLink
    <script type="text/javascript">
    /* <![CDATA[ */
           var b = new Browser({
                                   containerID: "GenomeBrowser",
                                   refSeqs: refSeqs,
                                   trackData: trackInfo,
                                   dataRoot: "$jbDataRoot/",
                                   browserRoot: "$jbRoot/"
                               });

		 function makeBookmarkLink() {
		     jbrowseTrackList = b.visibleTracks();
		     jbrowseLocation = b.visibleRegion();
		     bookmarkURL = '$viewUrl?tracks=' + escape(jbrowseTrackList) + '&loc=' + escape(jbrowseLocation);
		     window.open(bookmarkURL);
		 }

		 function makeBookmarkPage() {
		     bookmarkDate = new Date();
		     bookmarkTime = bookmarkDate.getTime();
		     jbrowseTrackList = b.visibleTracks();
		     jbrowseLocation = b.visibleRegion();
		     bookmarkURL = '$editUrl' + bookmarkTime + '?&text=($bookmarkOrigin)%0D%0D%25JBROWSE%7Btopic=%22$jbTopic%22%20showTracks=%22' + jbrowseTrackList + '%22%20navigateTo=%22' + jbrowseLocation + '%22%7D%25&topicparent=$topic';
		     window.open(bookmarkURL);
		 }

JBCODE

		 $jbCode .= "           b.showTracks(\"$showTracks\");\n" if defined $showTracks;
		 $jbCode .= "           b.navigateTo(\"$navigateTo\");\n" if defined $navigateTo;

    $jbCode .= <<JBCODE;
    /* ]]> */
    </script>

    <div id="GenomeBrowser" style="height: 40em; width: 100%; padding: 0; border: 0;"></div>

    <p />
    <a href="javascript:makeBookmarkLink()">Permalink</a> /  <a href="javascript:makeBookmarkPage()">page</a> for this location

JBCODE

  return $jbCode;
}

=pod

---++ beforeCommonTagsHandler($text, $topic, $web, $meta )
   * =$text= - text to be processed
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$meta= - meta-data object for the topic MAY BE =undef=
This handler is called before TWiki does any expansion of it's own
internal variables. It is designed for use by cache plugins. Note that
when this handler is called, &lt;verbatim> blocks are still present
in the text.

__NOTE__: This handler is called once for each call to
=commonTagsHandler= i.e. it may be called many times during the
rendering of a topic.

__NOTE:__ meta-data is _not_ embedded in the text passed to this
handler.

__NOTE:__ This handler is not separately called on included topics.

=cut

sub DISABLE_beforeCommonTagsHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $text, $topic, $web, $meta ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::beforeCommonTagsHandler( $_[2].$_[1] )" ) if $debug;
}

=pod

---++ afterCommonTagsHandler($text, $topic, $web, $meta )
   * =$text= - text to be processed
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$meta= - meta-data object for the topic MAY BE =undef=
This handler is after TWiki has completed expansion of %TAGS%.
It is designed for use by cache plugins. Note that when this handler
is called, &lt;verbatim> blocks are present in the text.

__NOTE__: This handler is called once for each call to
=commonTagsHandler= i.e. it may be called many times during the
rendering of a topic.

__NOTE:__ meta-data is _not_ embedded in the text passed to this
handler.

=cut

sub DISABLE_afterCommonTagsHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $text, $topic, $web, $meta ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::afterCommonTagsHandler( $_[2].$_[1] )" ) if $debug;
}

=pod

---++ preRenderingHandler( $text, \%map )
   * =$text= - text, with the head, verbatim and pre blocks replaced with placeholders
   * =\%removed= - reference to a hash that maps the placeholders to the removed blocks.

Handler called immediately before TWiki syntax structures (such as lists) are
processed, but after all variables have been expanded. Use this handler to 
process special syntax only recognised by your plugin.

Placeholders are text strings constructed using the tag name and a 
sequence number e.g. 'pre1', "verbatim6", "head1" etc. Placeholders are 
inserted into the text inside &lt;!--!marker!--&gt; characters so the 
text will contain &lt;!--!pre1!--&gt; for placeholder pre1.

Each removed block is represented by the block text and the parameters 
passed to the tag (usually empty) e.g. for
<verbatim>
<pre class='slobadob'>
XYZ
</pre>
the map will contain:
<pre>
$removed->{'pre1'}{text}:   XYZ
$removed->{'pre1'}{params}: class="slobadob"
</pre>
Iterating over blocks for a single tag is easy. For example, to prepend a 
line number to every line of every pre block you might use this code:
<verbatim>
foreach my $placeholder ( keys %$map ) {
    if( $placeholder =~ /^pre/i ) {
       my $n = 1;
       $map->{$placeholder}{text} =~ s/^/$n++/gem;
    }
}
</verbatim>

__NOTE__: This handler is called once for each rendered block of text i.e. 
it may be called several times during the rendering of a topic.

__NOTE:__ meta-data is _not_ embedded in the text passed to this
handler.

Since TWiki::Plugins::VERSION = '1.026'

=cut

sub DISABLE_preRenderingHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    #my( $text, $pMap ) = @_;
}

=pod

---++ postRenderingHandler( $text )
   * =$text= - the text that has just been rendered. May be modified in place.

__NOTE__: This handler is called once for each rendered block of text i.e. 
it may be called several times during the rendering of a topic.

__NOTE:__ meta-data is _not_ embedded in the text passed to this
handler.

Since TWiki::Plugins::VERSION = '1.026'

=cut

sub DISABLE_postRenderingHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    #my $text = shift;
}

=pod

---++ beforeEditHandler($text, $topic, $web )
   * =$text= - text that will be edited
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
This handler is called by the edit script just before presenting the edit text
in the edit box. It is called once when the =edit= script is run.

__NOTE__: meta-data may be embedded in the text passed to this handler 
(using %META: tags)

*Since:* TWiki::Plugins::VERSION = '1.010'

=cut

sub DISABLE_beforeEditHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $text, $topic, $web ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::beforeEditHandler( $_[2].$_[1] )" ) if $debug;
}

=pod

---++ afterEditHandler($text, $topic, $web, $meta )
   * =$text= - text that is being previewed
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$meta= - meta-data for the topic.
This handler is called by the preview script just before presenting the text.
It is called once when the =preview= script is run.

__NOTE:__ this handler is _not_ called unless the text is previewed.

__NOTE:__ meta-data is _not_ embedded in the text passed to this
handler. Use the =$meta= object.

*Since:* $TWiki::Plugins::VERSION 1.010

=cut

sub DISABLE_afterEditHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $text, $topic, $web ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::afterEditHandler( $_[2].$_[1] )" ) if $debug;
}

=pod

---++ beforeSaveHandler($text, $topic, $web, $meta )
   * =$text= - text _with embedded meta-data tags_
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$meta= - the metadata of the topic being saved, represented by a TWiki::Meta object.

This handler is called each time a topic is saved.

__NOTE:__ meta-data is embedded in =$text= (using %META: tags). If you modify
the =$meta= object, then it will override any changes to the meta-data
embedded in the text. Modify *either* the META in the text *or* the =$meta=
object, never both. You are recommended to modify the =$meta= object rather
than the text, as this approach is proof against changes in the embedded
text format.

*Since:* TWiki::Plugins::VERSION = '1.010'

=cut

sub DISABLE_beforeSaveHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $text, $topic, $web ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::beforeSaveHandler( $_[2].$_[1] )" ) if $debug;
}

=pod

---++ afterSaveHandler($text, $topic, $web, $error, $meta )
   * =$text= - the text of the topic _excluding meta-data tags_
     (see beforeSaveHandler)
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$error= - any error string returned by the save.
   * =$meta= - the metadata of the saved topic, represented by a TWiki::Meta object 

This handler is called each time a topic is saved.

__NOTE:__ meta-data is embedded in $text (using %META: tags)

*Since:* TWiki::Plugins::VERSION 1.025

=cut

sub DISABLE_afterSaveHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $text, $topic, $web, $error, $meta ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::afterSaveHandler( $_[2].$_[1] )" ) if $debug;
}

# test whether a filename is "magic" (GFF, FASTA, Wiggle, config)
sub is_magic {
    return $_[0] =~ /$MakefileDepRegexp/;
}

=pod

---++ afterRenameHandler( $oldWeb, $oldTopic, $oldAttachment, $newWeb, $newTopic, $newAttachment )

   * =$oldWeb= - name of old web
   * =$oldTopic= - name of old topic (empty string if web rename)
   * =$oldAttachment= - name of old attachment (empty string if web or topic rename)
   * =$newWeb= - name of new web
   * =$newTopic= - name of new topic (empty string if web rename)
   * =$newAttachment= - name of new attachment (empty string if web or topic rename)

This handler is called just after the rename/move/delete action of a web, topic or attachment.

*Since:* TWiki::Plugins::VERSION = '1.11'

=cut

sub afterRenameHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ### my ( $oldWeb, $oldTopic, $oldAttachment, $newWeb, $newTopic, $newAttachment ) = @_;

    if (is_magic ($_[5])) {
	# die here? renaming is currently awkward (requires "make clean") -- maybe just prohibit it for now?
	_makeJBrowse ($_[0], $_[1], "jbrowse-clean jbrowse diagnostics");
	_makeJBrowse ($_[3], $_[4], "jbrowse diagnostics");
    }

    TWiki::Func::writeDebug( "- ${pluginName}::afterRenameHandler( " .
                             "$_[0].$_[1] $_[2] -> $_[3].$_[4] $_[5] )" ) if $debug;
}

=pod

---++ beforeAttachmentSaveHandler(\%attrHash, $topic, $web )
   * =\%attrHash= - reference to hash of attachment attribute values
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
This handler is called once when an attachment is uploaded. When this
handler is called, the attachment has *not* been recorded in the database.

The attributes hash will include at least the following attributes:
   * =attachment= => the attachment name
   * =comment= - the comment
   * =user= - the user id
   * =tmpFilename= - name of a temporary file containing the attachment data

*Since:* TWiki::Plugins::VERSION = 1.025

=cut

sub DISABLE_beforeAttachmentSaveHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    ###   my( $attrHashRef, $topic, $web ) = @_;

  # default debug message
  TWiki::Func::writeDebug( "- ${pluginName}::beforeAttachmentSaveHandler( $_[2].$_[1] )" ) if $debug;
}

=pod

---++ afterAttachmentSaveHandler(\%attrHash, $topic, $web, $error )
   * =\%attrHash= - reference to hash of attachment attribute values
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$error= - any error string generated during the save process
This handler is called just after the save action. The attributes hash
will include at least the following attributes:
   * =attachment= => the attachment name
   * =comment= - the comment
   * =user= - the user id

*Since:* TWiki::Plugins::VERSION = 1.025

=cut

sub afterAttachmentSaveHandler {
    my( $attrHashRef, $topic, $web ) = @_;

    # for more efficient make (w/fewer race conditions), could do "make processed/$attrHashRef->{attachment}" instead of "make jbrowse"
    # however, making everything is cleaner and probably more robust overall
    # (should ideally also run a cron job to do "make clean" every now and then)
    _makeJBrowse ($web, $topic, "jbrowse diagnostics");

    TWiki::Func::writeDebug( "- ${pluginName}::afterAttachmentSaveHandler( $_[2].$_[1] )" ) if $debug;

}

sub _makeJBrowse {
    my ($web, $topic, @makeArgs) = @_;

    my $pubDir =
	join '/', TWiki::Func::getPubDir(), $web, $topic;

    my $makefile = TWiki::getTWikiLibDir() . $MakefilePath;

    my $childPid = fork();
    if (defined $childPid) {
	if ($childPid > 0) {
	    # parent process; do nothing
	} else {
	    # child process; start a make job
	    # To override default JROOT, add something like this...
	    # push @makeArgs, "JROOT=" . $path_to_jbrowse;
	    exec "cd $pubDir; make -f $makefile @makeArgs >& $MakefileOutput";
	}
    }
}

=begin twiki

---++ beforeMergeHandler( $text, $currRev, $currText, $origRev, $origText, $web, $topic )
   * =$text= - the new text of the topic
   * =$currRev= - the number of the most recent rev of the topic in the store
   * =$currText= - the text of that rev
   * =$origRev= - the number of the rev that the edit started on (or undef
     if that revision was overwritten by a replace-revision save)
   * =$origText= - the text of that revision (or undef)
   * =$web= - the name of the web for the topic being saved
   * =$topic= - the name of the topic
This handler is called immediately before a merge of a topic that was edited
simultaneously by two users. It is called once on the topic text from
the =save= script. See =mergeHandler= for handling individual changes in the
topic text (and in forms).

=cut

sub DISABLE_beforeMergeHandler {
    # do not uncomment, use $_[0], $_[1]... instead
    #my( $text, $currRev, $currText, $origRev, $origText, $web, $topic ) = @_;
}

=pod

---++ mergeHandler( $diff, $old, $new, \%info ) -> $text
Try to resolve a difference encountered during merge. The =differences= 
array is an array of hash references, where each hash contains the 
following fields:
   * =$diff= => one of the characters '+', '-', 'c' or ' '.
      * '+' - =new= contains text inserted in the new version
      * '-' - =old= contains text deleted from the old version
      * 'c' - =old= contains text from the old version, and =new= text
        from the version being saved
      * ' ' - =new= contains text common to both versions, or the change
        only involved whitespace
   * =$old= => text from version currently saved
   * =$new= => text from version being saved
   * =\%info= is a reference to the form field description { name, title,
     type, size, value, tooltip, attributes, referenced }. It must _not_
     be wrtten to. This parameter will be undef when merging the body
     text of the topic.

Plugins should try to resolve differences and return the merged text. 
For example, a radio button field where we have 
={ diff=>'c', old=>'Leafy', new=>'Barky' }= might be resolved as 
='Treelike'=. If the plugin cannot resolve a difference it should return 
undef.

The merge handler will be called several times during a save; once for 
each difference that needs resolution.

If any merges are left unresolved after all plugins have been given a 
chance to intercede, the following algorithm is used to decide how to 
merge the data:
   1 =new= is taken for all =radio=, =checkbox= and =select= fields to 
     resolve 'c' conflicts
   1 '+' and '-' text is always included in the the body text and text
     fields
   1 =&lt;del>conflict&lt;/del> &lt;ins>markers&lt;/ins>= are used to 
     mark 'c' merges in text fields

The merge handler is called whenever a topic is saved, and a merge is 
required to resolve concurrent edits on a topic.

*Since:* TWiki::Plugins::VERSION = 1.1

=cut

sub DISABLE_mergeHandler {
}

=pod

---++ modifyHeaderHandler( \%headers, $query )
   * =\%headers= - reference to a hash of existing header values
   * =$query= - reference to CGI query object
Lets the plugin modify the HTTP headers that will be emitted when a
page is written to the browser. \%headers= will contain the headers
proposed by the core, plus any modifications made by other plugins that also
implement this method that come earlier in the plugins list.
<verbatim>
$headers->{expires} = '+1h';
</verbatim>

Note that this is the HTTP header which is _not_ the same as the HTML
&lt;HEAD&gt; tag. The contents of the &lt;HEAD&gt; tag may be manipulated
using the =TWiki::Func::addToHEAD= method.

*Since:* TWiki::Plugins::VERSION 1.1

=cut

sub DISABLE_modifyHeaderHandler {
    my ( $headers, $query ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::modifyHeaderHandler()" ) if $debug;
}

=pod

---++ redirectCgiQueryHandler($query, $url )
   * =$query= - the CGI query
   * =$url= - the URL to redirect to

This handler can be used to replace TWiki's internal redirect function.

If this handler is defined in more than one plugin, only the handler
in the earliest plugin in the INSTALLEDPLUGINS list will be called. All
the others will be ignored.

*Since:* TWiki::Plugins::VERSION 1.010

=cut

sub DISABLE_redirectCgiQueryHandler {
    # do not uncomment, use $_[0], $_[1] instead
    ### my ( $query, $url ) = @_;

    TWiki::Func::writeDebug( "- ${pluginName}::redirectCgiQueryHandler( query, $_[1] )" ) if $debug;
}

=pod

---++ renderFormFieldForEditHandler($name, $type, $size, $value, $attributes, $possibleValues) -> $html

This handler is called before built-in types are considered. It generates 
the HTML text rendering this form field, or false, if the rendering 
should be done by the built-in type handlers.
   * =$name= - name of form field
   * =$type= - type of form field (checkbox, radio etc)
   * =$size= - size of form field
   * =$value= - value held in the form field
   * =$attributes= - attributes of form field 
   * =$possibleValues= - the values defined as options for form field, if
     any. May be a scalar (one legal value) or a ref to an array
     (several legal values)


Return HTML text that renders this field. If false, form rendering
continues by considering the built-in types.

*Since:* TWiki::Plugins::VERSION 1.1

Note that since TWiki-4.2, you can also extend the range of available
types by providing a subclass of =TWiki::Form::FieldDefinition= to implement
the new type (see =TWiki::Plugins.JSCalendarContrib= and
=TWiki::Plugins.RatingContrib= for examples). This is the preferred way to
extend the form field types, but does not work for TWiki < 4.2.

=cut

sub DISABLE_renderFormFieldForEditHandler {
}

=pod

---++ renderWikiWordHandler($linkText, $hasExplicitLinkLabel, $web, $topic) -> $linkText
   * =$linkText= - the text for the link i.e. for =[<nop>[Link][blah blah]]=
     it's =blah blah=, for =BlahBlah= it's =BlahBlah=, and for [[Blah Blah]] it's =Blah Blah=.
   * =$hasExplicitLinkLabel= - true if the link is of the form =[<nop>[Link][blah blah]]= (false if it's ==<nop>[Blah]] or =BlahBlah=)
   * =$web=, =$topic= - specify the topic being rendered (only since TWiki 4.2)

Called during rendering, this handler allows the plugin a chance to change
the rendering of labels used for links.

Return the new link text.

*Since:* TWiki::Plugins::VERSION 1.1

=cut

sub DISABLE_renderWikiWordHandler {
    my( $linkText, $hasExplicitLinkLabel, $web, $topic ) = @_;
    return $linkText;
}

=pod

---++ completePageHandler($html, $httpHeaders)

This handler is called on the ingredients of every page that is
output by the standard TWiki scripts. It is designed primarily for use by
cache and security plugins.
   * =$html= - the body of the page (normally &lt;html>..$lt;/html>)
   * =$httpHeaders= - the HTTP headers. Note that the headers do not contain
     a =Content-length=. That will be computed and added immediately before
     the page is actually written. This is a string, which must end in \n\n.

*Since:* TWiki::Plugins::VERSION 1.2

=cut

sub DISABLE_completePageHandler {
    #my($html, $httpHeaders) = @_;
    # modify $_[0] or $_[1] if you must change the HTML or headers
}

=pod

---++ restExample($session) -> $text

This is an example of a sub to be called by the =rest= script. The parameter is:
   * =$session= - The TWiki object associated to this session.

Additional parameters can be recovered via de query object in the $session.

For more information, check TWiki:TWiki.TWikiScripts#rest

*Since:* TWiki::Plugins::VERSION 1.1

=cut

sub restExample {
   #my ($session) = @_;
   return "This is an example of a REST invocation\n\n";
}

1;
