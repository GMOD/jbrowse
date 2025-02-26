---
id: html_features
title: HTMLFeatures
---

HTMLFeatures tracks display features on the genome, including things with
parents and child features, using div elements. The flatfile-to-json.pl by
default outputs HTMLFeatures tracks (also called FeatureTrack in the config
file)

For more info on loading with flatfile-to-json.pl see the
[flatfile-to-json.pl](flatfile-to-json.pl.html) docs.

## HTMLFeatures Configuration Options

JBrowse HTMLFeatures tracks, the default legacy track type for range-based
features, have many available options for customization, not all of which are
available from the command-line formatting scripts. Below is a comprehensive
list of configuration options for HTMLFeatures tracks. HTMLFeatures tracks are
also referred to as trackType: "FeatureTrack" or "type": "FeatureTrack".

| Option                    | Value                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yScalePosition`          | Position of the y-axis scale indicator when the track is zoomed far enough out that density histograms are displayed. Can be "left", "right", or "center". Defaults to "center".                                                                                                                                                                                                                  |
| `maxFeatureScreenDensity` | Maximum density of features to display on the screen. If this is exceeded, will display either feature density histograms (if available), or a "too many features to show" message. The units of this number are features per screen width in pixels. Defaults to 0.5.                                                                                                                            |
| `description`             | Comma-separated list of fields in which to look for the description of a feature. Case-insensitive. If set to `false` or `null`, no feature description will be shown. Defaults to 'note, description'.                                                                                                                                                                                           |
| `maxDescriptionLength`    | Maximum length, in characters, for displayed feature descriptions.                                                                                                                                                                                                                                                                                                                                |
| `minSubfeatureWidth`      | Minimum width, in pixels, of the _top-level_ feature for JBrowse to attempt to display its subfeatures. Default 6.                                                                                                                                                                                                                                                                                |
| `menuTemplate`            | Optional menu configuration for right-click menus on features. Can be as large and complicated as you want. See [customizing right-click context menus](mouse_configs.html#customizing-right-click-context-menus). If set to null or false, disables feature right-click menus.                                                                                                                   |
| `hooks→create`            | JavaScript function that creates the parent feature HTML element and returns it. By default this is: `function(track,feature) { return document.createElement('div'); }`, which creates an HTML `div` element.                                                                                                                                                                                    |
| `hooks→modify`            | JavaScript function that can be used to modify the feature HTML element in any way desired. If set, the function is called with the track object, feature object, and feature HTML element as arguments (signature: `function(track, feature, featDiv)`).                                                                                                                                         |
| `style→featureScale`      | Minimum zoom scale (pixels/basepair) for displaying individual features in the track. Not set by default, and overrides the `maxFeatureScreenDensity`.                                                                                                                                                                                                                                            |
| `style→className`         | CSS class for parent features. Defaults to "feature".                                                                                                                                                                                                                                                                                                                                             |
| `style→subfeatureClasses` | Key-value pairs of CSS classes for subfeatures, organized by feature type. Example: { "CDS" : "transcript-CDS","UTR" : "transcript-UTR" }                                                                                                                                                                                                                                                         |
| `style→featureCss`        | Text string of additional CSS rules to add to features. Example: "border-color: purple; background-color: yellow;"                                                                                                                                                                                                                                                                                |
| `style→arrowheadClass`    | CSS class of the strand arrowheads to show for this feature. Defaults to 'arrowhead'. If set to `null`, no arrowhead will be drawn.                                                                                                                                                                                                                                                               |
| `style→histScale`         | Scale (pixels per basepair) below which the track will attempt to draw feature density histograms instead of features, if available. By default, this is set to 4 times the average feature density (features per basepair) of the track.                                                                                                                                                         |
| `style→label`             | Comma-separated list of case-insensitive feature tags to use for showing the feature's label. The first one found will be used. Default 'name,id'.                                                                                                                                                                                                                                                |
| `style→labelScale`        | Scale (pixels per basepair) above which feature labels (names) will be shown. By default, this is set to 30 times the average feature density (features per basepair) of the track.                                                                                                                                                                                                               |
| `style→descriptionScale`  | Scale (pixels per basepair) above which long feature descriptions will be shown. By default, this is set to 170 times the average feature density (features per basepair) of the track.                                                                                                                                                                                                           |
| `style→description`       | Comma-separated list of case-insensitive feature tags to check for the feature's long description. The first one found will be used. Default 'note,description'. If blank no description is used.                                                                                                                                                                                                 |
| `style→showLabels`        | If set to true, feature labels may be shown. Defaults to true. Set this to false to disable display of feature labels.                                                                                                                                                                                                                                                                            |
| `maxHeight`               | Maximum height, in pixels, that the track is allowed to grow to. When it reaches this height, features that stack higher than this will not be shown, and a "Max height reached" message will be displayed. Default 600 pixels.                                                                                                                                                                   |
| `showNoteInAttributes`    | If set to true, show the feature's "Note" attribute as a regular attribute in the feature detail dialog. This is mostly useful for projects that want the blue description text on a feature to be different from the feature's Notes attribute, but still display the Notes attribute in the detail dialog                                                                                       |
| `topLevelFeatures`        | Specifies which feature types should be considered "top-level" for this track. For example, if you have a track with gene-\>mRNA-\>CDS features, but for some reason want to only display the mRNA features, you can set topLevelFeatures=mRNA. Can also be an array of string types, or a function callback that returns an array of types. Default: all features are displayed. Added in 1.14.0 |
| `style->trackLabelCss`    | Add arbitrary CSS to the track label                                                                                                                                                                                                                                                                                                                                                              |
| `style->histCss`          | Add arbitrary CSS to the histogram. Used for HTMLFeatures histograms only                                                                                                                                                                                                                                                                                                                         |
| `style->featureCss`       | Add arbitrary CSS to the features. Used for HTMLFeatures features only                                                                                                                                                                                                                                                                                                                            |
| `unsafeHTMLFeatures`      | Allows rendering raw HTML in the feature labels and descriptions                                                                                                                                                                                                                                                                                                                                  |

  <link rel="stylesheet" type="text/css" href="assets/css/track_styles.css"></link>
<style>
    table {
      border: 1px solid #777;
      border-collapse: collapse;
      margin-bottom: 1em;
    }

    td { border: 1px solid #777; padding: 5px; }

    th { border: 1px solid #777; }

    div.ex {
      position: relative;
      width: 5em;
      margin-left: 1em;
      margin-right: 1em;
    }
    div.ex, div.ex * {
      display:-moz-inline-stack;/*Firefox need this to simulate display:inline-block*/
      display:inline-block; /*IE does not apply this to Block Element, and Firefox does not render this, too*/
      _overflow:hidden;/*fix IE6 to expanded content*/
      zoom:1;/*trigger hasLayout*/
      *display:inline;/*once hasLayout is true, set display:inline to block element will make display:inline behave like display:inline-block*/
    }

</style>

<p>Here are some of the feature classes built into JBrowse.  These are what you specify for the --cssclass option to gff-to-json.pl, or for the &quot;class&quot; value or &quot;subfeatureClasses&quot; map in the config file.  You can also easily add your own; look in the <a href="../genome.css">genome.css</a> file for examples.</p>

<h3>Feature classes</h3>

<p>Features with no subfeatures will be drawn as rectangles like
those below, depending on their <code>cssClass</code>
configuration.
</p>

<table>
  <tr><th><code>cssClass</code></th><th style="width: 8em">displayed</th></tr>
  <tr><td>feature  </td><td><div class="ex plus-feature"></div></td></tr>
  <tr><td>feature2 </td><td><div class="ex plus-feature2"></div></td></tr>
  <tr><td>feature3 </td><td><div class="ex plus-feature3"></div></td></tr>
  <tr><td>feature4 </td><td><div class="ex plus-feature4"></div></td></tr>
  <tr><td>feature5 </td><td><div class="ex plus-feature5"></div></td></tr>
  <tr><td>match_part</td><td><div class="ex plus-match_part"></div></td></tr>
  <tr><td>exon     </td><td><div class="ex plus-exon"></div></td></tr>
  <tr><td>est     </td><td><div class="ex plus-est"></div></td></tr>
  <tr><td>cds      </td><td><div class="ex minus-cds minus-cds_phase2"></div></td></tr>
  <tr><td>loops      </td><td><div class="ex minus-loops minus-loops"></div></td></tr>
  <tr><td>helix </td><td><div class="ex plus-helix"></div></td></tr>
  <tr><td>dblhelix </td><td><div class="ex plus-dblhelix"></div></td></tr>
  <tr><td>ibeam </td><td><div class="ex plus-ibeam"></div></td></tr>
  <tr><td>transcript-exon </td><td><div class="ex plus-transcript-exon"></div></td></tr>
  <tr><td>transcript-UTR </td><td><div class="ex plus-transcript-UTR"></div></td></tr>
  <tr><td>transcript-CDS </td><td><div class="ex plus-transcript-CDS"></div></td></tr>
  <tr><td>triangle hgred </td><td><div class="ex plus-triangle hgred" style="width: 0px;"></div></div></td></tr>
  <tr><td>triangle hgblue </td><td><div class="ex plus-triangle hgblue" style="width: 0px;"></div></td></tr>
  <tr><td>hourglass hgred </td><td><div class="ex plus-hourglass hgred" style="width: 0px;"></div></td></tr>
  <tr><td>hourglass hgblue </td><td><div class="ex plus-hourglass hgblue" style="width: 0px;"></div></td></tr>
  <tr><td>generic_parent</td><td><div class="ex plus-generic_parent"></div></td></tr>
  <tr><td>generic_part_a</td><td><div class="ex plus-generic_part_a"></div></td></tr>
</table>

<h3>Two-level Features</h3>

<p>To show features with subfeatures, JBrowse draws the elements for
the subfeatures on top of the element for the parent feature.  The
parent feature's class is set with <code>className</code> and the
classes for the subfeatures are set
with <code>subfeatureClasses</code>.
</p>

<table>
  <tr>
    <th>data</th>
    <th>config</th>
    <th style="width: 8em">displayed</th>
  </tr>
  <tr>
    <td>parent feature with two subfeatures of type 'exon'</td>
    <td><pre>
"style": {
"className": "transcript",
"arrowheadClass": "transcript-arrowhead",
"subfeatureClasses": {
  "exon": "transcript-exon"
}
}
      </pre></td>
  <td>
     <div class="ex minus-transcript">
       <div class="minus-transcript-arrowhead" style="position: absolute; left: 0px; top: 0px; z-index: 100; "></div>
       <div class="transcript-exon minus-transcript-exon" style="left: 0%; top: 0px; width: 53.71900826446281%; "></div>
       <div class="transcript-exon minus-transcript-exon" style="left: 76.03305785123968%; top: 0px; width: 23.96694214876033%; "></div>
     </div>
  </td></tr>

  <tr>
    <td>parent feature with two subfeatures of type 'CDS'</td>
    <td><pre>
"style": {
"className": "transcript",
"arrowheadClass": "transcript-arrowhead",
"subfeatureClasses": {
  "CDS": "transcript-CDS"
}
}
      </pre></td>
  <td>
     <div class="ex minus-transcript">
       <div class="minus-transcript-arrowhead" style="position: absolute; left: 0px; top: 0px; z-index: 100; "></div>
       <div class="transcript-CDS minus-transcript-CDS" style="left: 0%; top: 0px; width: 53.71900826446281%; "></div>
       <div class="transcript-CDS minus-transcript-CDS" style="left: 76.03305785123968%; top: 0px; width: 23.96694214876033%; "></div>
     </div>
  </td></tr>

  <tr>
    <td>parent feature with two subfeatures of type 'match_part'</td>
    <td><pre>
"style": {
"className": "generic_parent",
"arrowheadClass": "arrowhead",
"subfeatureClasses": {
  "match_part": "match_part"
}
}
      </pre></td>
  <td>
     <div class="ex minus-generic_parent">
       <div class="minus-arrowhead" style="position: absolute; left: 0px; top: 0px; z-index: 100; "></div>
       <div class="transcript-match_part minus-match_part" style="left: 0%; top: 0px; width: 53.71900826446281%; "></div>
       <div class="transcript-match_part minus-match_part" style="left: 76.03305785123968%; top: 0px; width: 23.96694214876033%; "></div>
     </div>
  </td></tr>

  <tr>
    <td>parent feature with two subfeatures of type 'match_part'</td>
    <td><pre>
"style": {
"className": "generic_parent",
"arrowheadClass": "arrowhead",
"subfeatureClasses": {
  "match_part": "generic_part_a"
}
}
      </pre></td>
  <td>
     <div class="ex minus-generic_parent">
       <div class="minus-arrowhead" style="position: absolute; left: 0px; top: 0px; z-index: 100; "></div>
       <div class="transcript-generic_part_a minus-generic_part_a" style="left: 0%; top: 0px; width: 53.71900826446281%; "></div>
       <div class="transcript-generic_part_a minus-generic_part_a" style="left: 76.03305785123968%; top: 0px; width: 23.96694214876033%; "></div>
     </div>
  </td></tr>
</table>

### Using callbacks to customize HTMLFeatures tracks

JBrowse HTMLFeature tracks, and individual JBrowse features, can be customized
using JavaScript functions you write yourself. These functions are called every
time a feature in a HTMLFeatures track is drawn, and allow you to customize
virtually anything about the feature's display. What's more, all of the
feature's data is accessible to your customization function, so you can even
customize individual features' looks based on their data.

As of JBrowse 1.3.0, feature callbacks are added by directly editing your
trackList.json file with a text editor. Due to the limitations of the JSON
format currently used for JBrowse configuration, the function must appear as a
quoted (and JSON-escaped) string, on a single line. You may use the .conf format
for the ability to specify functions that span multiple lines. See
[here](configuration_file_formats.html#including-external-files-and-functions-in-tracklistjson)
for details

Here is an example feature callback, in context in the trackList.json file, that
can change a feature's `background` CSS property (which controls the feature's
color) as a function of the feature's name. If the feature's name contains a
number that is odd, it give the feature's HTML `div` element a red background.
Otherwise, it gives it a blue background.

```
     {
         "style" : {
            "className" : "feature2"
         },
         "key" : "Example Features",
         "feature" : [
            "remark"
         ],
         "urlTemplate" : "tracks/ExampleFeatures/{refseq}/trackData.json",
         "hooks": {
             "modify": "function( track, f, fdiv ) { var nums = f.get('name').match(/\\d+/); if( nums && nums[0] % 2 ) { fdiv.style.background = 'red'; } else { fdiv.style.background = 'blue';  } }"
         },
         "compress" : 0,
         "label" : "ExampleFeatures",
         "type" : "FeatureTrack"
      },
```
