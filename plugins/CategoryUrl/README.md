# CategoryURL - JBrowse plugin

Add URL parameter "cat" to specify a category of tracks to display. All tracks
with the given category will be displayed. If any "tracks" are specified in the
URL, "cat" tracks will be appended to list.

Usage: Add `&cat=myCategory` to the URL Result: all tracts with category
"myCategory" will be displayed. Sub-categories are supported as well (i.e.
`&cat=myCategory/mySubCategory`)

The cat= URL parameter allows the display of tracks with the given category
defined in the track metadata that are used to group tracks in the hierarchical
track selector. For example:

    "category" : "Miscellaneous",

Example:

    http://<jbrowse>/?data=sample_data/json/volvox&cat=Miscellaneous

    http://<jbrowse>/?data=sample_data/json/volvox&cat=Quantitative/Density

### Install / Activate:

For JBrowse 1.11.6+, copy the `CategoryUrl` directory to the `JBrowse` plugins
directory. Add this to appropriate `trackList.json` under the plugins section
(create section, if it doesn't exist):

    "plugins": [
         'CategoryUrl'
     ],
