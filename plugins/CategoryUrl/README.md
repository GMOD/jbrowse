CategoryURL - JBrowse plugin

Add URL parameter "cat" to specify a category of tracks to display.
All tracks with the given category will be displayed.
If any "tracks" are specified in the URL, "cat" tracks will be appended to list.

Usage: Add &cat=abc
Result: all tracts with category "abc" will be displayed.

Example:
http://jbrowse.org/code/sandbox-113/?data=sample_data%2Fjson%2Fvolvox&cat=Miscellaneous

Install / Activate:

For JBrowse 1.11.6+, copy the CategoryUrl directory to the JBrowse 'plugins' directory.
Add this to appropriate trackList.json under the plugins section (create section, if it doesn't exist):

   "plugins": [ 
        'CategoryUrl'
    ],

