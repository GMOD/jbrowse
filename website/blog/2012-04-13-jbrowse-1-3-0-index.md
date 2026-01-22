---
layout: post
title: JBrowse 1.3.0, a major release!
date: 2012-04-13
tags: ['Software releases']
---

JBrowse version 1.3.0 has arrived!

We have a long list of improvements in this release, some of which have been a
long time coming. It's full speed ahead from here: more major new features are
just around the corner!

This release comes in two flavors: the "minimal" release
([JBrowse-1.3.0-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=9 'download JBrowse-1.3.0-min.zip') -
2.0M) that includes only the software and documentation necessary to format your
own data and run the browser, and the "full" release
([JBrowse-1.3.0-full.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=10 'download JBrowse-1.3.0-full.zip') -
4.7M) that includes the developers' test suite, more sample data files, and
developer documentation.

One important note about browser support: as of this 1.3.0 release, JBrowse no
longer supports Microsoft Internet Explorer 6.

And now, the **Big List of New Features!**

- Added support for** "rubberband" dynamic zooming**, in which users can click
  and drag to select a region to zoom to. Dragging on any scale bar, or
  shift-dragging on the main track pane, triggers a dynamic zoom.
- Correcting a long-standing oversight, wiggle data tracks and feature
  histograms now have **numerical y-axis scales** that show the numerical values
  of the data.
- Server-side data-formatting scripts now support a** --compress option** to
compress (gzip) feature and sequence data to **conserve server** ** disk
space**. Using this option requires some web server configuration. Under Apache,
AllowOverride FileInfo (or AllowOverride All) must be set for the JBrowse data
directories in order to use the included .htaccess files, and mod_headers and
mod_setenvif must be installed and enabled. Under nginx a configuration snippet
like the following should be included in the configuration:
<pre>      location ~* "\.(json'txt)z$" {
               add_header Content-Encoding  gzip;
               gzip off;
               types { application/json jsonz; }
      }</pre>

- flatfile-to-json.pl: now much **faster and more memory-efficient**, especially
  for GFF3 files. Remember that '###' directives are very important to have in
  large GFF3 files! Also removed nonfunctional --extraData switch.
- Added ability to **turn off some JBrowse UI panels via URL arguments** to the
  default index.html, or via arguments to the Browser constructor itself. Can
  dynamically turn off the navigation box, the overview panel, and the track
  list, respectively. When all of these are off, and if run in an iframe,
  JBrowse is running in an **"embedded mode"** that looks similar to the output
  of GBrowse's gbrowse_img script, with the exception that the view in this case
  is a fully functioning, scrollable and zoomable JBrowse. See the GMOD wiki
  (http://gmod.org/wiki/JBrowse) for more on how to set up embedded mode. Thanks
  to Julie Moon, a co-op student working at OICR, for this work!
- **Improved graphical look and feel**.
- Browser support for this release:
<table>
<tbody>
<tr>
<td>Google Chrome 18</td>
<td>perfect</td>
</tr>
<tr>
<td>Google Chrome 17</td>
<td>perfect</td>
</tr>
<tr>
<td>Mozilla Firefox 11.0</td>
<td>perfect</td>
</tr>
<tr>
<td>Mozilla Firefox 10.1</td>
<td>perfect</td>
</tr>
<tr>
<td>Mozilla Firefox 10.0.2</td>
<td>perfect</td>
</tr>
<tr>
<td>Mozilla Firefox 3.6.28</td>
<td>nonfunctional</td>
</tr>
<tr>
<td>Apple Safari 5.1.5 (Lion)</td>
<td>perfect</td>
</tr>
<tr>
<td>Microsoft Internet Explorer 9</td>
<td>good</td>
</tr>
<tr>
<td>Microsoft Internet Explorer 8</td>
<td>good</td>
</tr>
<tr>
<td>Microsoft Internet Explorer 7</td>
<td>minor problems</td>
</tr>
<tr>
<td>Microsoft Internet Explorer 6</td>
<td>not tested</td>
</tr>
<tr>
<td>KDE Konqueror 4.7.4</td>
<td>nonfunctional</td>
</tr>
<tr>
<td>KDE Konqueror 4.5.5</td>
<td>nonfunctional</td>
</tr>
<tr>
<td>Opera (all versions)</td>
<td>not tested</td>
</tr>
</tbody>
</table>

- Added an **automated-setup script, setup.sh**, that tries to install Perl
  prerequisites, format Volvox example data, and install Wiggle and BAM support
  (fetching samtools from SVN if necessary) automatically.
- Navigating to JBrowse with missing or malformed configuration or data will now
  bring up an error page with useful messages and links to help documentation,
  instead of a blank white page.
- JBrowse data directories now include an Apache .htaccess in their root
  directory that, if mod_headers is installed and AllowOverride FileInfo or
  AllowOverride All is enabled, will emit the proper **HTTP** ** headers to
  allow cross-origin XHR requests** for the data.
- A new "Help" link in the upper right, or pressing "?" on the keyboard, brings
  up a "JBrowse Help" dialog box with basic usage information and links to more
  help information.
- Arrowheads indicating strandedness are now drawn inside feature boundaries.
- Clicking on the overview bar or the main scale bar now centers the view at the
  clicked position. In addition, while holding down shift, clicking in the main
  track panel will also center the view at that position.
- Added bin/remove-track.pl,** a script to remove a track** from a JBrowse data
  directory. Run bin/remove-track.pl -? to see its documentation.
- Added build instrumentation to support a JSDoc-based system of **developer API
  documentation**. This documentation is still far from complete.
- Ian Davis contributed code to add a view of the **reverse strand of** ** the
  sequence in the DNA track**. Thanks Ian!
- Fixed bug in which, for some sequence chunk sizes, the DNA bases would display
  incorrectly.
- Added **minor gridlines** to the main track view.
- Fixed a long-standing off-by-one bug where the window could not be scrolled to
  view the last base in the reference sequence.
- Coordinates displayed in the **user interface are now 1-based closed** **
  coordinates**, which are more familiar to most users. Previously, the labels
  displayed interbase (i.e. 0-based half-open) coordinates.
- **NON-BACKWARDS-COMPATIBLE** improvements to the JSON format used for track
  configuration, feature data, and image data

* initial support for a new hook system for greater
  administrator-configurability of feature display
* support for more than one level of subfeatures

- Miscellaneous improvements and refactoring of data-formatting Perl code.
- **More detailed POD-based help documentation** on all scripts
- --tracklabel options to all scripts replaced with --trackLabel.
- New suite of **integration tests**, and some unit tests, for server-side Perl
  code.
- Beginnings of a suite of **Selenium-based integration tests** for the
  front-end JavaScript code.
- Support for Apple touch-based devices merged into normal index.html, so that
  the same link can be used regardless of the browsing platform.
- Bug fixed in which non-stranded features do not display properly (a problem
  with the CSS styles).
