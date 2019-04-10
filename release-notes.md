# Release 1.16.4     2019-04-10 16:58:02 UTC

## Minor improvements

 * Added `indexedFeatures` tracklist attribute for GFF3Tabix track types
   which controls the feature types from a GFF3Tabix file that are
   indexed. Thanks to @loraine-gueguen for the idea and implementation!
   (pull #1337, @loraine-guegen)

 * Added `inferHTMLSubfeatures` which automatically creates multiple
   mRNA transcripts from a single gene parent feature. Thanks to
   @abretaud for the idea and implementation! Note that this is enabled
   by default now (pull #1343, pull #1340)

 * Updated jbrowse.org website to run entirely off amazon S3 (pull #1347,
   pull #1348)

## Bug fixes

 * Added better error reporting to GFF3Tabix tracks for if a parsing
   error occured. Thanks to @nathanhaigh for reporting (@cmdcolin)

 * Added fix for VCF that don't contain alternative alleles (@cmdcolin)

 * Added better error handling if there is a case where a tabix file is
   loaded that is on a genome longer than 2^29. CSI indexes are needed for
   this. Old versions of tabix which hadn't invented CSI would generate
   invalid tabix indexes in this case. Thanks to Hans Vasquez-Gross for
   reporting (@cmdcolin)

 * Fixed link in documentation. Thanks @agarciamontoro (pull #1341)

 * Fixed issue with ucsc-to-json.pl creating subfeatures with the wrong
   strand. Thanks to @sachalau for finding and fixing (pull #1346)

# Release 1.16.3     2019-02-21 00:48:52 UTC

## Bug fixes

 * Fix BioPerl setup after changes to the BioPerl distribution caused
   setup.sh to fail in all past JBrowse versions (issue #1310, @cmdcolin)

 * Fix issue with NeatCanvasFeatures not drawing gradients on some
   features. Thanks to @mara-sangiovanni for reporting (issue #1311,
   @cmdcolin)

 * Fix issue for exporting GFF3 for some nested attributes by dumping
   JSON into the value field. Thanks to @dionnezaal for reporting
   (issue #1309, @cmdcolin)

# Release 1.16.2     2019-02-01 03:31:36 UTC

## Minor improvements

 * Allow configuring the cache busting behavior for adding random ?v= value
   to config file requests. This can be configured in index.html. Thanks to
   user @sandilyaamit for reporting, this is actually important to disable
   when using Amazon presigned URLs (@cmdcolin)

 * Adds `fixBounds` config for XYPlot tracks which can be set to false to
   disable the behavior of rounding up or down on the min_score/max_score
   variables for the ruler. Thanks to @scottcain for the suggestion
   (pull #1306, @cmdcolin)

## Bug fixes

 * Fix ability to use CSI indexes with BAM files since 1.16.0 (@cmdcolin)

 * Fix ability to read some CRAM files with unmapped mates (@cmdcolin)

 * Fix issue with the browser loading NaN locations on startup (@cmdcolin)

 * Add fix for exporting GFF3 for newer browsers that have Array.values()
   enabled. Thanks to Scott Cain for reporting (@cmdcolin)

 * Improve error message when refSeqs=file.fai config fails to load
   (@cmdcolin)

# Release 1.16.1     2018-12-28 02:24:11 UTC

## Minor improvements

 * Made a change to make Hierarchical track selector much faster on intial
   browser load for very large tracklists (@cmdcolin)

 * Updated to webpack 4 for some faster build times (pull #1270, @cmdcolin)

 * Updated to use dojo/dijit/dojox 1.14 (@cmdcolin)

 * Updated NeatCanvasFeatures to allow non-coding transcripts to be colored
   differently with `style->unprocessedTranscriptColor`. Thanks to @billzt
   for the bug report (issue #1298, @cmdcolin)

## Bug fixes

 * Fixed issue where data directories with spaces in them were giving errors
   due to CORS on JBrowse Desktop (issue #1285, @cmdcolin)

 * Fixed issue where the name store could be queried before being initialized
   (issue #1286, @cmdcolin)

 * Fixed an issue for large BAM headers failing to load post-@gmod/bam
   integration (@cmdcolin)

 * Fixed access to some cross-origin resources (issue #1289, pull #1292,
   @cmdcolin)

# Release 1.16.0     2018-12-13 17:24:29 UTC

## Major improvements

 * Added ability to view paired read data as connected entities for BAM and
   CRAM store classes. There are multiple different viewing options for this
   including plotting by insert size, plotting as connected arcs, or pileup
   views for the paired reads. Additonally multiple color schemes are available
   for coloring by insert size, pair orientation, mapping quality, and more.
   Thanks to @garrettjstevens, @rbuels, @AndyMenzies, and @keiranmraine for
   testing. Also a big thanks to @jrobinso from @igvteam for contributions to
   CRAM code related to paired reads (pull #1235, @cmdcolin)

## Minor improvements

 * For users with the "dev" or compiling JBrowse from source code, the ./setup.sh
   now performs a full webpack production build (pull #1223, @cmdcolin)

 * Created new BAM parsing mechanism using the npm module [@gmod/bam](https://www.npmjs.com/package/@gmod/bam).
   Users might see some modest performance improvements due to enhanced tooling.
   Thanks to @rbuels and others for testing and feedback (pull #1215, issue #1178,
   @cmdcolin)

 * setup.sh now supports setting a `JBROWSE_PUBLIC_PATH` environment variable for
   more flexibility in iframeless embedding scenarios (issue #1213, @rbuels)

 * Added support for indexing arbitrary fields from GFF3Tabix files by setting
   nameAttributes in the track config e.g. nameAttributes=name,id,customfield.
   (issue #1115, pull #1222, @cmdcolin)

 * Add support for generate-names to index VCF features that have multiple IDs in
   the ID column (@cmdcolin)

 * Added documentation on embedding JBrowse in an iframe and in a div, including
   how to embed JBrowse using a custom JavaScript object as a configuration
   (pull #1228, pull #1243, @rbuels and @garrettjstevens)

 * Added ability to render non-coding transcript types to the default Gene glyph
   which helps when a gene feature has a mix of coding and non-coding subfeatures
   (issue #1106, pull #1230, @cmdcolin)

 * Created new VCF parsing mechanism using the NPM module
   [@gmod/vcf](https://www.npmjs.com/package/@gmod/vcf). Thanks to @cmdcolin and
   others for testing and feedback (pull #1227, issue #1199, @garrettjstevens)

 * Added ability to open "chrom.sizes" files from the Open sequence dialog
   (issue #1250, pull #1257, @cmdcolin)

 * Added a config `datasetLinkToParentIframe` to make the dataset selector use
   window.parent for when jbrowse is in an iframe (pull #1248, @enuggetry)

 * Improved error message that is displayed when a data file cannot be fetched
   via CORS (@rbuels)

 * Added some word wrapping for long unbroken fields in the View details
   popups. Thanks to @luke-c-sargent for the idea (issue #1246).

 * Added `hideImproperPairs` filter for Alignments2/SNPCoverage tracks which
   disambiguates from missing mate pairs (pull #1235, @cmdcolin)

 * Added `useTS` coloring option for RNA-seq strandedness, similar to the `useXS`
   that existed previously (pull #1235, @cmdcolin)

 * Added a --bgzip_fasta option for prepare-refseqs.pl and also the ability
   to index reference sequence names if they are manually specified as a
   fasta index e.g. `refSeqs=genome.fai`. Thanks to @FredericBGA for the report!
   (issue #1281, pull #1282, @cmdcolin).

## Bug fixes

 * Fixed issue where some generate-names setups would fail to index features.
   Thanks to @BioInfoSuite for reporting (issue #1275, pull #1283, @cmdcolin)

 * Fixed issue with getting feature density from BAM files via the index stats
   estimation (issue #1233, @cmdcolin)

 * Fixed issue where some feature mouseovers where not working properly (issue
   #1236, @cmdcolin)

 * Fixed issue where instantiating JBrowse via `standalone.js` didn't work when
   in a production build with JBROWSE_PUBLIC_PATH overridden (issue #1239,
   @garrettjstevens)

 * Small fix for issue where SNPCoverage would crash on some feature filters
   (issue #1241, @cmdcolin)

 * Fixed issue where JBrowse Desktop was not able to access remote files (issue
   #1234, pull #1245, @cmdcolin)

 * Fix issue where the Hierarchical track selector contained a bunch of blank
   whitespace. Thanks to @nathanhaigh for reporting! (issue #1240, pull #1253,
   @cmdcolin)

 * Fixed issue where whitespace surrounding GFF3 attributes and attribute names
   was incorporated (issue #1221, pull #1254, @cmdcolin)

 * Fixed issue with some GFF3Tabix tracks having some inconsistent layout of
   features (issue #1244, pull #1260, @cmdcolin)

 * Fixed CRAM store not renaming reference sequences in the same way as other
   stores (pull #1277, @rbuels, @cmdcolin)

 * Fixed bug where older browsers e.g. IE11 were not being properly supported via
   babel (issue #1259, pull #1267, @cmdcolin)

 * Fixed bug where some files were not being fetched properly when changing
   refseqs. Thanks to @luke-c-sargent for the report (issue #1252)

 * Fixed storeTimeout on CRAM files being unused which can result in excessive
   fetches (pull #1235, @cmdcolin)

 * Fixed issue where JBrowse would load the wrong area of the refseq on startup
   resulting in bad layouts and excessive data fetches. Thanks to @hkmoon,
   @cmdcolin, and @garrettjstevens for debugging (issue #1190, pull #1235, pull
   #1187)

 * Fixed issue where CRAM layout and mouseover would be glitchy due to ID
   collisions on features (issue #1271, @cmdcolin)

 * Fixed parsing of certain bigBed files that were hanging on track startup
   (issue #1226, pull #1229, @cmdcolin)

 * Fixed issue where some parts of a CRAM file would not be displayed in JBrowse
   due to a CRAM index parsing issue (@cmdcolin)

 * Fixed an issue where BAM features were not lazily evaluating their tags
   (@cmdcolin)

## Notable changes

 * Rendering of features in popups, mouseover tooltips, and feature labels were
   made to escape HTML. If you are using literal HTML labels in these places
   then set the attribute `unsafePopup`, `unsafeMouseover`, or `unsafeHTMLFeatures`
   on your tracks. Thanks to @garrettjstevens (pull #1263, @cmdcolin).

# Release 1.15.4     2018-10-05 13:02:55 UTC

## Minor improvements

 * Added support for bgzipped indexed FASTA. To use, bgzip your FASTA with
   `bgzip -i file.fa`, which generates file.fa.gz and file.fa.gzi and then use
   `samtools faidx file.fa.gz`. If you specify the .fa.gz in the track config e.g.
   `"urlTemplate": "file.fa.gz"` and have all three files in your data directory,
   then they will automatically be detected (issue #1152, pull #1200, @cmdcolin)

 * Allow fna and mfa file extensions for FASTA to be recognized by default in
   the Open sequence dialog (issue #1205, @cmdcolin)

 * Improve the layout slightly for dense features (issue #1210, @cmdcolin)

 * Added a `topLevelFeaturesPercent` configuration variable that can be used to
   correct feature statistics estimates when `topLevelFeatures` is being used for
   a track, or when it contains deeply-nested features. This configuration variable
   is currently only used by BAM, BEDTabix, GFF3Tabix, and VCFTabix stores.
   (issue #1147, pull #1209, @rbuels)

 * Tabix-based data stores use a new storage backend based on the `@gmod/tabix` npm
   module. Users should see some modest performance improvements for Tabix-based
   tracks. (issue #1195, pull #1209, @rbuels)

 * Added `hideSequenceBox` config to allow hiding the FASTA boxes in the View details
   popups. Thanks to @andreamini for reporting (issue #1211, pull #1219, @cmdcolin)

 * Added `categoryOrder` config to allow sorting the categories in the Hierarchical
   track selector. For example, `categoryOrder=VCF,Quantitative/Density,BAM`. Note
   that we specify a lowest level subcategory e.g. Quantitative/Density to sort the
   parent category Quantitative to a position (issue #1203, pull #1208, @cmdcolin)

## Bug fixes

 * Fixed a bug in which feature labels would sometimes be repeated across the view,
   in the wrong locations. (@rbuels)

 * Fixed error where a chunk size limit error during histogram display would not be
   displayed (@cmdcolin)

 * Fixed issue where Open sequence dialog will open up the default "data" directory
   instead of a blank instance (issue #1207, @cmdcolin)

 * Added check for PCR duplicates for CRAM features (@cmdcolin)

 * Fixed issue where editing the track names and types in the "Open track" dialog box
   was not working when editing multiple tracks (issue #1217, @cmdcolin)

 * Fixed issue in which large VCF headers were not always correctly parsed by JBrowse
   (issue #1139, pull #1209, @rbuels)

 * Fixed issue where the histogram Y-scale bar would appear over features (issue
   #1214, pull #1218, @cmdcolin)

# Release 1.15.3     2018-08-29 22:34:53 UTC

## Minor improvements

 * Add ability to automatically deduce the storeClass and trackType of files based on
   the file extension of urlTemplate. This allows very minimal configs where only
   track label and urlTemplate can be specified. (pull #1189, @cmdcolin)

## Bug fixes

 * Fixed an issue with servers that use HTTP Basic Authentication on certain browsers,
   notably some Chromium, Firefox 60 and earlier, and Safari. Thanks to Keiran Raine
   for reporting and @cmdcolin for debugging. (issue #1186, @rbuels)

 * Fix issue where searching for reference sequence names would not be navigate to the
   typed in reference sequence (issue #1193, @cmdcolin)

# Release 1.15.2     2018-08-16 21:02:27 UTC

## Minor improvements

 * Created "index stats estimation" which overrides the older "global stats estimation"
   that randomly samples genomic regions of BAM, VCF, etc to find feature density. This
   allows initial track load to be faster automatically. (issue #1092, pull #1167,
   @cmdcolin)

 * Removed the "full" or "dev" releases from the build. If you need a "dev" release, you
   can simply download the JBrowse "source code" link from the GitHub releases page, or
   use a git clone of the JBrowse repository. This will behave the same as the "dev"
   release. (issue #1160, pull #1170, @cmdcolin)

 * JBrowse now uses a new binary-file caching and fetching backend based on the
   [http-range-fetcher](https://www.npmjs.com/package/http-range-fetcher) and
   [tenacious-fetch](https://www.npmjs.com/package/tenacious-fetch) npm modules. Users
   may see slightly higher performance when viewing indexed binary formats such as BAM,
   CRAM, 2bit, etc. (issue #1155, issue #1175, pull #1165, @rbuels)

 * Updated the main jbrowse.org website to use the docusaurus platform. The main docs
   for the website are now moved from the GMOD.org server to jbrowse.org. You can find
   the latest documentation in the header bar. We hope you will enjoy this upgrade!
   There is also a new quick start guide based on setting up JBrowse with indexed file
   formats. (issue #1153, issue #1137, pull #1173, @cmdcolin)


## Bug fixes

 * Added a more robust HTML processing in Util.js. Thanks to @hkmoon for the idea and
   implementation. (pull #1169, @hkmoon)

 * Remove utils/jb_run.js from the minified release (issue #1161, issue #1160, @cmdcolin)

 * Fixes issue where navigating away from genome browser and returning would not remember
   the location. Thanks to Vaneet Lotay for reporting. (issue #1168, @cmdcolin)

 * Fixes off-by-one in the display of the size of the genomic region being viewed. Thanks
   to @sammyjava for the bug report! (issue #1176, @cmdcolin)

# Release 1.15.1     2018-08-01 23:59:52 UTC

## Minor Improvements

 * Add a internal code attribute for XHR requests that use byte-range headers so that if a
   server does not support it, an error is returned immediately. Thanks to @theChinster
   for the motivating example (issue #1131, issue #1132, pull #1134, @cmdcolin).

 * Speed up TwoBit file processing with a robust implementation of the file spec. The
   improvements are contained in a new npm module [@gmod/twobit](https://www.npmjs.com/package/@gmod/twobit).
   Thanks to @cmdcolin for some testing and motivating examples. (issue #1116, pull #1146,
   @rbuels)

 * Added feature.get('seq') to CRAM features which enables detailed comparison of the
   read versus the reference with the renderAlignment configuration. (issue #1126,
   pull #1149, @rbuels)

 * Added support for 1000genomes CRAM 2.0 codecs via updates to the @gmod/cram npm module.
   (@rbuels)

 * Add some better formatting for rich metadata in the "About this track" dialog boxes for
   tracks. Thanks to Wojtek Bażant for the idea and implementation! (pull #1148, @wbazant)

## Bug fixes

 * Fix bug where prepare-refseqs with indexed FASTA would allows scrolling past the end of
   the chromosome (@cmdcolin).

 * Fix long standing bug related to not being able to configure dataRoot in the config file.
   Now you can set dataRoot=mydirectory to make JBrowse load mydirectory instead of the
   default `data` by default (issue #627, pull #1144, @cmdcolin).

 * Added hashing of the BAM feature data to generate unique IDs in order to distinguish
   reads that have nearly identical information (same read name, start, end, seq, etc).
   If the reads literally have identical information in them JBrowse is still unable to
   display but this generally seems to be due to limited use case such as secondary
   alignments in RNA-seq (issue #1108, pull #1145, @cmdcolin)

# Release 1.15.0     2018-07-20 00:24:49 UTC

## Major improvements

 * Added support for displaying alignments from CRAM files, using the new npm module
   [@gmod/cram](https://www.npmjs.com/package/@gmod/cram). Thanks to @keiranmraine, @cmdcolin,
   @nathanhaigh, and the authors of `htslib` and `htsjdk` for invaluable test data and
   suggestions during this major effort. (issue #546, pull #1120, @rbuels)

 * Added support for the CSI index format for tabix VCF/BED/GFF and BAM files! This allows
   individual chromosomes longer than ~537MB (2^29 bases) to be used in JBrowse. To enable,
   use the `csiUrlTemplate` config to point to the file. The "Open track" dialog also allows
   CSI to be used. Thanks to Keiran Raine for initial report and Nathan S Watson-Haigh for
   catching a bug in the initial implementation! (issue #926, pull #1086, @cmdcolin)

 * Added a new search dialog box via the View->Search features menubar. It will search the
   currently configured store for features. You can also configure the dialog class in the
   configuration with `names.dialog` entry, or disable search dialog with `disableSearch`.
   Thanks to the #GCCBOSC hackathon for the idea and feedback (pull #1101, @cmdcolin).

## Minor improvements

 * Re-enabled JBrowse Desktop builds for releases! The Windows, Mac, and Linux binaries for
   JBrowse Desktop are uploaded automatically to GitHub releases page. JBrowse Desktop is a
   standalone app that can be used without a web server, similar to IGV or IGB (@cmdcolin)

 * Added a `dontRedispatch` option for GFF3Tabix stores. Example: set `dontRedispatch=region`
   if there are very large `region` biotype features in the GFF that do not have subfeatures
   which will speed up loading times significantly (issue #1076, pull #1084, @cmdcolin)

 * Add auto-lower-casing to the feature.get('...') function, commonly used for callback
   customizations. Now, for example, feature.get('ID') works as well as feature.get('id').
   Thanks to @nvteja for motivating this! (issue #1068, pull #1074, @cmdcolin)

 * Added cache-busting for track config files which actively prevents stale configuration files
   from being loaded (pull #1080, @cmdcolin)

 * Added indexing of both Name and ID from GFF3Tabix files from generate-names.pl. Thanks to
   @billzt for the implementation! (issue #1069)

 * Made the color of the guanine (G) residue more orangey than yellow to help visibility.
   Thanks to Keiran Raine for the implementation! (issue #1079)

 * Refactored NeatCanvasFeatures and NeatHTMLFeatures as track types. You can enable the track
   style on specific tracks instead of globally this way by modifying the track type to be
   `NeatCanvasFeatures/View/Track/NeatFeatures` or `NeatHTMLFeatures/View/Track/NeatFeatures`.
   (pull #889, @cmdcolin).

 * In the location box, allow strings with format ctgA:1-100 e.g. with a hyphen instead of `..`.
   Big thanks to Nathan S Watson-Haigh for the idea and implementation! The default display
   remains `..` but `-` is allowed. (issue #1100, pull #1102, @nathanhaigh)

 * Allow sequences with a colon in their name to be used in the location box. This includes
   the HLA reference sequences in hg38. Thanks again to Nathan S Watson-Haigh for the
   implementation of this feature. (pull #1119, @nathanhaigh)

 * Fix sensitivity to .gff.gz vs .gff3.gz in GFF3Tabix tracks opened via the  "Open track"
   dialog for GFF3Tabix. (issue #1125, @cmdcolin)

 * Feature detail dialog boxes now display subfeatures of features on the reverse strand in
   upstream-to-downstream order, instead of in genomic coordinate order. Thanks to
   @nathanhaigh for suggesting this and contributing the fix! (issue #1071, pull #1114, @nathanhaigh)

## Bug fixes

* Fixed a potential cross-site-scripting (XSS) vulnerability by disallowing `dataRoot` config
  values or `?data=` URL parameters that point to a different server from the one serving
  JBrowse. Users can disable this security check by setting `allowCrossOriginDataRoot = true`
  in their configuration. (@cmdcolin, @rbuels)

* Fixed a memory leak that was introduced in JBrowse 1.13.1 in generate-names.pl. Thanks to
   @scottcain for reporting (issue #1058, @cmdcolin)

* Fix the error checking in setup.sh if no node is installed at all (pull #1083, @cmdcolin)

* Fix calculation of histograms on GFF3 and GFF3Tabix stores. Thanks to @thomasvangurp for
   the bug report and sample data! (issue #1103, @cmdcolin)

* Fix the representation of array-valued attributes in column 9 for GFF3Tabix. Thanks to
   @loraine-gueguen for the bug report! (issue #1122, @cmdcolin)

* Fixed a bug in which visibleRegion() in GenomeView.js sometimes returned a non-integer value
  for `end`, which interfered with some scripts and plugins. Thanks to @rdhayes for noticing and
  contributing the fix! (issue #491, @rdhayes)

* Fixed bug where reference sequences with names containing the `:` character could not be
  switched to by typing their name in the search box. (issue #1118, pull #1119, @nathanhaigh)

* Fixed `setup.sh` behavior when `node` is not installed, printing a decent error message.
  (issue #1082, pull #1083, @cmdcolin)


# Release 1.14.2     2018-06-04 23:41:52 UTC

## Minor improvements

 * Added a `datasetSelectorWidth` configuration key that sets the width of the dataset
   selector. The width defaults to `15em`. Example setting in tracks.conf:
   ```
   [GENERAL]
   classicMenu = true
   datasetSelectorWidth = 20em
   ```
   Thanks to @srobb1 for pointing out the need for this. (issue #1059, @rbuels)

 * When exporting GFF3 from the 'Save track data' menu, the `##sequence-region` pragma now
   specifies the exact sequence region that was exported from the UI. Thanks to @mwdavis2
   for pointing this out! (issue #905, @rbuels)

 * Improved the welcome screen for the desktop version of JBrowse
   (issue #1045, pull #1050, @cmdcolin)

## Bug fixes

 * Fixed the `--config` option for `add-bw-track.pl`.  Although documented in the script's POD,
   it was not actually being processed. Thanks to @loraine-gueguen for noticing it, and for
   contributing the fix! (issue #1063, pull #1064, @loraine-gueguen)

 * Fixed a bug in which setup.sh failed if run twice in a row under some circumstances.
   (pull #1053, @cmdcolin)

 * Fixed a bug in which setup.sh did not accept nodejs version 10 as sufficiently recent.
   (pull #1048, @cmdcolin)

 * Fixed a bug in which the "Loading..." message erroneously appeared at the top of the
   dataset-selection page. Many thanks to @srobb1 for noticing this and reporting it!
   (issue #1057, @rbuels)

 * JSON syntax errors in the new configuration loading code now have better error messages.
   Thanks to @billzt for pointing out the need for this! (issue #1061, @rbuels)

# Release 1.14.1     2018-05-02 22:04:33 UTC

## Minor improvements

 * JBrowse now supports .idx indexes for VCFs that are generated by `igvtools` or GATK. Currently
   only VCF files can be used with this index type, but this could be expanded to other file types
   if users are interested. Thanks to @thon-deboer for suggesting this! (issue #1019, @rbuels)

 * The dropdown dataset selector in "classic menu" mode is now a type-ahead combo box, enabling
   fast searching through large numbers of datasets. Thanks to @keiranmraine for the suggestion!
   (issue #752, @rbuels)

 * There is now a new event named `/jbrowse/v1/n/tracks/redrawFinished` that fires after the
   view is refreshed, when all of the visible tracks are finished drawing (or have errored).
   Thanks to @scottcain for suggesting this. (issue #1027, @rbuels)

 * Improve the calculation of feature density for GFF3Tabix and add new one for GFF3 in-memory.
   Thanks to @hkmoon for the suggestion! (issue #1039, issue #913, @cmdcolin)

 * Re-enabled JBrowse Desktop builds based on automatically building on Travis-CI
   (issue #1028, @cmdcolin)

## Bug fixes

 * Fixed several bugs related to the file-opening dialog's handling of indexed file types
   (bam+bai, gz+tbi, etc). Thanks to @sletort for submitting the bug report! (issue #1033, @rbuels)

 * The Perl formatting tools now properly read `include`-ed configuration files. Thanks to @carrere
   for pointing out this bug. (issue #551, @rbuels)

 * Fixed a bug in which the faceted track selector was nonfunctional in Internet Explorer 11.
   (issue #1036, @rbuels)

# Release 1.14.0     2018-04-18 15:14:58 UTC

## Major improvements

 * JBrowse now behaves much better when embedded in a webpage without using an iframe.
   See tests/drupal.htm in the JBrowse code for an example of this usage. Thanks to
   @laceysanderson for her patiently championing this feature all the way through the
   long road to completion! (issue #777, pull #844, @cmdcolin)

 * There is a new BigBed store type, for opening BigBed files.  An example BigBed track configuration:
    <pre>
        [tracks.GENCODE]
        storeClass = JBrowse/Store/SeqFeature/BigBed
        type = CanvasFeatures
        urlTemplate = gencode.bb
        style.label = gene_name,name,id
        style.description = gene_bio_type
    </pre>

 * JBrowse now has much better support for UCSC-style BED and BigBed features, via the new BED
   glyph type for CanvasFeatures. Rather than rendering a complex feature hierarchy like many
   of the other CanvasFeatures glyphs, the BED glyph draws sub-blocks with thick and thin regions,
   for compatibility with the UCSC browser. CanvasFeatures will automatically use the
   `JBrowse/View/FeatureGlyph/UCSC/BED` glyph type if a feature has no subfeatures, but has
   `blockCount` or `thickStart` attributes. This means that, in practice, a BigBed file will
   display very well with just the default configuration. Also for compatibility with the UCSC
   browser, JBrowse will set a BED feature's background color if one is included in the
   feature data (turn this off by setting `itemRgb = false`).

## Minor improvements

 * The current dataset name is now displayed in the top right portion of the menu bar.
   (issue #767, @rbuels)

 * `prepare-refseqs.pl` now accepts a `--gff-sizes` option to allow defining reference
   sequence sizes from the `##sequence-region` directives in a GFF3 file. @rbuels

 * Some store types now support a `topLevelFeatures` configuration variable, which allows
   tracks to treat certain types of features as 'top-level', even the actual track data
   has them as children of other features. One common use case for this would be if
   you have gene models in a GFF3 structured as gene&rarr;mRNA&rarr;exon/CDS/UTR, but you want to
   display the "mRNA" features as top-level, i.e. ignore the gene container that they are in.
   Now you can set `topLevelFeatures = mRNA` in the track configuration, and the track will
   display only "mRNA" features on the top level, ignoring any other existing top-level features,
   and ignoring the containing "gene" features. This helps address what seems to be a common
   pain point of having to "filter" tabix-formatted GFF3 before using it with Apollo. One
   important caveat is that users that configure tracks to use an "out of band" source of
   feature density or coverage data, like a separate wiggle file that shows feature density,
   will have to make sure that the density data is correct for this filter setting if they
   use it. Thanks to @Yating-L, @nathandunn, and @cmdcolin for valuable discussions.
   Stores that support `topLevelFeatures` currently are: GFF3Tabix, GFF3, BED, BEDTabix,
   GTF, and REST (issue #974, issue #969, @rbuels)

 * JBrowse can now accept additional configuration from a `data-config` attribute on its
   container element. This is useful for embedding JBrowse in other sites, particularly
   in cases where the JBrowse assets and configuration are stored or referenced from a
   different location from the page displaying the embedded JBrowse. For example:
        ```html
            <div class="jbrowse"
                 data-config='"baseUrl": "../jbrowse"'
                 id="GenomeBrowser"
                 style="height: 600px; width: 100%; padding: 0; border: 0;"
            >
            </div>
        ```
   would tell JBrowse to look for its configuration and assets at the relative base URL
   "../jbrowse". @rbuels

 * JBrowse now has a favicon! (issue #973, @rbuels)

 * Added additional caching code to SequenceChunks and NCList stores, reducing duplicate
   network requests and increasing performance in some circumstances (pull #855, @cmdcolin)

## Bug fixes

 * Fix a bug in which saving exported data to a file was nonfunctional for some export
   data types. @rbuels

 * Fix a bug in which subfeatures were not always fetched correctly when using the GFF3Tabix
   store (issue #780, @rbuels)

 * Fixed several bugs with specific cases of relative URLs used in configuration. @rbuels

# Release 1.13.1     2018-03-28 23:49:27 UTC

## Minor improvements

  * Gene, ProcessedTranscript, and Segments glyphs can now render third-level subfeatures
    (such as `stop_codon_read_through` features) as simple boxes that draw on top of the
    main segment glyph. Thanks to @mpoelchau for pointing out the need for this!
    (issue #584, @rbuels)

  * CanvasFeatures tracks, when guessing which glyph to show for a feature in a track
    that does not specify glyphs in its configuration, will now use a Segments glyph
    instead of a Box glyph if the feature in question has subfeatures, and is not
    otherwise recognized as a gene or processed transcript. @rbuels

  * Added a check in the `setup.sh` script for NodeJS >= 6 and NPM >= 3.
    (issue #1026, @rbuels)

  * Plugins that don't need CSS can now set `jbrowsePlugin.css` to `false` in their
    package.json files to prevent JBrowse trying to load their css/main.css file,
    if they don't use any CSS. (@rbuels)

  * Add ability for the CanvasFeatures feature labels to stay visible on the screen.
    (issue #390, pull #971, @cmdcolin, @rbuels)

  * Improve VCF tracks support for GVCF generated by GATK, and fix a number of related
    VCF details display bugs. (pull #991, @cmdcolin)

  * `generate-names.pl` now supports indexing GFF3 files, enabling better use of
    GFF3Tabix tracks. Thanks to @billzt for the initial implementation!
    (issue #780, pull #900, @rbuels)

  * CanvasFeatures `ProcessedTranscript` and `Gene` glyphs now support a "style&rarr;utrHeightPercent" configuration variable that sets the percentage of the overall feature's height that a UTR have. This was previously hardcoded to 65, now it is customizable, defaulting to its old value of 65. @rbuels

## Bug fixes

  * Updated `NeatCanvasFeatures` and `NeatHTMLFeatures` plugins to support a `gradient`
    configuration variable, fix rendering of outrons, restore their default
    gradient-drawing behavior, disable gradients by default on Alignments and
    Alignments2 track types, and clean up their documentation. (issue #931, issue #982,
    issue #985, issue #931, issue #992, pull #1011, @enuggetry)

  * Fixed a bug with plugin loading that was preventing some plugins from working
    correctly. (issue #1025, @rbuels)

  * `flatfile-to-json.pl` will now refuse to format a track if the trackLabel
    contains a '/' character. Thanks to @dytk2134 for pointing this out, and @cmdcolin
    for the fix! (issue #1023, @cmdcolin)

  * Fixed a bug in which the viewing location would not be preserved across page reloads
    if `generate-names.pl` had not been run, or a names store had not otherwise
    been defined. Thanks to @cmdcolin for the bug report. (issue #1016, @rbuels)

# Release 1.13.0     2018-03-15 01:32:20 UTC

## Major improvements

  * JBrowse now uses a Webpack-based build system, which greatly speeds up JBrowse's
    initial loading time. Going forward, this change will also enable us to make
    much more effective use of the huge node.js ecosystem that has grown up in
    recent years, as well as to use newer versions of JavaScript itself while
    still maintaining compatibility with older web browsers.

  * Behind the scenes, the way JBrowse plugins are discovered and loaded has also
    changed significantly. The most visible consequence of this change is that
    installations that use plugins must now use the JBrowse-1.13.0-dev.zip release
    (or check out the `master` branch from GitHub), and must re-run the webpack build
    (most easily by running `setup.sh`) every time a plugin is added or removed from
    JBrowse. Although we think that most users of plugins will not experience any
    problems, we recommend that installations that make use of plugins other than the
    standard built-in plugins (Neat*Features, RegexSearch, etc) test the compatibility
    of their plugins thoroughly before deploying this release, and report any problems
    either to the JBrowse issue tracker on GitHub, or to the gmod-ajax mailing list.

  * Again, concisely: if you use JBrowse plugins other than the "stock" ones that
    come with JBrowse, you must now use the `dev` release of JBrowse, and re-run either
    `setup.sh` or `npm run build` every time you add or remove a plugin.
    (issue #981, @rbuels)

  * JBrowse plugins can now be published and installed with NPM. Simply publish your
    plugin using the standard `npm publish` machinery, and make sure its package name
    ends with "-jbrowse-plugin". For example, if you have a plugin named "foo", publish
    it to npm as "foo-jbrowse-plugin". However, if your plugin is named MyAwesomePlugin,
    which is not compatible with npmjs.org's naming conventions, you will want to publish
    it as something like "myawesome-jbrowse-plugin" and add a configuration stanza to its
    package.json file telling JBrowse its real plugin name. Example:
    ```
    {
        ...
        "jbrowse": {
            "pluginName": "MyAwesomePlugin"
        },
        ...
    }
    ```

## Minor Improvements

  * Added `disableCollapsedClick` and `enableCollapsedMouseover` track configuration options.
    The `enableCollapsedMouseover` option is useful when features do not overlap e.g.
    chromosome segmentation and `disableCollapsedClick` is useful when the collapsed features
    are very dense. Thanks to @rdhayes for tips (issue #544, pull #870, @cmdcolin)

  * Removed JBrowse 1.2.1 compatibility. Please use JBrowse 1.12.5 or earlier
    if you still have old data formatted with JBrowse 1.2.1. (@rbuels)

  * For `npm` installations of JBrowse, jb_run.js and jb_setup.js are now installed into
    the standard `node_modules/.bin` location. (issue #1021, @rbuels)

## Bug fixes

  * Fixed a bug in which adding setting `tracklabels=0` in the URL failed to hide
    track labels when `nav=0` was also set in the URL. Thanks to Vaneet Lotay for reporting
    the problem, and @cmdcolin for the fix. (issue #1017, pull #1018, @cmdcolin)

# Release 1.12.5     2018-02-28 20:08:35 UTC

## Minor improvements

  * Safari versions 10 and 11 will now see buttons for downloading feature FASTA
    sequences, as well as other sequences. These were turned off for all Safari
    browsers back when no version of Safari could download a client-generated file,
    but Safari 10 and 11 support it now. Thanks to @kkara for noticing the button
    was missing and prodding us to look into it. (issue #714, @rbuels)

  * Changed the default color for HTMLFeatures features to be a darker gray that
    is easier to see. Many thanks to @colindaven for the fix! (pull #980, @colindaven)

  * Added the ability to manually specify a reference sequence ordering in the
    configuration. Users can now set `refSeqOrder: "by_list"` and then set
    `refSeqOrderList: "ctgX,ctgY,ctgZ"` to manually specify an ordering.
    Thanks to @dsenalik, @liub1993, @wkpalan, and @cmdcolin for valuable
    discussions about this, and @rdhayes for the prototype implementation.
    (issue #867, issue #919, pull #1007, @rdhayes)

  * Added a `--noSort` option to `prepare-refseqs.pl` that preserves the reference
    sequence ordering in the input file, instead of sorting the reference sequences
    alphabetically in the JSON. Thanks to @dsenalik for the prototype implementation
    of this, and @cmdcolin and @rdhayes for valuable discussions.
    (issue #925, pull #924, pull #1007, @dsenalik)

  * Feature tracks now support a `showNoteInAttributes` flag that force the feature's
    `Notes` attribute to be displayed as a regular attribute in the feature detail
    popup. This is to support the case in which users want the blue description text
    on a feature to be different from the feature's `Notes` attribute, but still display
    the `Notes` attribute in the detail dialog. Thanks to @loraine-gueguen and @cmdcolin
    for the idea and the implementation. (pull #885, @cmdcolin)

  * When users click on an item in the dropdown autocompletion for the browser search
    box, the browser will go directly to that item immediately, eliminating the extra
    step of the user having to click "Go". Many thanks to @enuggetry for noticing the
    opportunity for this nice usability enhancement! (issue #616, pull #1001, @rbuels)

  * The global `highResolutionMode` configuration is now set to `auto`, meaning that
    JBrowse by default will now auto-detect high-DPI displays (Apple Retina displays
    and similar) and draw canvas-based tracks more clearly on them. This capability
    has been present in the JBrowse code for a long time, but has been turned off
    by default. (@rbuels)

  * Added support for two new configuration variables for SNPCoverage tracks:
    `indicatorProp` and `indicatorDepth`, which set the minimum proportion (indicatorProp)
    and minimum depth (indicatorDepth) of alternative alleles required to render the
    SNP indicator below a SNPCoverage track. Big thanks to Nathan Haigh for the idea
    and implementation! (pull #951, @nathanhaigh)

  * Added a basic loading screen for when the page is initially loading (pull #1008,
    @cmdcolin)

  * The `subfeatureDetailLevel` configuration variable for tracks now defaults to a value
    of 2, meaning that the builtin JBrowse default feature detail popup dialogs will only
    show one level of subfeatures by default. Most feature tracks have only one level of
    subfeatures anyway, but for very complex data (like gene models with many transcripts,
    each with many introns and exons), this new default will prevent a rather confusing
    problem some users were seeing in which JBrowse would seem to 'hang' when clicking a
    gene model to see its details. Thanks to @cmdcolin for the original implementation of the
    `subfeatureDetailLevel` configuration variable, @kshefchek for a good bug report that
    shows it, and @nathandunn and @selewis for valuable discussions.
    (issue #559, pull #1010, @rbuels)

 ## Bug fixes

  * Fixed a security issue with JBrowse error messages. Thanks to @GrainGenes for
    noticing and reporting it! (issue #602, @rbuels)

  * Fixed an off-by-one error in the "Next segment position" field of BAM features.
    Thanks to @keiranmraine for reporting it, and @rdhayes for tracking down the fix!
    (issue #907, pull #986, @rdhayes)

  * Fixed the broken demo track data source in the modENCODE sample data. Thanks
    to @cmdcolin for the fix! (pull #999, @cmdcolin)

  * Fixed bug in which dragging an Alignments or Alignments2 track into a combination
    track caused the combination track to crash. (issue #771, @cmdcolin)

  * Feature detail dialogs for variant tracks now correctly display "no-call" in
    the genotype details table for "./." alleles.  Thanks to @carrere for reporting
    it, and @cmdcolin for the fix. (issue #980, pull #990, @cmdcolin)

  * Fix parsing of the END field in VCF tracks, enabling things like CNV and deletion
    variants to be visualized from variant tracks. (pull #847, @cmdcolin)

  * Fixed a long-standing bug in JBrowse configuration template parsing that
    prevented use of dot-notation nested variable names, e.g. `{foo.bar}`, in
    JBrowse configuration, as well as whitespace inside the braces. Big thanks to
    @wuroger for finding this bug. (issue #1012, @rbuels)

# Release 1.12.4     2018-02-14 22:29:20 UTC

## Minor improvements

  * Fixed SEVERE performance regression that basically made flatfile-to-json.pl
    unusable on Perl 5.18 and higher. Huge thanks to Colin Diesh for tracking
    this down. (issue #470, pull #912, @cmdcolin)

  * Added code to calculate feature density histograms for Tabix-indexed GFF3
    (`GFF3Tabix`) data sources. Thanks to @nathandunn for noticing and fixing
    this! (pull #956, @nathandunn)

  * Added a new "Hide unspliced reads" menu item to Alignments and Alignments2
    tracks that filter out reads that have no `N`s in their CIGAR strings.
    Thanks to Deepak Kunni and Nathan Dunn for their work on this.
    (pull #921, @deepakunni3)

  * setup.sh now uses npm instead of Bower (which is deprecated) to install
    dependencies. @enuggetry

  * Removed legacy `wig-to-json.pl` and `bam-to-json.pl` scripts.  @rbuels

  * Added a `--trackConfig` option to `prepare-refseqs.pl` to allow injecting
    refseq configuration variables at format time. (pull #884, @erasche)

  * Added trackLabels: "no-block" config feature.  Moves track labels/menus
    above the features so as not to obscure the features. (issue #901, #490)

  * Added a `--category` option to `add-bw-track.pl` and `add-bam-track.pl` to
    set the new track's category. Thanks to @loraine-gueguen for the implementation!
    (pull #911, @loraine-gueguen)

  * Made jbrowse installable using `npm`. @cmdcolin and @enuggetry.

  * Implemented a built-in node.js Express server `jb_run.js` for quick JBrowse launching.
    @enuggetry

  * Added an `--unsorted` option to `prepare-refseqs.pl` that formats reference sequences
    in the same order in which they appear in the input sequence file.  Thanks to
    @dsenalik for the suggestion and implementation! (pull #924, @dsenalik)

  * Allows for dot-notation instead of JSON (pull #952) for addTracks, addBookmarks,
    and addStores. https://github.com/GMOD/jbrowse/pull/952. Address security concerns
    adding JSON to GET (https://nvd.nist.gov/vuln/detail/CVE-2016-6816) @nathandunn.

  * If a track has no `key` set in its track configuration, JBrowse will now look for
    a `key` in its track metadata, and use that if it is present. Thanks to Loraine
    Guéguen for the idea (issue #957, pull #958). @rbuels

  * Fixed bug in `maker2jbrowse` script that allows `maker2jbrowse` to be installed
    in system executable directories, and adds a `--sortMem` option.
    (pull #877, @cmdcolin)

  * Fixed a cosmetic/styling bug with malformed DOM structure in feature detail popup
    dialogs.  Thanks to Erik Rasche for noticing and fixing this! (pull #882, @erasche)

  * Added a configuration option that can disable JBrowse's behavior of updating the
    browser's title text as the view changes. Thanks to Luka Jeran, Primož Hadalin,
    and Nathan Dunn for this! (pull #904, @lukaw3d)

  * Suppress execution of biodb-to-json.pl on sample data while running setup.sh
    on MacOS High Sierra with stock Perl due to an issue with the stock Perl having
    broken BerkeleyDB integration, which is needed by Bio::DB::SeqFeature::Store,
    the main storage engine used by biodb-to-json.pl. Bug was manifesting as the script
    running indefinitely and taking all available disk space.
    (pull #945, issue #946, @deepakunni3 and @rbuels)

  * Mitigate race condition that could sometimes cause duplicate tracks to be shown
    when the browser is started with the `loc` query parameeter set to the name of
    a feature. Thanks to Colin Diesh for the fix. (issue #567, @cmdcolin)

  * Fixed issue in which JBrowse crashed when negative numbers were supplied for highlight
    coordinates in the URL. Thanks to @h2akim for reporting, and @cmdcolin for debugging help.
    (issue #769, @rbuels)

  * Add `--config` command-line option to `add-bw-track.pl` and `add-bam-track.pl`
    scripts. Thanks to Chris Childers for suggesting this! (issue #620, @rbuels)

  * Fixed a "cannot read property 'offsetLeft'" error when using touch screens without
    the old simple track selector active. (issue #893, @rbuels)

  * Upgraded to use new Google Analytics API for usage reporting. (@rdhayes)

  * Fixed bug in which start/stop codons were sometimes not displayed in the sequence
    track at certain zoom levels (issue #858, pull req #859, @cmdcolin)

  * Fixed a regression in which the `defaultTracks` configuration variable was no longer
    respected when set to a comma-separated list. (issue #892, pull #896, @rdhayes)

  * Made a cosmetic change to Alignments track detail popups, changing "Length on ref" to
    be displayed as "Seq length on ref", so that it is displayed more usefully next to
    "Seq length".  Thanks to @colindaven for the suggestion and implementation!
    (pull #939, @colindaven)

  * Improved the error messages displayed when a JBrowse glyph class fails to load. Thanks
    to @scottcain and @cmdcolin for tracking down the issue and improving the error
    handling! (issue #968, @cmdcolin)

  * Added support for an `addFeatures` URL query parameter that can inject features from
    the URL query string. (issue #976, @nathandunn)

  * Changed the project's `git` workflow to utilize a `dev` branch that is separate from
    `master`, with `master` only being updated when a new release of JBrowse is published.
    (issue #975, @enuggetry)

  * Implemented automated deployment of JBrowse releases to GitHub releases and `npm`.
    Thanks to @abretaud, @nathandunn, @erasche, and @cmdcolin for valuable discussions.
    (issue #822, pull #979, pull #984, @rbuels)

  * Added a `--bigwigCoverage` option to `add-bam-track.pl` to support configuring pregenerated
    coverage histograms from the command line.  Thanks to @loraine-gueguen for the suggestion
    and implementation! (pull #972, @loraine-gueguen)

  * Improved documentation of the `CategoryURL` plugin. (pull #985, @enuggetry)

# Release 1.12.3     2017-05-02 19:20:01 America/Los_Angeles

## Minor improvements

  * Upgraded build system to install dependencies with bower and
    updated to dojo 1.9.8 (issue #718).

  * Added the ability to load tabix indexed GFF and BED files.
    Thanks to Colin Diesh and @zhjilin for contributing (issue #670).

  * Added ability to open BED files in the "Open track" user interface
    (issue #729).

  * Added ability to access SPARQL and other jbrowse data stores via
    CORS. Thanks to the WebApollo hackathon and Eric Rasche for
    contributing (issue #679).

  * Added extra coloring schemes for the Sequence track when using
    protein residues. Thanks to Eric Rasche for the idea and
    implementation (issue #673).

  * Added ability to specify custom exporter classes for the "Save
    track data" option, for example, adding exporter code in plugins
    (issue #682).

  * Added ability to specify custom name store classes via plugins,
    which allows plugins to implement their own search functionality
    (issue #732).

  * Added a timeout for the track feature density calculations which
    can aid problems like consistent chunkSizeLimit issues
    (issue #540, issue #730).

  * Added an option to specify multiple highlights, or bookmarks,
    using the config file, a remote service, or the URL bar
    (issue #668).

  * Added support for parsing BAM files from IonTorrent (issue #782,
    issue #568).

  * Added support for native file access to .2bit files (issue #759).

  * Added list of plugins in about box (issue #848).

  * Added cacheMismatches option to improve performance when viewing
    long-read alignments (issue #860).

  * Added subfeatureDetailLevel config item to make View details box
    only load subfeatures on demand (issue #861).

  * Added ability to draw scatter plot from BigWig tracks. Thanks to
    Keiran Raine for the contribution (issue #741).

  * Added a fullviewlink option for the URL bar to disable "View full
    link" attribute in embedded JBrowse. Thanks to Vivek Krishnakumar
    for contributing (issue #813).

  * Added URL parameter &tracklabels=0 and config parameter to hide
    track labels (issue #869).

  * Added renderAlignment option which creates a per-base alignment
    view of the read versus the reference (issue #795).

  * Added inferCdsParts option which creates CDS subfeatures from a
    continuous CDS region for CanvasFeatures glyphs. Thanks to
    Vivek Krishnakumar for the contribution (issue #872).

  * Added events tracks/focus, tracks/unfocus, allowing for context
    switching based on selected track.

## Bug fixes

  * Made the menu bar widgets centered again (issue #680).

  * Fixed error where the sequence track would not load after "Open
    sequence file" (issue #831).

  * Fixed problem with persistant "Error reading from name store"
    message. Thanks to Anthony Bretaudeau for contributing the fix!
    (issue #820).

  * Reverted to standard eukaryotic codon set.

  * Fixed issue where saving session in JBrowse Desktop where plugins
    were not saved with session.

  * Fixed an error if there were numerical values being used as label
    or description for the CanvasFeatures type tracks. Thanks to
    Eric Rasche for reporting (issue #673).

  * Fixed some issues where the Gene glyph would not layout some
    features correctly. Thanks to Eric Rasche for reporting
    (issue #686).

  * Fixed an issue with JBrowse Desktop where saving session would not
    save the tracks that were not visible.

  * Added fix when using indexed fasta from prepare-refseqs.pl.
    Thanks to @billzt for the report (issue #719).

  * Added a fix for an issue where editing the configuration of files
    that were opened by a user didn't work. Thanks to @lpryszcz for
    the report (issue #569).

  * Fixed some inconsistencies where "Open sequence" on file with a
    .fasta file extension failed (issue #696).

  * Fixed issue where track labels would re-appear during scroll
    (issue #793).

  * Added handler for click scrolling in genome view. Thanks to
    @exogenesys for fixing (issue #709).

  * Fixed a rare error that only affected some versions of Chrome
    (issue #758).

  * Removed linear gradients from some NeatFeatures tracks
    (issue #721).

  * Fixed issue where saving GFF3 would fail if the source data
    was in VCF format (issue #800).

  * Fixed issue where there was a mix of plugin declarations
    (issue #866).

# Release 1.12.2     2016-05-31 America/Los_Angeles

  Special Release for Apollo

# Release 1.12.1     2016-03-01 03:47:38 America/Los_Angeles

## Minor improvements

 * Update Dojo to 1.8.10

## Bug fixes

 * Fix RegexSearch plugin and NeatCanvasFeatures plugin - search track
   loading failure (issue #676)

 * Fix compat_121.html to access /css directory

# Release 1.12.0     2015-12-18 17:40:39 America/Los_Angeles

## New features

 * Added ability to open a new genome in FASTA format from the
   browser.  Also supports indexed FASTA. Thanks to Bradford Powell
   for the original indexed FASTA contribution (issue #495,
   issue #647).

 * Support for inline reference sequence configurations.

 * Created stand-alone desktop version of JBrowse using the Electron
   platform for OSX, Windows, Linux (issue #647).

## New plugins

 * NeatHTMLFeatures - Add the drawing of introns and gradient features
   to HTML tracks.

 * NeatCanvasFeatures - Add the drawing of introns and gradient
   features to Canvas tracks.

 * CategoryUrl - Implements a cat= URL option to display tracks for a
   given category (issue #618).

 * DebugEvents - a plugin to display global publish and milestone
   events on the debug console.

 * HideTrackLabels - Adds a toolbar button to toggle the display of
   track labels on and off (issue #614).

## Minor improvements

 * Added new menu format to support loading your own genome. The open
   genome option can be hidden via `hideGenomeOption` in config, and
   the classic menu style can be restored via `classicMenu` in config.

 * Added ability to load custom histograms for tracks loaded from
   flatfile-to-json.pl (i.e. override a pre-existing histogram store).
   See (issue #612).

 * Added these options to add-bw-track.pl --clip_marker_color <color>,
   --bg_color <color>, --height <value> (issue #510).

 * Added an option for Wiggle tracks, scoreType: 'avgValue', which
   helps preserve continuity when zooming in on certain tracks like
   GC-content. It complements the scoreType: 'maxValue' introduced in
   1.11.6. Thanks to Han Lin for the pull request (issue #504).

 * Clarify track filter box description and feature search box
   "placeholder" text. (issue #611)

 * Implement option to have a separate location box from search box
   (issue #611, issue #652).

 * Move CSS files into css folder.

 * Added ability to specify the set of startCodons and stopCodons in
   the config files. Thanks to Eric Rasche for the contribution (issue
   #657)!

## Bug fixes

 * Add Travis-CI and jshint linting to build (issue #628).

 * Fixed a bug where the BAM popup boxes would display some incorrect
   info due to byte packing. Thanks to Thomas Downs for contributing
   the fix.

 * Fixed a bug where grid lines wouldn't render at some particular
   zoom levels (issue #514).

 * Fixed a bug where the user's --workdir parameter would be deleted
   which could have unintended side effects if the --workdir was
   pointing to important data, but this is uncommon (issue #563).

 * Allow falsey values to be used in browser.cookie.

 * Fix minor issue where sometimes the length field of refSeqs.json
   was missing.

 * Fix some issues that occurred when a reference sequence was named
   '0' (issue #662, issue #610).

# Release 1.11.6     2015-02-12 18:27:38 America/Chicago

## Minor improvements

 * Added the ability to customize the contents of HTMLFeatures and
   CanvasFeatures mouseover tooltips more extensively. Thanks to David
   Muller for the original bug report and Colin Diesh for the fix
   (issue #480).

 * Added new options for BigWig files to use min/max summary values
   when zoomed out using `scoreType`. Thanks to Scott Cain for
   reporting the issue and to Colin Diesh for the fix (issue #518).

 * Added a checkbox for wiggle type tracks to have log scale. Thanks
   to Han Lin for the pull request (issue #502).

 * Added the ability to display paired-end reads in the same direction
   on Alignments2 tracks with the "Use reverse template" option.
   Thanks to Tomaz Berisa and Colin Diesh for their contributions
   (issue #485).

 * Added the ability to specify a codon table (or partial codon table)
   for the Sequence track.

 * Added the ability to show or hide the main menu bar using the
   configuration file.

## Bug fixes

 * Fixed "boolean is not a function" error when using CanvasFeatures
   tracks with the Segments glyph in some situations.

 * Fixed a dialog box display issue for VCF variants with "no call"
   specified (issue #513).

 * Fixed loading files from certain filepaths with special characters.
   Thanks to Ben Bimber for reporting and helping diagnose the bug
   (issue #508).

 * Fixed popup-dialog callbacks not being called on BAM Alignments
   tracks in 1.11.5.

 * Fixed systemwide installations of JBrowse perl modules when using
   Module::Build.

 * Fixed a bug when displaying SNPs on hard clipped reads. Thanks
   to Thon de Boer for the bug report and to Colin Diesh for the fix
   (issue #516).

 * Fixed a bug when displaying SNPs on spliced alignments. Thanks
   to GitHub user 09140930 for the bug report and to Colin Diesh for
   the fix (issue #523).

 * Fixed a bug that affected some VCF and GFF popup dialogs in some
   browsers, particularly Chrome 38 (issue #522).

 * Fixed a bug with the incremental indexing with generate-names
   that associated the wrong track with the name store. Thanks to
   Richard Hayes for reporting this issue and to Colin Diesh for the
   fix (issue #526).

 * Fixed the `--workdir` parameter in generate-names.pl (issue #506).

 * Fixed the display of alternative alleles in the genotype for VCF
   pop-ups (issue #533).

 * Fixed an issue where some paired-end read data wouldn't display
   properly if they had the same start position (issue #521).

 * Output .htaccess file for generate-names.pl when using the compress
   option. Thanks to Sebastien Carrere for reporting the bug
   (issue #541).

 * Fixed a small bug with being able to scroll past end of chromosome
   when using the `--sizes` option to prepare-refseqs.pl (issue #535).

 * Fixed a small internal code inconsistency with the positioning of
   the vertical position line. Thanks to Anurag Priyam for the fix
   (issue #545).

 * Fixed a small bug with some stylesheets not being able to be used
   for the CanvasFeatures coloring, for example, LESS stylesheets.
   Thanks to Anurag Priyam for reporting the issue (issue #527).

 * Fixed a small bug with mouseovers on Wiggle type tracks. Thanks
   to Han Lin for finding and fixing this bug (issue #503).

 * Removed XS tag from the strand calculation for alignments and made
   it an optional rendering option for BAM files with the "Use XS"
   option. Thanks to Kieran Raine and the pull request (issue #473).

 * Added a bugfix that prevented viewing the details of haploid VCF
   files. Thanks to Colin Diesh for finding and fixing this bug
   (issue #536).

 * Added a bugfix for an issue that made browsing very buggy when
   using private browsing mode in Safari.

 * Fixed the `shortDescription` option for the mouseover description
   of tracks in the Hierarchical track list (issue #553).

 * Re-added filter options that were missing for SNPCoverage tracks.

# Release 1.11.5     2014-09-04 16:03:22 America/Chicago

## Minor improvements

 * Added the ability to disable sorting on the Hierarchical track
   selector using the sortHierarchical flag. Thanks to Chris Childers
   for the suggestion and Colin Diesh for the implementation
   (issue #477).

 * Added saving of the display mode setting on the CanvasFeature based
   tracks. Thanks to Jon Hinton for the idea and Colin Diesh for the
   fix (issue #469).

 * Added configurable click event handlers for Wiggle type tracks.
   Thanks to Richard Hayes for implementing this feature (issue #489).

 * Added more configuration options for 'View details' popups as well
   as the ability to customize the 'About track' popups. Thanks to
   Colin Diesh for the idea and implementation (issue #494).

 * Added the ability to load the category attribute from trackMetaData
   files to be used for the Hierarchical track selector.

 * Added the ability to specify initially collapsed categories in the
   Hierarchical track selector (issue #507).

 * Added beta touch-screen and tablet support by fixing a related bug.
   Thanks to Paul Hale and Kieran Raine for reporting bugs and to
   Emily Greenfest-Allen for the suggested fix (issue #505).

## Bug fixes

 * Fixed a bug with VCF tabix file parsing that caused unnecessary
   chunkSizeLimit errors. Thanks to Richard Hayes for finding and
   debugging this issue (issue #486)!

 * Fixed a bug where the Variant popup boxes would not display
   complete genotype information in previous 1.11.* versions.
   Thanks to Nando for reporting the bug and Colin Diesh for the
   bugfix (issue #488).

 * Fixed a small error that occured when using variant type tracks
   with the REST API.

 * Added a bugfix that caused problems scrolling in dialog boxes
   for variant type tracks in 1.11.4 (issue #492).

 * Fixed the use of the --refs flag on prepare-refseqs.pl. Thanks to
   Audrey for finding & fixing this bug (issue #497).

 * Added missing template length flag to the Alignments popup dialogs.
   Thanks to Kieran Raine for the suggestion and Colin Diesh for the
   fix (issue #471).

 * Fixed the functionality of the --incremental flag in the
   generate-names.pl script. Thanks to Richard Hayes and Colin Diesh
   fixing the issue (issue #478).

 * Fixed legacy bam-to-json.pl support when running setup.sh due to
   samtools build modifications (issue #501).

# Release 1.11.4     2014-05-14 12:04:54 America/Chicago

## Minor improvements

 * Added high-resolution rendering for CanvasFeatures, SNPCoverage,
   BigWig tracks, and histograms. This allows rendering for canvas-
   based tracks to look much sharper on high-resolution displays and
   can even look sharper when zooming. The high-resolution rendering
   is disabled by default to avoid conflicts with existing instances,
   but feel free to test it out by setting "highResolutionMode" in
   jbrowse.conf. Thanks to Colin Diesh for the idea and implementation
   (issue #456)

 * Added the ability to run jbrowse scripts outside of the JBrowse
   root directory. Thanks to Chien-Chi Lo for the patch (issue #465).

 * Added basic GTF parser that can open files from the File->Open
   menu or by using the in-memory adaptor. Big thanks to Andrew Warren
   for the contribution (issue #453).

 * Added a change to the highlight button to allow the user to more
   easily clear highlights. Thanks to Paul Hale for the suggestion
   and Colin Diesh for the fix (issue #445).

## Bug fixes

 * Fixed help page icons not loading since JBrowse 1.11.2. Thanks to
   Colin Diesh for catching the bug and fixing it (issue #460).

 * Fixed updating of the y-axis scale when using the resize
   quantitative tracks feature. Thanks again to Evan Briones for the
   original implementation and Colin Diesh for the fix (issue #461).

 * Changed the CanvasFeatures 'View details' pages to display the name
   and description of features in the dialog box. Thanks to Colin
   Diesh for the fix (issue #463).

 * Added a bugfix for non-compliant servers that add a trailing slash
   to the URL. Thanks to Colin Diesh for the fix (issue #462).

 * Fixed a broken link in the documentation for biodb-to-json.

 * Updated setup.sh to maintain compatibility with the latest BioPerl.
   Thanks to Thomas Sibley and Scott Cain for helping with this issue
   (issue #468).

 * Fixed a long standing bug with the coloring of nucleotides on the
   SNPCoverage/Alignments2 track. Thanks to Long Le for reporting this
   on the mailing list.

 * Fixed a long standing bug with the scrollbar in the dialog box on
   Chrome and Safari browsers. Thanks to the #dojo irc channel and
   and Colin Diesh for helping fix this problem (issue #386).

 * Fix a small rendering problem that causes one pixel gap to appear
   on Safari due to subpixel rendering issues. Thanks to Colin Diesh
   for the preliminary fix (issue #341).

 * Fix a bug with CanvasFeatures based tracks loading huge amounts
   of data to generate histograms instead of using pre-generated
   histograms. Also lowered the maxScreenFeatureDensity default on
   the CanvasFeatures tracks so that histograms can be displayed more
   readily. Thanks to Daniel Troesser for reporting this issue on the
   mailing list and Colin Diesh for the fix (issue #475).


# Release 1.11.3     2014-03-07 13:05:57 EST5EDT

## Minor improvements

 * Added a "Zoom to this" item in the default right-click menus for
   canvas-based feature tracks.  Thanks to Paul Hale for the initial
   implementation of this.

 * Allow the user to set the document.domain property via jbrowse.conf
   which can be helpful especially if jbrowse is embedded in a iframe.
   Thanks to Kieran Raine for the idea and Colin Diesh for the bugfix
   (issue #440)

 * Improved the graphic design of the "Add sequence search" dialog box
   to make it clearer how to switch between providing an amino acid
   and a nucleotide sequence.  Thanks to Kevin Mohamed for the initial
   implementation of this (issue #436).

 * Expanded the default color set of `Alignments2` tracks to show
   different shades of color indications of reads with missing mate
   pairs, improperly aligned reads, and reads with mate pairs on
   different reference sequences.  Thanks to Keiran Raine for
   implementing this (issue #443).

 * Added support to customize specific parts of the 'View details'
   popups using callback functions. Thanks to Kieran Raine for the
   idea and Colin Diesh for the implementation (issue #421).

 * The File->Open tool will now can add files named `*.coverage.*` or
   `*.density.*` as histograms to newly-opened tracks if the file
   basenames match.  For example, if both `mysample.bam` and
   `mysample.coverage.bw` are present, `mysample.coverage.bw` will be
   added as a histogram source for `mysample.bam`.  Thanks to Keiran
   Raine and Alexander Stoddard for suggesting this (issue #423).

## Bug fixes

 * Fixed a problem where the feature arrowhead would get stuck in the
   middle of the screen at high zoom levels. Thanks to Colin Diesh for
   the fix (issue #449).

 * Disabled the FASTA download button in the "View details" page on
   Safari (issue #412). This feature can't be supported in Safari at
   this time, but it is still supported in most other browsers. Rob
   Buels and Colin Diesh contributed fixes to this issue.

 * Fixed a bug in the client-side GFF3 parser pointed out by Andrew
   Warren.  Thanks Andrew! (issue #452).

 * Fixed the problem of translation frames being switched around at
   different zoom levels. Thanks to Kieron Taylor for the bug report
   and Colin Diesh for the bugfix (issue #435)

 * Fixed a bug where gene features in GFF tracks would not have
   arrowhead markers. Thanks to Colin Diesh for finding and fixing
   this issue (issue #454)

# Release 1.11.2     2014-02-10 19:11:33 EST5EDT

## Minor improvements

 * Added some user interface elements to set the height in pixels of a
   single quantitative track, or of all visible quantitative tracks.
   Thanks to Evan Briones for implementing this!

 * Added a `JBrowse/View/FeatureGlyph/Diamond` glyph that draws
   diamond-shaped features instead of boxes.  Thanks to OICR Co-op
   student Kevin Mohamed for implementing this!

 * Reference sequence tracks now display a "no sequence" message
   instead of a bunch of blank blocks when the reference sequence
   basepairs aren't available.  Thanks to Kevin Mohamed for
   implementing this (issue #422).

 * Persistent session state is now stored on a per-dataset basis,
   which improves user experience when switching between multiple
   datasets in JBrowse.  Thanks to Richard Hayes for pointing this
   issue out, and Kevin Mohamed for the fix (issue #410).

 * "Hide sites not passing ..." settings in VCF track menus now show
   the filter's long description when hovered over.  Thanks to Keiran
   Raine for suggesting this (issue #420).

 * Tweaked display of track labels and added a slight border at the
   top edge of each track to make it more clear which track data
   belongs to.  Thanks to Keiran Raine for suggesting this, and Kevin
   Mohamed for the initial implementation (issue #432).

 * Added a `--config` option to `flatfile-to-json.pl` that accepts
   additional configuration variables that will be merged into the top
   level of the track configuration.  Thanks to Mikael Brandström
   Durling for the initial implementation of this.

## Bug fixes

 * `generate-names.pl` now indexes VCF files from track definitions in
   `tracks.conf` files.  Thanks to Paul Halle for pointing this out
   (issue #434).

 * Added a missing dependency for the server side formatting tools on
   List::MoreUtil 0.28 or higher.  Thanks to Cris Lawrence and Keiran
   Raine for troubleshooting this!

# Release 1.11.1     2014-01-07 15:48:39 EST5EDT

## Minor improvements

 * Alignments2 tracks now include right-click menu items to view the
   location of an alignment's mate pair or next segment in a popup or
   a new tab.  Thanks to Keiran Raine for suggesting this (issue #406).

 * Alignments2 tracks now draw gaps and deletions in reads regardless
   of zoom level, as long as the alignment is at least 3 pixels wide
   in the display.  Thanks to Keiran Raine for pointing out the need
   for this (issue #403).

 * Added support for a `histograms.max` variable for
   CanvasFeatures-based tracks that can be used to manually set the
   max value of a histogram display.  Thanks to Keiran Raine for
   pointing out the need for this.

 * Added support for drawing clip markers (with their color set by
   `histograms.clip_marker_color`) in CanvasFeatures-based
   tracks. Thanks to Keiran Raine for pointing out the need for this
   (issue #402).

 * Canvas-based feature tracks now try to draw histograms, if
   available, when the data backend throws a data-overflow error (like
   when the BAM backend exceeds the chunkSizeLimit).  Thanks to Keiran
   Raine for motivating this (issue #405).

 * Make it easier to set JS loading baseUrl by moving it into the
   initial dojo configuration.  Thanks to Jillian Rowe for pointing
   out the need for this.

 * Enhanced new text-based config syntax to support arrays of values
   in a list like:

        [trackMetadata]
        sources =
          + data/mymeta.csv
          + data/more_meta.csv

## Bug fixes

 * When a number is typed into the location box, JBrowse first checks
   if it is the name of a feature in the names index, and only
   interprets it as a coordinate if it is not found in the names
   index.  Thanks to Richard Hayes for pointing this out (issue #407).

 * Fixed bug that caused client-side GFF3 tracks to appear as
   "Loading" forever if the GFF3 is malformed (like malformed GFF3
   files that are opened with the File->Open tool).

 * Fixed bug in which no default value for
   `maxFeatureSizeForUnderlyingRefSeq` was being set, which made
   default feature detail popups try to fetch and display a feature's
   underlying reference sequence even if it is way too large, unless
   the variable was set explicitly in the configuration.

 * JBrowse now shows a more understandable error message when trying
   to open an uncompressed BAM file.  Thanks to Keiran Raine for
   pointing this out (issue #404).

 * Fixed jbrowse.conf faceted track selector configuration examples
   not working as written.  Thanks to Cris Lawrence for pointing this
   out.

 * Fixed a bug in which right-clicking on feature labels in an
   HTMLFeatures-based track did not bring up the right-click menu for
   a feature.  Thanks to Cris Lawrence for pointing this out (issue #408).

# Release 1.11.0     2013-12-19 15:51:37 EST5EDT

## Major improvements

 * Introduced density/coverage histogram support for CanvasFeatures,
   CanvasVariants, and Alignments2 tracks.  These track types now
   support an optional `histograms` configuration subsection that can
   contain a definition for a second datastore that holds quantitative
   data (usually either coverage depth or feature density) to be
   displayed when zoomed further out than `featureScale` (or if
   `featureScale` is not set, the scale determined by the store's
   feature density divided by `maxFeatureScreenDensity`).  Thanks to
   Richard Hayes for pushing hard for this feature.

 * Added a new "Hierarchical" track selector that shows tracks in a
   hierarchy of collapsible categories, which is now the default track
   selector.  To assign categories and subcategories to your tracks,
   set `category` or `metadata.category` attributes on each configured
   tracks in your `trackList.json`.  Thanks to the many users who have
   requested this at one time or another.

 * JBrowse now supports a new plaintext configuration format that
   users of GBrowse will find very familiar, since it is designed to
   be very similar to it.  This syntax is also much easier to
   hand-write than JSON.  The JSON configuration syntax is not going
   away, and will continue to be supported.

   Thanks to Erik Derohanian for the original implementation of this
   configuration adaptor, and Richard Hayes and Keiran Raine for
   motivating the work to polish and more fully integrate it.

 * Variables in configuration files can now be based on the contents
   of other variables.  For example, setting

       "myCustomVariable": "/some/custom/path",
       "include": "{myCustomVariable}/conf.json"

   will try to include a configuration file located at
   "/some/custom/path/conf.json".  Interpolation is done as the final
   step in configuration loading, so variables can come from anywhere
   in the configuration.

 * When JBrowse is started, if there are no reference sequences found
   in the default `dataRoot`, but the dataset selector is configured,
   JBrowse shows a simple list of links to available datasets instead
   of the "Congratulations, JBrowse is on the web" page.  Thanks to
   Saulo Aflitos for the idea and its initial implementation.

 * For users wishing to convert existing JSON configuration files to
   the new format, there is a new script, `bin/json2conf.pl`, that
   does a fair job.  Run `bin/json2conf.pl -?` for details on how to
   use it.

 * Added a new REST backend for name lookup and autocompletion.  See
   http://gmod.org/wiki/JBrowse_Configuration_Guide#JBrowse_REST_Names_API
   for details.  Thanks to Erik Derohanian for implementing this, and
   Ben Booth for suggesting an API design (issue #267).

 * Major performance and scalability improvements for
   `generate-names.pl`.  Now uses a different algorithm that is faster
   and more scalable than before, and no longer relies on BerkeleyDB
   for temporary storage.  This should also alleviate the need to run
   generate-names.pl with `--safeMode` in Perl 5.10 and earlier.  In
   fact, the `--safeMode argument` to generate-names.pl no longer has
   any effect.  Thanks to Cris Lawrence for pointing out the
   continuing need for more scalability.

## Minor improvements

 * Detail popups for CanvasVariants and HTMLVariants tracks now
   display the reference sequence itself instead of just "ref" in
   genotype displays.  Thanks to Cris Lawrence for requesting this.

 * Added a "save as FASTA" button to default feature detail popups
   that downloads a FASTA file with the displayed piece of reference
   sequence (issue #299).

 * `chunkSizeLimit` for VCF files now defaults to 1 MiB.  It used to
   be 15 MiB, which was really far too big for browsers to handle.

 * Added support for a `--nameAttributes` argument to
   `flatfile-to-json.pl` that takes a comma-separated list of feature
   attributes to index for name searching and completions, or 'none'
   to not make names searchable.

 * Added support for a `nameAttributes` variable in `biodb-to-json.pl`
   track configurations that can be set to an array of feature
   attribute names to to index for name searching and completions, or
   'none' to not make names searchable.

 * Add a `--category` argument to bin/wig-to-json.pl that can be used
   to set the `metadata.category` of a track.

## Bug fixes

 * Fixed a bug in NCList data backed in which feature histograms were
   often calculated very incorrectly.

 * Fixed a bug in the VCF data backend that caused not all VCF
   features to be shown in some files at some zoom levels.

# Release 1.10.12     2013-12-10 16:09:42 EST5EDT

## Minor improvements

 * `bam-to-json.pl` and `flatfile-to-json.pl` now support a
   `--metadata` argument that can add a `metadata` stanza to track
   configurations they generate.

 * Multi-valued attributes in feature detail popups are displayed as a
   string of boxes, each containing a value, to avoid
   misinterpretation.  Before, each value was just separated from the
   previous one by whitespace.  Thanks to Cris Lawrence for pointing
   out the need for this.

## Bug fixes

 * Re-enabled usage analytics reporting, which had been disabled by a
   stray piece of debugging code since the 1.10.7 release.

 * Fixed a bug in which the tooltip in canvas-based feature tracks
   would sometimes display incorrect label or description text.

# Release 1.10.11     2013-12-03 17:21:20 EST5EDT

## Minor improvements

 * Made the sequence track's "zoom in to see sequence" placeholder
   take up less vertical space.  Thanks to Scott Cain for pointing out
   that making it be the same height as it will eventually be when
   zoomed in to base level is silly.

 * By default highlighting features after searching for them by name
   is now turned off.  Set the `highlightSearchedRegions` top-level
   conf variable to `true` to turn this back on.  Turns out, most
   people seem not to like this behavior.  Thanks to Gregg Helt and
   Cris Lawrence for pointing this out.

 * `SNPCoverage` tracks now correctly display "skipped" regions in
   alignments, such as those produced by TopHat.  Thanks to Josh
   Orvis, Gustavo Cerquiera, and others for reminders that this was
   still an issue.

 * `SNPCoverage` tracks now provide per-strand counts of "reference"
   reads at each position, like they already were providing for
   reads with mismatches.

 * `SNPCoverage` tracks now accept a `mismatchScale` configuration
   variable that sets the viewing scale (i.e. zoom level, pixels per
   bp) above which base-level mismatches will be drawn.  Defaults to
   1/10.  Making this value larger can speed up SNPCoverage tracks for
   high-coverage data at the cost of needing to zoom in further to see
   mismatches.

 * setup.sh now uses `curl` for downloading things instead of `wget`,
   since `curl` is more widely available.  Thanks to Keiran Raine for
   suggesting and implementing this (issue #393).

## Bug fixes

 * Fixed a bug in which `generate-names.pl` would sometimes report the
   incorrect number of hashing bits in verbose output, and would
   sometimes use the number of hashing bits for an existing index even
   if that index was being regenerated.  Thanks to Richard Hayes for
   pointing out the incorrect log output.

 * Fix `generate-names.pl` crashing on some older versions of Perl with
   an error like `Bareword "POSIX::O_RDONLY" not allowed while "strict
   subs" in use`.  Thanks to Chris Childers for pointing this out.

 * Fix `setup.sh` failing on some older versions of Perl.  It now runs
   `generate-names.pl` with the `--safeMode` flag.

 * Fixed a bug where the value display in SNPCoverage tracks would
   sometimes report "NaN%" for the reference when no reads cover a
   region.

 * Fixed a bug in which activating rubberband zooming using the SHIFT
   key while in highlighting mode would cause all the tracks to be
   dragged when attempting to highlight a region afterward.  Thanks to
   Erik Derohanian for pointing out and fixing this (issue #387).

 * Fixed the location of the dojo/nls directory in release zipfiles.
   Was erroneously in src/nls, supposed to be src/dojo/nls.  Thanks to
   Matt Bomhoff for pointing this out.

 * The in-memory GFF3 parser now copes with a missing newline at the
   end of a GFF3 file.  Previously, the last line was ignored if it
   did not end with a newline character.  Thanks to Colin Davenport
   for pointing this out (issue #394).

# Release 1.10.10     2013-11-21 09:31:53 EST5EDT

## Minor improvements

 * Spacing between tracks is now configurable by setting
   `view.trackPadding` in the configuration.  Thanks to Chenchen Zhu
   for suggesting this (issue #377).

 * If reference sequences are defined, but no tracks are yet added,
   JBrowse will start normally instead of going to the
   "Congratulations, JBrowse is on the web" page.

 * `generate-names.pl` now supports a `--compress` option that
   compresses the name index files to save server disk space.  Thanks
   to Richard Hayes for pointing out the need for this (issue #378).

## Bug fixes

 * `generate-names.pl` now uses IO::Uncompress::Gunzip instead of
   PerlIO::gzip to read compressed VCF files.  This fixes a bug in
   which only the first few hundred names in a VCF were indexed.
   Thanks to Cris Lawrence for pointing this out (issue #380).

 * Fixed a bug in which `generate-names.pl` would crash if run with
   `--incremental` and no existing names index.  Thanks to Richard
   Hayes for pointing this out (issue #379).

 * Fixed a bug in which `generate-names.pl` would sometimes choose the
   wrong number of hash bits when performing incremental updates,
   leading to the old data being lost.  Thanks to Richard Hayes for
   lots of help troubleshooting this.

 * Fixed bug where other tracks are visible underneath pinned tracks
   when the display is scrolled down.  Thanks to Ed Lee for pointing
   this out.

 * Fixed a bug in which tooltip does not hide after the mouse leaves a
   Wiggle track in Safari 5 and 6. Thanks to Charles Girardot for
   pointing this out.

 * Fixed a bug in which the `main.css` file for plugins was not being
   correctly loaded in some installations.  Thanks to Matt Bomhoff for
   pointing this out.

# Release 1.10.9     2013-11-08 15:22:50 EST5EDT

## Minor improvements

 * `generate-names.pl` now supports a `--incremental` or `-i` option
   that adds names to an existing index.  Thanks to Richard Hayes for
   reminding me that this wasn't done yet (issue #373).

 * Added a lower-performance, but more backward-compatible indexing
   backend to generate-names.pl that can be activated by passing the
   `--safeMode` command-line argument.  The recent performance
   improvements to generate-names.pl have apparently tickled some bugs
   that are present in some installations.  Thanks to Josie Reinhardt
   and GitHub user raj76 for their continued help troubleshooting
   this.  If you find that name indexing is not working correctly, try
   running it again with `--safeMode`, and report to the mailing list
   if it helps.

 * Added support for using the JBrowse in-memory GFF3 adaptor to
   display web-accessible GFF3 files directly.  See
   docs/tutorial/data_files/volvox.gff3.conf for an example
   configuration.  Thanks to David Goodstein and Richard Hayes for
   motivating this.

## Bug fixes

 * `flatfile-to-json.pl` now depends on the latest
   Bio::GFF3::LowLevel::Parser 1.8, which fixes a bug in which
   features with no ID, Parent, or Derives_from attributes were not
   being included in parsed data.  Thanks to Gwendoline Andres for
   pointing this out.

 * Tweak BioPerl-handling code in biodb-to-json.pl to hopefully work
   better with BioSQL backends. Thanks to Brian Osborne for pointing
   this out.

# Release 1.10.8     2013-10-25 11:13:30 EST5EDT

## Minor improvements

 * Added a new `navigateTo` action usable for customizing feature
   left-clicks and right-click menus.  Thanks to Scott Cain for
   requesting this.

 * Added a new `feature_range_cache` option for the REST data backend.
   If set to true, the REST backend will more aggressively cache
   ranges of feature data.  Thanks to Daniel Troesser for pointing out
   the need for this (issue #369).

 * `maker2jbrowse` now, by default, runs `generate-names.pl` to
   generate names indexes.  Also added a `--no_names_index` option to
   turn this off.  Thanks to Josie Reinhardt for making me notice this
   was missing.

 * Tweaked `generate-names.pl` default indexing parameters to
   emphasize indexing speed more.  Now defaults to a smaller average
   file size for the on-disk JSON files it produces, which is much
   faster to generate and write (up to 8 or 10x faster).  However, the
   on-disk index is about 2-2.5x larger overall.

 * Removed support for the `--refids` command-line argument to
   `prepare-refseqs.pl`, which has probably never really worked.

 * Improved `prepare-refseqs.pl` support for Bio::DB::Das::Chado
   database backends.  Thanks to Gwendoline Andres for helping
   troubleshoot this.

## Bug fixes

 * Fixed generate-names.pl making incorrect name indexes when using 16
   or more bits of hashing (when the number of index entries exceeds
   about 4 million).  Thanks to Josie Reinhardt for helping
   troubleshoot this (issue #370).

 * The faceted track selector no longer refuses to display track
   unique labels even if they are explicitly included in the
   `displayColumns` setting.

# Release 1.10.7     2013-10-15 16:50:00 EST5EDT

## Minor improvements

 * Added an optional `stats/regionFeatureDensities` endpoint to the
   REST API that makes it possible to provide binned feature counts
   that HTMLFeatures tracks can use to display feature histograms.
   Thanks to Stuart Watt and Daniel Troesser for pointing out the need
   for this (issue #365).

## Bug fixes

 * Fixed a bad bug introduced in 1.10.6 in which FASTA files with line
   lengths longer than the configured chunk size were not correctly
   formatted.  Thanks to Jean-Jack Riethoven for pointing this out
   (issue #363).

 * Fixed a bug introduced in 1.10.6 in which prepare-refseqs.pl would
   not respect the --noseq command-line option when using --fasta.

 * Fixed bug in which `name` or `seq_id` attributes are required for
   reference sequence features.  Thanks to Daniel Troesser for
   pointing this out.

 * Fixed a bug that may have prevented some types of VCF files from
   being displayed (error message referring to `inheritedFilters`).

 * Fixed a bug in which "Zoom in to see feature" in Sequence tracks
   would wrap downwards below track at some zoom levels and window
   widths.

 * Fixed an off-by-one error in UTR attributes manufactured by the
   `impliedUTRs` mechanism of the ProcessedTranscript glyph.  Thanks
   to Ben Booth for pointing this out (issue #362).

 * Fixed a bug in which `score` attributes of features were not being
   recorded by `biodb-to-json.pl`.  Thanks to HongKee Moon for
   pointing this out (issue #364).

 * Removed a stray use of Carp::Always in GFF3-processing Perl code
   that may have caused problems in some installations.

# Release 1.10.6     2013-10-07 21:06:51 EST5EDT

## Minor improvements

 * Made the `impliedUTRs` option for ProcessedTranscript and Gene
   glyph still attempt to create UTRs if only '''one''' of the UTRs is
   missing from a transcript.  Thanks to Ben Booth for pointing out
   the need for this.

## Bug fixes

 * Fixed bug in which the mouseover value displays for Wiggle and
   SNPCoverage tracks would not always be hidden when the mouse leaves
   the track.

 * Fixed a bad bug that prevented fixed-scale Wiggle and SNPCoverage
   tracks from displaying.  Thanks to Jean-Jack Riethoven and Michael
   Axtell for pointing this out.

# Release 1.10.5     2013-10-03 10:21:37 EST5EDT

## Minor improvements

 * Greatly improved the speed and reduced the memory footprint when
   running `prepare-refseqs.pl` with the --fasta and --gff options.

 * Added an `impliedUTRs` option to the ProcessedTranscript and Gene
   glyphs for CanvasFeatures tracks.  Thanks to Ben Booth for pointing
   out the need for this (issue #348).

 * Upgraded flatfile-to-json.pl to use a new version of
   Bio::GFF3::LowLevel::Parser for GFF3 parser, which has a lookback
   buffer limit that makes it easier to parse large GFF3 files that do
   not contain enough '###' directives.

 * Further improved the memory footprint and speed of
   generate-names.pl. Thanks to Richard Hayes for his continued help
   with testing improvements and reporting problems.

 * Removed explicit dependency on GD::Image, which is only used by the
   old tiled-image generation demo code.  This will make dependency
   installation easier for many people, at a (very) small cost to
   backward compatibility.

## Bug fixes

 * Fixed a bad bug that prevented combination tracks from working.
   Thanks to Harry Yoo for pointing this out (issue #351).

 * Fixed a bug in which one of the temporary files used by
   generate-names.pl was not being created in the correct location.
   Thanks to Richard Hayes for testing this.

 * Fixed a bug in which `generate-names.pl` could sometimes crash when
   run with the -v (verbose) switch, or in setup.sh.

 * Fixed odd behavior when entering coordinate ranges in the location
   box under Safari.  Thanks to Keiran Raine for pointing this out
   (issue #341).

# Release 1.10.4     2013-09-23 16:16:50 EST5EDT

## Minor improvements

 * Rewrote many parts of generate-names.pl, making heavy use of
   temporary BerkeleyDB stores (using Perl's DB_File module).  This
   improves generate-names.pl performance by more than 10x.

 * Added a File->Add sequence search track menu item that can make
   tracks that show which regions of the reference sequence contain a
   given (small) sequence, or match a given regular expression.
   Thanks to Daniel Kasenberg for the initial implementation of this
   (issue #315).

 * Added a CanvasVariants track type, similar to HTMLVariants, which
   utilizes the faster CanvasFeatures rendering backend for displaying
   variant data.

 * Added checkboxes to HTMLVariants and CanvasVariants track menus
   that allow filtering displayed features based on the FILTER
   attribute in a VCF file.  In addition to filtering based on the
   presence or absence of PASS, users can filter based on the custom
   filters defined in the VCF header.  Thanks to Keiran Raine and
   Andrew Uzilov for suggesting this (issue #344).

 * Added "Hide forward strand" and "Hide reverse strand" checkboxes to
   Alignments and Alignments2 track menus that allow alignments on the
   forward and/or reverse strands to be hidden.

## Bug fixes

 * Fixed a bug that prevented indexing of feature aliases in the names
   index when running generate-names.pl.

 * Fixed a bug that prevented proper display of the "ibeam" feature
   class in HTMLFeatures tracks.  Thanks to Ed Lee for pointing this
   out.

# Release 1.10.3     2013-09-04 16:22:17 EST5EDT

## Minor improvements

 * Added options to Alignments, Alignments2, and SNPCoverage tracks to
   allow hiding reads that are duplicates, fail vendor QC, have
   missing mate pairs, are secondary alignments, and/or are
   supplementary alignments.  Thanks to Kieran Raine and Andrew Uzilov
   for pointing out the need for this, and for their input on its
   design (issue #332).

 * Added support for a `variables` configuration for SPARQL data
   stores that can be used to specify additional variables for
   interpolating into a SPARQL query.  Thanks to Toshiaki Katayama for
   suggesting this.

 * Added the ability for Sequence tracks to display a 6- or 3-frame
   translation of the reference sequence.  Thanks to Daniel Kasenberg
   for implementing this (issue #221).

 * Added checkboxes in the track menu of Sequence tracks that allow
   users to toggle the display of the forward strand, reverse strand,
   and 6-frame translation.

 * Added support for an `addStores` variable in the query string of the
   URL used to start JBrowse.  This variable accepts store
   configurations (which are a way to specify data sources separately
   from track configurations, so multiple tracks can use the same data
   source) in JSON format.  For example, to add a store called
   "urlbam" that points to a BAM file, you could use the JSON:

       `{ "urlbam": { "type": "JBrowse/Store/SeqFeature/BAM", "urlTemplate": "/path/to/my/bamfile.bam" }}`

   which, when URI-escaped and put in the query string, looks like:

       `addStores=%7B%20%22urlbam%22%3A%20%7B%20%22type%22%3A%20%22JBrowse%2FStore%2FSeqFeature%2FBAM%22%2C%20%22urlTemplate%22%3A%20%22%2Fpath%2Fto%2Fmy%2Fbamfile.bam%22%20%7D%7D`

 * Slightly improved performance of generate-names.pl in cases where
   --completionLimit is zero.  Also improved the POD documentation of
   the --completionLimit parameter for generate-names.pl. Thanks to
   Richard Hayes for his continued patience.

## Bug fixes

 * Fixed some bugs that prevented proper display of BigWig files
   larger than 4GB. Thanks to Keiran Raine for pointing this out.

 * Fixed a major performance bug that unnecessarily slowed down
   display of large BigWig files with Wiggle tracks when `autoscale`
   is set to "local".

 * Fixed a bug that prevented display of BAM reads that had MD tags
   but no associated CIGAR string.  Thanks to Keiran Raine for point
   this out (issue #330).

 * Fixed a bug in which FixedImage tracks (e.g. legacy image-based
   Wiggle tracks) never take down the "Loading" message when
   displaying on a reference sequence for which no image data has been
   provided.

 * Fixed a bug that prevented rendering of mismatches, insertions, and
   deletions in a BAM read that occurred after a skip. Thanks to Gregg
   Helt for noticing this and fixing it (issue #325).

 * Fixed a bug in which the SNP frequencies calculated by SNPCoverage
   tracks were sometimes incorrect.  Thanks to Matthew Conte for
   pointing this out (issue #335).

 * Fixed a bug in which reference sequences with a start coordinate
   other than zero would cause the overview scale track to not be
   drawn correctly.  Thanks to Gregg Helt for noticing this and
   working on an initial fix (issue #324).

 * Fixed a bug in which the most recent location visited on a given
   reference sequence was not properly being restored from the saved
   cookie.  Thanks to Gregg Helt for the initial fix for this
   (issue #321).

 * Fixed a bug in which event handlers and blocks in CanvasFeatures
   tracks were not being properly cleaned up.  The most prominent
   visible consequences of this were duplicate dialog boxes being
   opened when clicking on a canvas feature.  Thanks to Keiran Raine
   for noticing this and making sure it was fixed (issue #329).

 * Fixed a bug with flatfile-to-json.pl parsing of GenBank locations.
   Thanks to Steve Marshall for pointing this out (issue #323).

 * Fixed a bug in which SNPCoverage tracks would not always properly
   display error messages when something goes wrong, particularly
   under IE 9.

# Release 1.10.2     2013-08-15 13:57:16 EST5EDT

 * Added mouse-over 'tooltips' to to CanvasFeatures tracks that show
   the a feature's label and description when the mouse hovers over
   it.  Thanks to Daniel Kasenberg for implementing this.

 * Strand arrowheads in CanvasFeatures tracks now attempt to stay
   visible on the screen, like they do in HTMLFeatures tracks.  Thanks
   to Daniel Kasenberg for implementing this.

 * Fixed bugs and inefficiencies preventing JBrowse from handling very
   dense BigWig files.  Thanks to Michael Axtell for pointing this out
   (issue #312).

 * Fixed a bug in which features were not always laid out correctly in
   CanvasFeature tracks when the display mode is set to "compact".

 * Fixed a bug causing the text labels of mismatching bases in
   Alignments2 tracks (i.e. `Alignments` canvas glyphs) to be slightly
   misaligned vertically when feature labels are turned on (they are
   off by default for Alignments glyphs).

 * Fixed a bug preventing the `defaultTracks` configuration variable
   from operating correctly.

# Release 1.10.1     2013-08-06 15:32:21 EST5EDT

 * Added support in `maker2jbrowse` for user-defined source tags in
   GFF3 output from MAKER.  Thanks to Carson Holt for contributing
   this fix.

 * NCList data stores (actually the array representation used therein)
   now store feature attribute names case-insensitively.

 * Fixed a bug in which features in canvas-based feature tracks could
   not be clicked in Firefox.  Thanks to GitHub user mke21 for
   pointing this out, and to Daniel Kasenberg for fixing my fix to
   work with older versions of Chrome.

 * Fixed a bug with client-side GFF3 parsing in which the strand of
   features was not being correctly parsed.

 * Fixed bug preventing backward-compatibility with 1.2.1-formatted
   data. Thanks to Daniel Kasenberg for implementing this.

 * Fixed a bug in the Gene glyph that caused the browser to crash if a
   gene feature has no subfeatures.


# Release 1.10.0     2013-07-30 14:25:06 EST5EDT

## Major improvements

 * Added powerful combination tracks, which can combine data from
   multiple other tracks using range, arithmetic, or masking
   operations.  For example, a BigWig track can be masked to highlight
   only regions that lie within features from a BAM track.  Or the
   intersection of two or more feature tracks can be calculated.  To
   create a combination track, select "File->Add combination track"
   from the menu bar, and then add tracks to the new combination track
   by dragging them into it.  A huge thanks to OICR co-op students
   Julien Smith-Roberge and Daniel Kasenberg for implementing this
   powerful feature. It's a very significant accomplishment!

 * Added "normal", "compact", and "collapsed" feature layout options
   for canvas-based feature tracks (currently just Alignments2
   tracks).  Thanks to OICR co-op student Daniel Kasenberg for
   implementing this!

 * Greatly improved the `JBrowse/View/Track/CanvasFeatures` track
   type, to the point where it is probably ready for experienced
   JBrowse users to use in earnest. It renders features using a
   modular glyph system that GBrowse users will find very familiar.
   To give it a try, simply change the `type` key in an existing track
   configuration to "JBrowse/View/Track/CanvasFeatures" and add a
   `glyph` key to set which glyph to use.  Glyphs that are currently
   implemented are:

   * Box - draws a box, optionally with an arrow indicating strandedness.
   * Segments - draws a series of boxes connected with a line, for
     features with subparts.
   * ProcessedTranscript - draws CDS and UTR features, with UTRs a
     different color and thinner.
   * Gene - draws a group of aligned ProcessedTranscript glyphs for
     mRNAs that are subfeatures of a top-level gene feature.

   Each of these glyphs have been patterned as near-clones of the
   (very popular) analogous glyphs in GBrowse.

 * Added a SPARQL data backend to allow displaying features directly
   from a SPARQL endpoint.  Many thanks to the NDBC/DBCLS BioHackathon
   2012 and 2013 participants for suggesting this and helping with
   this work! See http://www.biohackathon.org for more on this
   fantastic (and I think very important) series of hackathons.

 * There is a new "Highlight" button next to the "Go" button that lets
   a user quickly and easily highlight a region with the mouse.

 * Added the ability to "pin" some tracks to the top of the display,
   so that they stay at the top of the pane while the rest of the
   tracks are scrolled vertically.  Thanks to the WebApollo project
   for suggesting this.

 * Integrated a `maker2jbrowse` script into the core JBrowse
   distribution.  You can now visualize your MAKER results in JBrowse
   with a single command:
       `bin/maker2jbrowse -d /path/to/your/maker/master_datastore_index.log`
   Thanks to the MAKER team and Yandell lab for providing the initial
   implementation of `maker2jbrowse`.

## Minor improvements

 * Added support for an `addFeatures` variable in the query string of
   the URL used to start JBrowse.  This variable accepts feature data
   in JSON format in the form:

      `[{ "seq_id":"ctgA", "start": 123, "end": 456, "name": "MyBLASTHit"},...}]`

   which, when URI-escaped and put in the query string, looks like:

      `addFeatures=%5B%7B%20%22seq_id%22%3A%22ctgA%22%2C%20%22start%22%3A%20123%2C%20%22end%22%3A%20456%2C%20%22name%22%3A%20%22MyBLASTHit%22%7D%5D`

   Developers integrating JBrowse into larger project may find this
   feature useful for displaying results from other
   non-JavaScript-based applications (such as legacy web BLAST tools)
   in JBrowse.

   Features added to JBrowse in this way are available in a special
   data store named `url`, which can be specified in a track
   configuration by adding `"store":"url"`.

 * Added support for an `addTracks` variable in the query string of
   the URL used to start JBrowse.  This variable accepts track
   configurations in JSON format in the form:

       `[{"label":"mytrack","store":"url","type":"JBrowse/View/Track/HTMLFeatures"},...]`

   which, when URI-escaped and put in the query string, looks like:

       `addTracks=%5B%7B%22label%22%3A%22mytrack%22%2C%22store%22%3A%22url%22%2C%22type%22%3A%22JBrowse%2FView%2FTrack%2FHTMLFeatures%22%7D%5D`

 * Added "Save track data" option to Alignments2 tracks.  This option
   should have been there all along, but somehow slipped through the
   cracks.  Thanks to Valerie Wong for pointing this out at the 2013
   GMOD Summer School!

 * Statistics about a track's features are now shown in its "About
   this track" dialog, if available.

 * Added support for a --reftypes argument to `prepare-refseqs.pl`,
   allowing you to search a database for reference sequences based on
   the type of the reference sequences, e.g. 'chromosome'.  Thanks to
   Gaelen Burke at the 2013 GMOD Summer School for pointing out the
   need for this, and for assistance in testing the new feature.

 * Added a `--gbk` option to `flatfile-to-json.pl` that accepts a
   GenBank-format text file as input for loading annotation data.
   Thanks to Justin Reese for the initial implementation of this.

 * When formatting features with `flatfile-to-json.pl`, multi-valued
   feature attributes are now only flattened (renamed foo, foo2, foo3,
   etc) for "name", "id", "start", "end", "score", "strand",
   "description", and "note" attributes.  Formerly, all attributes
   were flattened.  This improves the default display of features that
   have many values for some attributes, such as Dbxrefs or GO terms.

 * Further improved scrolling smoothness of HTML-based feature tracks.

 * Added a `JBrowse/Store/SeqFeature/FromConfig` feature store adapter
   that can display feature data that is specified directly in
   configuration.  This is mostly used to implement the support for
   `addFeatures` in the JBrowse URL, but some administrators and
   developers may find it convenient as well to define feature data
   directly in the JBrowse configuration.

 * `flatfile-to-json.pl` now supports a `--trackType` option that can
   be used to set the JavaScript track class that will be used for the
   formatted data (e.g. "JBrowse/View/Track/CanvasFeatures" to use the
   new, improved HTML5 canvas-based feature tracks).

 * `biodb-to-json.pl` configuration files now support a `trackType`
   configuration key in each track configuration that can be used to
   set the JavaScript track class that will be used for the formatted
   data (e.g. "JBrowse/View/Track/CanvasFeatures" to use the new,
   improved HTML5 canvas-based feature tracks).

 * `prepare-refseqs.pl` can now format reference sequences from a
   common .sizes (aka .len) file that is just a two-column
   tab-separated list of reference sequence names and their lengths,
   run like:
       bin/prepare-refseqs.pl --sizes myrefs.sizes

 * `prepare-refseqs.pl` can now format reference sequences from a
   gzipped GFF3 if the file's name ends with the suffix ".gz".

 * Added a '--noSubfeatures' option for flatfile-to-json.pl to skip
   importing subfeatures (since `--getSubfeatures` is on by default
   for some time).

 * The `style.label` configuration variable in HTMLFeatures (and
   CanvasFeatures) tracks can now accept a comma-separated string of
   field names in addition to a function callback.  Defaults to
   'name,id';

 * The "Save track data" (data exporting) menu now has "Highlighted
   region" as one of the choices of which range to export, if there is
   a region currently highlighted.

 * The "JBrowse" link on the left side of the menu bar, and the
   browser title, now display the "About this browser" title instead
   of JBrowse, if `aboutThisBrowser` is set in the configuration.
   Thanks to Joanna Kelley at the 2013 GMOD Summer School for
   suggesting this.

 * Tweaked styling of inactive track handles in the default Simple
   track selector to make them look less like pressable buttons.
   Thanks to Pedro Pagan at the 2013 GMOD Summer School for pointing
   out the need for this, and helping to brainstorm how the new styles
   should look.

 * Horizontal mouse-wheel (or trackpad) events can now scroll the
   genome view horizontally.  Thanks to Mara Kim for help testing this
   at the 2013 GMOD Summer School.

 * The "content" of configurable information popups (such as can be
   shown when clicking on features) can now accept a dojo/Deferred or
   other promise object that will provide the content to be shown
   asynchronously.

 * Added a `track.maxFeatureSizeForUnderlyingRefSeq` configuration
   variable, defaulting to 250 Kbp, that sets the maximum length of a
   feature for which the default feature detail popup will attempt to
   display the underlying reference sequence.  Thanks to Colin
   Davenport for pointing out the need for this (issue #291).

 * Added the ability to specify the file name when exporting track
   data to a file.  Thanks to Daniel Kasenberg for implementing this.

 * Added a `track.noExportFiles` configuration variable that, if set
   to true, disables exporting files from the "Save" menu of tracks.

## Bug fixes

 * Fixed a bug that prevented clicking on features in Alignments2 (and
   other canvas feature tracks) in Internet Explorer.

 * Fixed a bad design decision with respect to track metadata stores.
   Before, a given metadata key ("Category", "Conditions", etc) was
   allowed to only be present in one source of track metadata (CSV
   file, configuration file, etc).  The original thinking behind this
   was that it would be better for people to be forced to keep each
   kind of metadata in only one place.  This was silly thinking.
   Thanks to the 2013 GMOD Summer School participants for helping me
   to see the error of my ways.

 * Fixed a bug in which turning off the HTMLFeatures track's "Show
   Labels" did not remove labels for features with descriptions.

 * Fixed a bug with `prepare-refseqs.pl` in which, when multiple
   definitions of a reference sequence are found (as in a GFF3 file
   with both ##sequence-region directives and a FASTA section), the
   seqChunkSize value is not recorded in refSeqs.json and the sequence
   bases cannot be displayed in the "Reference sequence" track.

 * Fixed a synchronization bug in NCList-based feature data stores
   that causes some features to be missing when displaying with a
   CanvasFeatures track.  This bug may also have affected 'Save track
   data' (data export) in some situations.

 * Fixed a bug with GFF3 export in which the phase(!) column was
   missing.  Thanks to Michael Campbell at the 2013 GMOD Summer School
   for helping track this down!

 * Fixed another bug with GFF3 export in which an extra comma would
   sometimes be added at the beginning of GFF3 lines for some child
   features.

 * Fixed a bug in which the global highlighted region was not correctly drawn
   when switching reference sequences.

 * Fixed a minor bug in which the REST store backend did not coerce
   start, end, strand, and score to be numeric if the input JSON had
   them as strings.

# Release 1.9.8     2013-07-05 09:22:36 EST5EDT

 * Removed "XX has no data for this chromosome" popup warning message.
   It was just annoying and not very useful.

 * Added an optional "yScalePosition" element to track configs that
   allows configs with Y axes to have those axes positioned on the
   left or right side of the view, as well as in the center.  Thanks
   to Alexis Grimaldi for making this change.

 * Fixed a bug in which NCList-based tracks display with an error for
   reference sequences on which they have no data.  Thanks to Michael
   Axtell for pointing this out.

 * Improved GFF3 handling in the File->Open tool, fixed a bug in the
   GFF3 parser in which an empty (.) source column caused the GFF3
   parser to crash.

 * Improved scrolling speed when many HTML feature tracks are active.

 * Fixed a bug in which the browser can fail to start for a reference
   sequence that has never been seen before.

 * Fixed a confusing behavior in JBrowse/Store/SeqFeature/REST in
   which the URLs it constructs to fetch from did not always have a
   '/' where one would expect.  Thanks to Alex Kalderimis for pointing
   this out.

# Release 1.9.7     2013-06-25 15:41:22 Asia/Tokyo

 * Fixed a bug in which the initial viewing location (passed from a
   URL parameter or similar) is not always set correctly in all parts
   of the browser.  Thanks to Steffi Geisen for pointing this out.

 * Fixed a bug in which JavaScript paths for plugins were incorrectly
   calculated when a `baseUrl` global configuration variable was set.
   Thanks to Matt Bomhoff for pointing this out.

 * Fixed a bug in which XYPlot tracks sometimes failed to draw bars
   for data that was both below the graph origin and below the track's
   configured minimum value.  Thanks to GitHub user drusch for
   pointing this out.

# Release 1.9.6     2013-06-18 14:57:26 EST5EDT

 * Fixed a bug in which the reference sequence selection dropdown menu
   did not work for purely numeric reference sequence names.  Thanks
   to Matt Bomhoff for pointing this out.

 * Fixed a bug with some types of BAM files in which not all BAM
   features would be displayed.  Thanks to Ignazio Carbone for
   pointing this out. (issue #276).

 * Fixed bug in which File->Open failed to open GFF3 files with
   embedded sequences in a FASTA section.

 * Added a `--workdir` option to `generate-names.pl` to allow name
   index building on a faster filesystem than the one that will
   ultimately store the name index.  Thanks to Alexie Papanicolaou for
   suggesting this. (issue #273).

# Release 1.9.5     2013-06-12 12:35:53 EST5EDT

 * Added an `trackSelector.initialSortColumn` configuration variable
   to the faceted track selector that can be used to set the initial
   sort order for the grid in the faceted track selector. Thanks to
   Alexie Papanicolaou for suggesting this.

 * Made Wiggle density tracks indicate out-of-range values using
   separate clip markers at the top and bottom of the color field,
   rather than showing the out-of-range region as a third color (or
   black or white).  Thanks to Gregg Helt for suggesting this.

 * Added support for a `quickHelp` configuration variable that lets
   administrators customize the contents of the Help->General dialog.
   Thanks to Gregg Helt for suggesting this.

 * Rewrote GFF3 direct-access backend to make it more
   standards-compliant and capable of parsing all attributes of a
   feature.  Thanks to Jillian Rowe and Colin Davenport for pointing
   out the need for this.

 * Fixed arrowheads on HTMLFeatures not always being visible when the
   viewing region is being panned back and forth.  Thanks to Gregg
   Helt for pointing this out.

 * Fixed a bug in which editing a track's configuration JSON through
   the track menu when the faceted track selector was enabled
   sometimes caused another track to be deactivated.  Thanks to Steffi
   Geisen for pointing this out.

 * Fixed a subtle bug in which not completing a track-dragging gesture
   from the Simple track selector into the genome view caused the
   track handle to not disappear from the track selector when the
   track is turned on later.  Thanks to Gregg Helt for pointing this
   out.

 * Fixed a bug in which `prepare-refseqs.pl` can crash when used with
   Bio::DB::Das::BioSQL.  Thanks to Brian Osborne for contributing the
   fix.

 * Fixed failures of setup.sh legacy BAM support installation caused
   by samtools taking down their old SourceForge subversion
   repository.

 * Fixed a bug in which highlighted regions were not always drawn
   correctly at initial load time.  Thanks to Steffi Geisen for
   pointing this out.

 * Added support for a `plugins->[]->location` configuration
   attribute, making it possible for plugins to be loaded from outside
   the JBrowse plugins directory.

 * Fixed a bug in which Wiggle track value displays behaved a bit
   oddly with some kinds of mouse movements.  Thanks to Gwendoline
   Andres for pointing this out.

 * Added a `logMessages` global configuration variable that, if set to
   true, records messages on the JBrowse message bus in the browser
   log.

 * Added a workaround for problems with some types of nonstandard Perl
   installations.  Thanks to Rebecca Boes for pointing this out.

# Release 1.9.4     2013-05-22 14:03:32 EST5EDT

 * Fixed a bug with configuration handling that preventing disabling
   right-click feature menus, and probably had other undesirable
   effects.  Thanks to Daniel Troesser for pointing this out
   (issue #260).

 * Fixed a bug in which facet renaming specified in the
   `trackSelector.renameFacets` configuration variable was not
   properly applied to facet titles in the accordion widget on the
   left side of the faceted track selector (issue #251).  Thanks to
   Jason Gao for pointing this out.

 * Fixed a bug with GFF3 and Sequin Table export of GFF3
   alternate_allele attributes.  Thanks to Jillian Rowe for pointing
   this out (issue #256).

 * Fixed some hard-coded image paths that were not respecting the
   setting of the `browserRoot` configuration variable.  Thanks to
   Harry Yoo for pointing this out (issue #258).

 * Fixed a bug in which running `biodb-to-json.pl` with no arguments
   caused it to crash instead of producing help output.  Thanks to
   GitHub user sreyesch for pointing this out (issue #257).

 * Fixed a bug in which some browsers report that
   src/dijit/_editor/nls/commands.js is missing.  Thanks to Steffi
   Geisen for pointing this out.

# Release 1.9.3     2013-05-09 12:42:39 EST5EDT

 * Fixed a bug in VCF backend that prevented display of VCF features
   containing lines in which the ALT column was '.' or not provided.
   Thanks to Ignazio Carbone for pointing this out.

 * Fixed a display bug in faceted track selector in which selected
   facets that have no available matches were squashed to the left
   side.

 * Fixed issue with HTMLVariants track type not being available for
   selection from the File->Open dialog.

# Release 1.9.2     2013-05-02 13:30:12 EST5EDT

 * Fixed bug in which JBrowse could not properly display all data in
   BAM files with reference sequence name sections bigger than 64KB.
   Thanks to GitHub user lfgu for pointing this out (issue #245).

 * Made REST feature store backend less sensitive more tolerant of
   stringification of `start`, `end`, `strand`, and `score` in feature
   JSON.  Thanks to Matt Bomhoff for pointing this out.

 * Fixed bug in which URLs for plugin resources were not assembled
   relative to the `browserRoot` config variable.  Thanks to Matt
   Bomhoff for pointing this out.

 * Fixed bug in which missing fields in a VCF variant's genotype
   prevented display of a variant's details.  Thanks to Jillian Rowe
   for pointing this out.

 * Fixed some minor issues related to the handling of empty BigWig
   files.  Thanks to Nathan Boley for pointing this out (issue #252).

 * The `trackSelector.type` global config variable can now contain
   fully-qualified class names, so plugins can contain their own
   tracklist classes.  Thanks to Matt Bomhoff for pointing this out.

 * Moved the "Select tracks" tab used to open the faceted track
   selector downward, so that it does not block access to the left
   side of the reference sequence overview.

# Release 1.9.1     2013-04-25 12:02:25 EST5EDT

 * Significant speed and memory optimizations in BAM data backend
   (issue #242).

 * Significant speed and memory optimizations in VCF data backend.

 * JBrowse now attempts to smooth over mismatches in the naming of
   reference sequences between various datasets.  For instance, if a
   BAM file contains reference sequences named like "chrom1", and the
   canonical reference sequences used in a JBrowse installation are
   named like "chr1", JBrowse will recognize these two names as
   equivalent for the purposes of displaying the BAM data.  This
   behavior can be disabled by setting the global configuration
   variable `exactReferenceSequenceNames` to `true`. (issue #239).

 * Removed support for track `blockDisplayTimeout` configuration
   variable.  It never worked very well, and the problem it was meant
   to address (delays caused by large data) are better mitigated by
   `maxHeight` and the faster rendering offered by canvas-based track
   types.

 * Fixed a bug that prevented displaying some VCF files.  Thanks to
   Steffi Geisen for pointing this out.

 * Reduced the default value of `maxHeight` for canvas-based feature
   tracks (like Alignments2) from 1000 to 600.

 * Fixed a bug in the `Alignments` track type where BAM features with
   missing mate pairs that are not drawn due to their position above
   the track's `maxHeight` caused the track rendering to crash.
   Thanks to Tristan Lubinski for reporting this.

 * If no global `refSeqOrder` is specified in the configuration, the
   reference sequences are now not sorted.  Currently, this means that
   they will appear in the same order as loaded by
   `prepare-refseqs.pl`.  Users with a very large number of (more than
   10,000) reference sequences may wish to avoid specifying a
   `refSeqOrder`, since sorting the reference sequences is done at
   JBrowse startup time.  Thanks to Tristan Lubinski for reporting
   this.

 * Fixed bug preventing display of quantitative data from files loaded
   with flatfile-to-json.pl.  Thanks to Gwendoline Andres for pointing
   this out.

 * Instead of quantitative (wiggle) tracks throwing an error when they
   cannot choose a min and max for the display scale, they now just
   make a guess.  While probably wrong, this at least has the track
   displaying something, and users can then look up how to fix the
   display scale.

 * Added support for a `chunkSizeLimit` configuration variable for BAM
   and VCF-based tracks, which defaults to 5MB for BAM and 15MB for
   VCF.  When fetching data, if a given region requires fetching a
   file chunk that is larger than this limit, a 'Too much data'
   message is displayed.  This helps prevent speed and memory problems
   when displaying deep-coverage BAM tracks and large VCF tracks
   (issue #242).  Thanks to Gustavo Cerquiera (GitHub user cerca11)
   for pushing for progress on this.

 * Fixed a regression in which callbacks and interpolations were not
   evaluated in left-click and right-click menu configurations.

 * Fixed incorrect display of negative values in log-scale wiggle
   tracks.  Thanks to GitHub user drusch for pointing this out
   (issue #244).

 * Fixed more minor errors when running under IE 7.

 * Fixed "Max height reached" message sometimes being drawn under
   instead of over HTML-based features.

# Release 1.9.0     2013-04-16 18:59:19 EST5EDT

 * Added a direct-access data backend for reading variation data
   directly from VCF files that have been compressed with `bgzip` and
   indexed with `tabix`.  See the JBrowse Configuration Guide on the
   GMOD wiki for details about how to add directly-displayed VCF files
   (issue #211).

 * Added a new `HTMLVariants` track type based on HTMLFeatures with a
   feature-details popup optimized for displaying variant details.

 * Added a text box at the top of the simple (i.e. the default) track
   selector that finds tracks in the track list matching the typed
   text (issue #210).

 * Added support for `autoscale: "local"` in Wiggle, FeatureCoverage,
   and SNPCoverage tracks, which automatically sets the scale of the
   y-axis based on the range of the data being displayed in the
   current view.  Thanks to Gregor Rot and Raymond Wan for championing
   the need for this (issue #203).

 * Added an optional dropdown selector in the menu bar that allows
   switching between multiple datasets.  To enable it, add a
   `datasets` array in your JBrowse configuration, and set a
   `dataset_id` in each of the `trackList.json` (or other) files that
   are optionally loaded by the dataset selector.  See the JBrowse
   Configuration Guide on the GMOD wiki for details (issue #134).

 * Added a new datastore class, `JBrowse/Store/SeqFeature/REST` that
   fetches data from any back end system that implements the simple
   REST API it uses.  See the JBrowse Configuration Guide for details
   on how to implement its REST API.  Thanks to Brett Thomas, Daniel
   Troesser, and Brad Chapman for pointing out the need for this
   (issue #227).

 * By default, JBrowse now continuously updates the browser's URL bar
   to contain a URL that will show the current JBrowse view directly.
   This is enabled by default only if JBrowse is running from the
   default index.html included in the JBrowse distribution.

 * HTMLFeatures, Alignments, and Alignments2 tracks now accept a
   `maxHeight` configuration variable specifying the maximum displayed
   height of a track in pixels.  Features that would cause the track
   to grow beyond its maximum height will not be drawn (issue #222).

 * Removed the `refSeqDropdown` configuration variable; the reference
   sequence selector is now shown for any number of reference
   sequences, with its length limited by the `refSeqSelectorMaxSize`
   variable (see next item).

 * Added support for optional `refSeqSelectorMaxSize` and
   `refSeqOrder` global configuration variables that set the maximum
   length of the reference sequence dropdown selector, and specify the
   sort order of the reference sequences in that selector,
   respectively.  One instance in which this is particularly useful is
   in displaying annotations on early-stage, incomplete genomic
   assemblies: to display the N biggest contigs in the assembly in the
   reference sequence selector dropdown, one can set `refSeqOrder` to
   `length descending`, and set `refSeqSelectorMaxSize` to N.  Thanks
   to Ignazio Carbone for pointing out the need for this. (issues #234
   and #235).

 * Fixed some bugs causing memory leaks when scrolling and zooming,
   especially on tracks with a lot of data like BAM tracks.  Thanks to
   Gustavo Cerquiera for pointing this out (issue #220).

 * HTMLFeatures tracks now accept `style->label` and
   `style->description` configuration variables variable that can be
   set to a function callback that returns a string with the feature's
   label or long description, respectively (issue #9).

 * Wiggle/XYPlot, Wiggle/Density, and FeatureCoverage tracks now
   accept function callbacks in their `style->pos_color`,
   `style->neg_color`, `style->bg_color`, and
   `style->clip_marker_color` configuration variables.  Function
   callbacks are passed two arguments: the feature object (with start
   bp, end bp, and score of the quanititative region being shown, and
   the track object (which can be used to access track configuration
   data, along with many other things).  (issue #133).

 * Wiggle/XYPlot tracks now accept an array for their `variance_band`
   argument, allowing users to set the position of the variance bands
   to show (issue #133).

 * Wiggle/XYPlot tracks now accept a `style->variance_band_color`
   configuration variable, allowing users to set the colors of the
   variance bands. The variance band color should usually be specified
   with a partial opacity.  Default is 'rgba(0,0,0,0.3)', which is
   black with 30% opacity (issue #133).

 * Added an "About JBrowse" popup dialog, which supports an
   `aboutThisBrowser` configuration stanza containing a title for the
   main browser window, and a description to be shown in a pop-up
   dialog when the title is clicked (issue #206).

 * Where possible (i.e. supported by the data store), JBrowse will now
   pop up a warning if a local data file is opened that contains no
   data for the current reference sequence (issue #178).

 * Fixed bug in which hard- and soft-clipped regions were erroneously
   counted toward the overall length of a BAM alignment (issue #229).

 * Fixed bug in which dragging the vertical scroll bar marker on the
   right side of the track pane did not behave correctly. (Julien
   Smith-Roberge, issue #223).

 * Fixed bug in which the navigation location for some reference
   sequences can get messed up when ref.start != 0, or ref.end !=
   ref.length (issue #215).

 * Fixed bug in which, when using the dynamic zooming tool
   (rubber-band zooming), some browsers (particularly Safari) would
   inaccurately display the locations of HTML-based features and
   per-basepair colored bars in sequence tracks.

 * Fixed bug in which navigating via sequence dropdown selection
   ignores previous location on selected sequence, whereas with
   navigation text box entering just a sequence name navigates to
   previous location on that sequence (if visited previously).  Thanks
   to Gregg Helt for implementing this fix (issue #216).

 * Fixed bug in which the initial default view of a previously
   unviewed reference sequencestarts at 80% centered view, but any use
   of reference sequence selection pulldown takes it to 100%.  Big
   thanks to Gregg Helt for implementing this fix (issue #217).

 * Fixed bug in which iframe popups did not display correctly in
   Internet Explorer 9.  Thanks to Steffi Geisen for pointing this out
   (issue #233).

 * Fixed a number of bugs that prevented JBrowse from running in
   Internet Explorer 7 and 8 (issue #236).

 * Improved JSON syntax error messages in server-side scripts
   (issue #214).

 * Increased the default display timeout (`blockDisplayTimeout`) on
   HTML-based features tracks from 5 seconds to 20 seconds.

 * Added a `new-plugin.pl` helper script that makes the skeleton of a
   new JBrowse plugin.

 * Added an `add-json.pl` helper script that advanced users can use to
   set arbitrary value in JSON files from the command line.

 * Fixed a bug in which the `--conf` option to `prepare-refseqs.pl`
   did not support comments in JSON conf files (issue #213).  Thanks
   to Keiran Raine for pointing this out.

 * Fixed some missing dojo/dijit nls directories in the non-dev
   release zipfile.

 * Fixed a bug with handling of timeout events in HTMLFeatures tracks.
   Thanks to Matt Henderson of KBase for pointing this out.

# Release 1.8.1     2013-02-12 12:56:24 EST5EDT

 * Added support for `cigarAttribute` and `mdAttributes` configuration
   variables to Alignments and Alignments2 tracks, allowing users to
   change which feature attribute is used for showing mismatches
   (issue #200).

 * Fixed some bugs preventing `Alignments` and `Alignments2` tracks
   from working with non-BAM data backends.

 * Added `--trackLabel` and `--key` options to `prepare-refseqs.pl`,
   allowing users to specify the sequence track's label and title.

 * Added `--seqType` option to `prepare-refseqs.pl`, allowing users to
   specify the type of sequences being formatted, usually either
   'dna', 'rna', or 'protein'.  Additionally, if --seqType is
   something over than DNA (case insensitive), "showReverseStrand" is
   set to false on the reference sequence track.

 * `prepare-refseqs.pl` now calls the track showing the reference
   sequence "Reference sequence" instead of "DNA".

 * Added a `shareURL` configuration option that accepts a JS function
   to assemble the URL that users will get when clicking the "Share"
   button or the "Full view" link in embedded mode (issue #198).

 * Fixed annoying bug in which popup feature detail boxes are
   initially scrolled all the way to the bottom.

# Release 1.8.0     2013-01-31 14:05:27 America/New_York

 * Added new "File -> Open" function that can display BAM, BigWig, and
   GFF3 files located on the user's machine, at remote URLs, or a
   mixture of both.  When opening local files, everything is done
   locally, no data is transferred to the server.

 * Added a new "SNPCoverage" track type, designed for use with BAM
   files (but which works with any features that have MD fields), that
   shows a coverage plot with a graphical representation of SNP
   distribution, and tables showing frequencies for each SNP.

 * Added a new "Alignments2" track type, which is a much faster
   implementation of the "Alignments" track type.  It is more suitable
   for very deep BAM alignments, but has a slightly different
   configuration scheme.

 * Added a flexible plugin system whereby external code can be loaded
   as part of JBrowse.  Plugin JavaScript has full access to customize
   nearly everything in JBrowse.  The plugin system is quite new, but
   many hooks are available that plugins can use to safely modify
   JBrowse's behavior, and more are on the way.  See the JBrowse wiki
   for details on how to write your own plugins.  Thanks to Gregg Helt
   and the other members of the WebApollo project for helping to drive
   development of the new plugin system.

 * JBrowse feature name indexing (`generate-names.pl`) now uses an
   all-new hash-based filesystem backend.  Although
   `generate-names.pl` now takes longer to run, it can handle much
   larger numbers of names to index, and uses much less RAM to do it.
   As a side benefit, the JBrowse location box's autocompletion
   feature is now faster and more reliable.  Thanks to Steffi Geisen
   and Volodymyr Zavidovych for pointing out the issues with name
   indexing scalability and reliability.

 * Added support in "HTMLFeatures", "Alignments", and "Alignments2"
   tracks for a `style.featureScale` configuration variable, which, if
   set, specifies a minimum zoom scale (pixels per basepair) for
   displaying features.  If zoomed out more than this (i.e. fewer
   pixels per bp), either histograms or a "too many features" message
   will be displayed.

 * Changed binning algorithm of "FeatureCoverage" tracks when zoomed
   out.  Now calculates the average base coverage in each bin, rather
   than the absolute number of features that overlap each bin.

 * "HTMLFeatures" tracks now accept a comma-separated list of field
   names in their `description` configuration variable, allowing users
   to customize which attribute(s) of a feature hold the description.

 * Added a timeout to HTMLFeatures and Alignments tracks to prevent
   data-heavy tracks (like BAM tracks with very deep coverage) from
   freezing or crashing a user's browser.

 * Improved graphical look of canvas-based tracks during zoom
   operations.  Thanks to Mitch Skinner for implementing this!

 * Fixed a bug in which the Y-axis scale for feature density
   histograms in HTMLFeatures tracks was sometimes drawn incorrectly.

 * Greatly improved speed and responsiveness of BAM data backend.

 * Fixed yet another bug that prevented display of some types of BAM files.

# Release 1.7.6     2013-01-10 01:25:58 America/New_York

 * Fixed a bug in the BAM direct-access backend that prevented some
   BAM files from being displayed.

# Release 1.7.5     2012-12-12 13:40:12 America/New_York

 * Fixed a bug in which typing a key that is bound to a global
   keyboard shortcut (currently only 't' or '?') in the location box
   would erroneously execute the action for that global shortcut.
   Thanks to Gregor Rot for pointing this out.

 * Fixed a bug in which toggling 'Show labels' in the track menu did
   not re-layout the track on the first toggling.

 * Make columns in the faceted track selector initially each be an
   equal percentage of the total width of the grid.  Thanks to Steffi
   Geisen for pointing this out.

# Release 1.7.4     2012-12-06 23:08:22 America/New_York

 * Fixed a bug preventing loading of JBrowse in some browsers.  Thanks
   to Steffi Geisen for pointing this out.

 * Fixed a bug in the BigWig data backend that prevented some BigWig
   files with large numbers of reference sequences from displaying.
   Thanks to Gregg Helt for providing sample data to help isolate
   this.

 * Fixed a bug in the BigWig data backend that prevented BigWig files
   rendering in Safari.  Thanks to Gregor Rot for his help in isolating this.

 * Worked around a bug in Safari 6 (and probably earlier) in which
   HTTP byte-range requests are erroneously cached.  Thanks to Gregor
   Rot for pointing out the Safari problems.

 * Fixed some minor styling bugs in the facet menus of the faceted
   track selector.

 * Fixed blurry edges of location trapezoid in Firefox (Eric Derohanian).

# Release 1.7.3     2012-11-28 23:29:48 America/New_York

 * Fixed several more bugs in the BAM data backend that prevented
   display of some BAM files.  Thanks to Gleb Kuznetzov for help in
   isolating these.

 * Fixed bug in display of faceted track selector in which the facet
   titles were taking up too much vertical height.  Thanks to Steffi
   Geisen for pointing this out.

 * "Alignments" tracks now parse an alignment's CIGAR string if it
   does not have an MD field, and display mismatches and skipped
   sequence regions (particularly important for RNA-seq alignments).
   Thanks to Gregg Helt for providing the sample dataset used to test
   this.

 * Added support for a `showReverseStrand` config variable to Sequence
   track that, if set to false, turns off display of the reverse
   sequence strand.

 * "Alignments" tracks now show reads with missing mate pairs with a
   red crosshatched pattern instead of with a red border.

 * Added an Apache .htaccess file to the JBrowse root directory that
   enabled CORS by default for all files under it, if AllowOverride is
   on.

 * Fixed bug in which the vertical scroll position can sometimes be
   set too far down when zooming in and out.

 * Fixed some bugs in server-side formatting code for feature tracks:
   data was recorded multiple times in JSON files in some
   circumstances.  Thanks to Volodymyr Zavidovych and Steffi Geisen
   for pointing this out.

# Release 1.7.2     2012-11-09 15:40:06 America/New_York

 * Fixed more bugs in BAM backends that failed to load some types of
   BAM files, including BAM files containing no alignments.  Thanks to
   John St. John for his assistance in isolating the problem.

# Release 1.7.1     2012-11-07 11:25:39 America/New_York

 * Fixed bug in which bars below the origin of `Wiggle/XYPlot` were
   drawn incorrectly (issue #161).  Thanks to GitHub user @makela for
   pointing this out.

 * `Wiggle/XYPlot` tracks now by default draw a horizontal line at the
   origin, and support a `style.origin_color` configuration variable
   to set its color or turn it off.

 * Fixed bug in BAM backend that caused an infinite loop and/or
   browser crash with some BAM files.  Thanks to Gleb Kuznetzov for
   pointing this out.

# Release 1.7.0     2012-11-05 19:22:17 America/New_York

 * Added a new direct-access storage driver for BAM files, removing
   the need for `bam-to-json.pl`.  This new method of BAM access is
   far superior to the old `bam-to-json.pl` in nearly every way,
   except in browser compatibility.  Like the BigWig direct access
   backend added in JBrowse 1.5.0, it is based on code from Thomas
   Down's Dalliance Genome Explorer, and works in all major browsers
   *except* Internet Explorer, because IE lacks support for the
   necessary web standards.  It may work with Internet Explorer 10,
   but this has not been tested yet.

 * Added a new `Alignments` track type designed to work seamlessly
   with BAM files.  This track type shows basepair differences and
   insertions between aligned reads and the reference, and highlights
   reads with missing mate-pairs in red.

 * Added the ability to export track data in FASTA, GFF3, bed,
   bedGraph, and Wiggle formats (issue #104).  To export data, turn on
   the track of interest, then click on its track label to bring up
   the track menu, and select "Save track data".

 * Added a new `Wiggle/Density` track type, analagous to the GBrowse
   `wiggle_density` glyph type.  Shows the Wiggle information using
   varying intensity of color (issue #66).  Renamed the `Wiggle` track
   to `Wiggle/XYPlot`, and made the old `Wiggle` track type an alias
   to `Wiggle/XYPlot`.

 * Both `Wiggle/XYPlot` and `Wiggle/Density` now support a `style ->
   bg_color` option.  Color-density plots blend the `pos_color` or
   `neg_color` into the `bg_color` in amounts that vary with the
   wiggle data, and xyplots fill the background color behind all
   points that have data present, regardless of value.  `bg_color`
   defaults to off for xy xplots, and semi-transparent gray for
   density plots.  Setting this makes it easier for users to
   distinguish at a glance between regions with no data, and regions
   with a value of 0.

 * Added a new `FeatureCoverage` track type, which shows a
   dynamically-computed XY-plot of the depth of coverage of features
   across a genome.  One good use of this track type is to provide a
   quick coverage plot directly from a BAM file.  However, since this
   track calculates coverage on the fly, it can be slow when used with
   large regions or very deep coverage.  In this case, it is
   recommended to generate a BigWig file containing the coverage data,
   and display it with a `Wiggle/XYPlot` or `Wiggle/Density` track.

 * DNA bases are now displayed with color-coded backgrounds, allowing
   basepair information to be discerned when zoomed somewhat further
   out, when base letter cannot be drawn.  Colors are also designed to
   match the base-mismatch colors used in `Alignment` tracks, enabling
   clearer SNP visualization.

 * Added a vertical line cursor and labels showing the current
   basepair position of the mouse when hovering over the scale bar, or
   when doing a rubber-band zoom (Erik Derohanian) (issue #32).

 * Added an animation to make it easier to see where in the track
   selection list a closed track has gone, when using the simple track
   selector (issue #151).

 * Information dialog boxes are now easier to dismiss: clicking
   anywhere outside of them, or pressing any key, will make them go
   away.

 * Improvements to feature track configuration:
   * Feature tracks no longer use the `style.subfeatureScale`
     configuration variable to determine whether to show subfeatures.
     Instead, subfeatures are shown if the parent feature, when shown on
     the screen, is wider than `style.minSubfeatureWidth`, which
     defaults to 6 pixels.
   * Make explicitly-configured track `labelScale`, `histScale`, and
     `descriptionScale` not be modulated by the feature density: only
     use the feature density to pick the scale defaults

 * The default feature-detail dialog box now shows more information, adding:
   * the feature's exact length
   * full details of its subfeatures

 * Added a `locationBoxLength` configuration variable that controls
   the width of the location box.  In addition, the default width of
   the location box is now also smarter.  Instead of a fixed 25
   characters, it is calculated to fit the largest location string
   that is likely to be produced, based on the length of the reference
   sequences and the length of their names.

 * Pressing SHIFT+-up/down arrow keys now cause the genome view to
   zoom in and out.  If ALT is added, it zooms further.  Thanks to
   Karsten Hokamp for the excellent suggestion.

 * Holding SHIFT while scrolling left and right with the arrow keys
   causes the view to scroll further.

 * Added a `theme` configuration variable to allow changing the
   graphical theme to something different from the default "tundra".
   However, no other themes are implemented yet.

 * Greatly sped up rendering of HTML subfeatures by caching the
   heights of subfeature HTML elements.

 * Fixed bug in which the genome view executed a double-click zoom when
   users rapidly clicked on multiple track 'close' buttons.

 * Fixed bug with the genome view scrolling in response to arrow keys
   being pressed when typing in the location box.

 * Fixed bug in which the score display in Wiggle tracks would
   sometimes flicker when moving the mouse.

# Release 1.6.5     2012-10-26 12:10:08 America/New_York

 * The location box now shows the length of the currently visible
   region in parentheses.  For example: `ctgB:1244..3566 (2.32 Kb)`.
   Thanks to Karsten Hokamp for the suggestion!

 * The arrow keys on the keyboard can now be used to pan and scroll
   around the genome view.

 * Wiggle track mouseover cursors now display the score with only 6
   significant digits, avoiding confusion over approximations
   introduced by scores being converted to IEEE floating-point numbers
   (as for BigWig files) and back to text.

 * The faceted track selector now renders any HTML that may be present
   in the track metadata by default.  To turn this off, it now accepts
   an `escapeHTMLInData` option that, if set to `true` or `1`, will
   not render the HTML, but will instead display the raw code
   (issue #145).

 * Upgraded to a more recent version of jszlib, which contains some
   important bugfixes (issue #157).

 * Fixed bug dealing with very large regions with the same value in
   canvas-based Wiggle tracks (also issue #157).

 * `prepare-refseqs.pl` now by default uses a more scalable directory
   structure for storing sequences.  This fixes problems some users
   were experiencing with large numbers of reference sequences
   (issue #139).

 * `ucsc-to-json.pl` now supports a `--primaryName` option allowing
   the users to alter which UCSC data field is displayed by JBrowse as
   the primary name of the features in a track.  Also,
   `ucsc-to-json.pl` now treats as indexable names all UCSC data
   columns called "name", "alias", or "id" followed by zero or more
   digits.  Thanks to Steffi Geisen for this suggestion.

 * Fixed "Duplicate specification" warnings coming from
   `flatfile-to-json.pl` and `remove-track.pl`.

 * Fixed bugs in which both the first few and the last few bases of a
   reference sequence were not displaying correctly in a DNA track.

# Release 1.6.4     2012-10-16 11:50:44 America/New_York

 * Improvements to the scalability of `generate-names.pl`.  Many
   thanks to Steffi Geisen for her ongoing help with this.
    * Users can now manually specify which tracks will be indexed to
      enable autocompletion and searching for their feature names in
      the JBrowse location box.
    * The lazy-trie name indexing structure now correctly handles the
      case of large numbers of features that may share the same
      name. Before, it was generating files that were too large for
      the client to handle.

 * Fixed off-by-one error in Wiggle track display code: wiggle data
   was incorrectly displayed shifted one base to the left of its
   proper position.  Thanks to Steffi Geisen for noticing this.

 * Fixed bug in which the reference-sequence selection box did not
   automatically update in all situations to reflect the current
   reference sequence.

# Release 1.6.3     2012-09-28 11:33:36 America/New_York

 * Fixed bug with shift-rubberband-zooming not working on Windows
   (issue #150) (Erik Derohanian).

 * Fixed "Can't locate JSON.pm" errors with add-track-json.pl.

 * Added a reference-sequence-selection dropdown box, similar to the
   old one, that is on by default if fewer than 30 reference
   sequences, otherwise it's off unless `refSeqDropdown: true` is set
   in the configuration (issue #138).

 * Fixed bug in which popup dialog boxes showing other websites showed
   the website in only the top portion of the dialog box.  Only
   present in some browsers (issue #149).

 * Fix coordinate display bug in feature detail popups.  The feature's
   position was being displayed in interbase coordinates, but should
   be displayed in 1-based coordinates.  Thanks to Steffi Geisen for
   pointing this out.

 * Added a `style.height` option to Wiggle tracks to control the
   track's height in pixels (issue #131) (Erik Derohanian).

 * Added support for a `style.trackLabelCss` configuration variable to
   allow customizing the appearance of the label for a particular
   track (issue #4) (Erik Derohanian).

# Release 1.6.2     2012-09-10 17:47:43 America/New_York

 * Fixed feature-layout performance problem when zoomed very far in
   on features that are much larger than the viewing window.

 * Added a default `menuTemplate` to all HTML-based features, so that
   all HTML features now have a right-click menu by default.

 * Add `css` configuration variable that allows users to specify
   either strings or URLs containing CSS to add.

 * improved `bin/ucsc-to-json.pl` error messages

 * `bin/add-track-json.pl` now replaces tracks in the target
   configuration if they have the same label.

# Release 1.6.1     2012-08-28 16:50:41 America/New_York

 * JBrowse now attempts to prevent feature labels being obscured by
   track labels by keeping the feature labels a bit further away from
   the left side of the view, if possible.

 * Fixed bug in which welcome page was not shown when JBrowse has not
   been configured yet (issue #130).

 * Fixed bug in which passing `tracklist=0` (as when running the
   browser in embedded mode) caused JBrowse to crash (issue #132).

 * Added dependency on Bio::GFF3::LowLevel::Parser 1.4, which has an
   important bugfix related to multi-location features (issue #109).
   Thanks to Victor Poten for help in isolating this problem.

# Release 1.6.0     2012-08-25 18:04:44 America/New_York

 * Added `description` capabilities to HTML-based features, similar to
   GBrowse's descriptions.  If zoomed in far enough (as defined by
   `style.descriptionScale`), adds a second line of text below the
   feature's label that shows the content's of the featur's `Note` or
   `description` attribute (issue #67).

 * Give prepare-refseqs.pl the capability to load reference sequences
   from embedded FASTA sections in GFF3 files (issue #128).

 * Configuration files can now recursively `include` eachother, and
   `tracks` sections are merged intelligently.

 * Made sequence tracks not disappear when zoomed out too far to see
   base pairs.  Instead, sequence tracks simply display lines
   suggesting that DNA would be visible at higher
   magnification. (issue #124).

 * Double-clicking track labels in the simple track selector now turns
   the track on (issue #123).

 * Fixed bug in BigWig tracks that use the "scale": "log" option: did
   not render properly when the wiggle data included 0's. This was due
   to the fact that the origin was being mapped to Infinity. Thanks to
   the [Mockler Lab](http://www.mocklerlab.org/) for the fix! (issue
   #127).

 * Fixed bug in NCList binary search code in which zero-length
   features at node boundaries would not be found (fix by Ed Lee).

 * Fixed bug in which dragging the scroll bar on the simple track
   selector can sometimes cause a drag-and-drop to erroneously begin
   (issue #89).

 * Fixed some bugs in the layout of HTML-based features in which
   features in different blocks would overlap in some circumstances.
   Under the hood, replaced the contour-based layout engine with a
   simpler, not-much-slower implementation that is more correct in the
   general case (issue #122).

 * Fixed a bug with vertical centering of strand arrows and other
   sub-elements of HTML-based features.

# Release 1.5.0     2012-08-13 15:37:27 America/New_York

 * Added a direct-access storage driver for BigWig data files, based
   on code from the Dalliance Genome Explorer by Thomas Down.  BigWig
   file access is supported now by the current versions of all major
   browsers except Internet Explorer (which is expected to work when
   version 10 is released along with Windows 8).

 * Added a `canvas`-based wiggle track implementation for quantitative
   data that, when used with the new BigWig storage backend, removes
   the need to pre-generate rendered images of wiggle data.  Its
   display is also highly configurable, with configuration options
   modeled on the GBrowse `wiggle_xyplot` glyph type
   (i.e. `Bio::Graphics::Glyph::wiggle_xyplot`).

 * Added highly configurable behavior for left-clicking and
   right-clicking features in HTML-based feature tracks.  If a
   `menuTemplate` option is specified in the track configuration,
   right-clicking a feature brings up a context menu, the items in
   which can be configured to do nearly anything, but that are easy to
   configure for the very common use case of wanting to display
   content from a certain URL.  Feature left-clicks are also
   configurable using the same mechanism.  Thanks to Alexie
   Papanicolaou and Temi Varghese for the initial implementation of
   context menus.

 * Improved the default HTML feature left-click dialog box.  It is now
   both prettier, and more comprehensive, displaying all available
   data for the feature.

 * Added the long-missing ability to render a second line of label
   text for features containing their description, which is taken from
   the feature's 'Note' or 'description' attribute, if present.  The
   description is only displayed if the track's `description`
   configuration variable is set to a true value, which is the
   default.  There is also a style.maxDescriptionLength value, that
   can be set to control how long a description can be before it is
   truncated with ellipses.  It defaults to 70 characters.

 * Added a small helper script, `add-track-json.pl` that developers
   and advanced users can use to programmatically add a block of track
   configuration JSON to an existing JBrowse configuration file.

 * Improved / fixed vertical alignment of sub-elements of HTML
   features, including subfeatures and the arrowheads that show
   strand.  All elements in a feature are now vertically centered by
   default.

# Release 1.4.2     2012-07-12 15:38:55 America/New_York

 * Restore support for histScale, subfeatureScale, and labelScale in
   --clientConfig and track configuration JSON.  Thanks to Hernán
   Bondino for pointing this out.

# Release 1.4.1     2012-07-10 14:58:34 America/New_York

 * Made displayColumns option for the faceted track selector
   case-insensitive, and interpret a column name of "Name" as meaning
   the track's key.

 * `bam-to-json.pl` now filters out alignments that are not at least
   two nucleotides in length.  Thanks to Tristan Lubinski for
   assistance.

 * Introduced limits on the sizes of cookies that can be set,
   preventing '400 bad request' errors (issue #113).

# Release 1.4.0     2012-06-14 17:43:50 America/New_York

 * Added a full-featured faceted track selector for users that have
   many (hundreds or thousands) of tracks.  This can be turned on by
   setting the `trackSelectorType` config variable to "Faceted".  See
   the JBrowse wiki for more documentation on how to use faceted track
   selection. (issue #95)

 * Removed the dropdown selector for reference sequences in favor of
   making the location box auto-complete reference sequence and
   feature names.  This makes JBrowse much more scalable to large
   numbers of reference sequences. (fixes issues #3, #60, and #101)

 * Added a vertical-scrolling marker on the right side of the track
   pane, making it much easier to discern the vertical position of the
   track display. (issue #93).

 * biodb-to-json.pl and flatfile-to-json.pl now load all available
   feature data: all attributes of features are now encoded in the
   JSON and are available for use by feature callbacks. (issue #72)

 * Feature labels now do not scroll off screen if any part of the
   feature is still visible (fixes issue #62).

 * Added jbrowse_conf.json, a default JSON-format configuration file,
   to the JBrowse root directory.  Makes it easier to get started
   with more advanced JBrowse configuration.

 * JBrowse instances now report usage statistics to the JBrowse
   developers.  This data is very important to the JBrowse project,
   since it is used to make the case to grant agencies for continuing
   to fund JBrowse development.  No research data is transmitted, the
   data collected is limited to standard Google Analytics, along with
   a count of how many tracks the JBrowse instance has, how many
   reference sequences are present, their average length, and what
   types of tracks (wiggle, feature, etc) are present.  Users can
   disable usage statistics by setting "suppressUsageStatistics: true"
   in the JBrowse configuration.

# Release 1.3.1     2012-04-19 17:55:44 America/New_York

 * Fixed memory-management bug that caused way too much RAM to be used
   by FeatureTrack loading (flatfile, bam, and biodb-to-json.pl) when
   loading with very large numbers of reference sequences.  Big thanks
   to Tristan Lubinski for help in isolating this.

 * Fixed some bugs in BAM support section of setup.sh autosetup
   script, thanks to Tristan Lubinski for help in isolating this as
   well.

 * Added an example document with an iframe running JBrowse in
   embedded mode in docs/examples/embedded_mode.html

 * flatfile-to-json.pl now loads the 'score' attribute of features in the
   JSON.

# Release 1.3.0     2012-04-13 17:04:30 America/New_York

 * Added support for "rubberband" dynamic zooming, in which users can
   click and drag to select a region to zoom to.  Dragging on any
   scale bar, or shift-dragging on the main track pane, triggers a
   dynamic zoom.

 * Correcting a long-standing oversight, wiggle data tracks and
   feature histograms now have numerical y-axis scales that show the
   numerical values of the data.

 * Server-side data-formatting scripts now support a --compress option
   to compress (gzip) feature and sequence data to conserve server
   disk space.  Using this option requires some web server
   configuration.  Under Apache, AllowOverride FileInfo (or
   AllowOverride All) must be set for the JBrowse data directories in
   order to use the included .htaccess files, and mod_headers and
   mod_setenvif must be installed and enabled.  Under nginx a
   configuration snippet like the following should be included in the
   configuration:

      location ~* "\.(json|txt)z$" {
               add_header Content-Encoding  gzip;
               gzip off;
               types { application/json jsonz; }
      }

 * flatfile-to-json.pl: now much faster and more memory-efficient,
   especially for GFF3 files.  Remember that '###' directives are very
   important to have in large GFF3 files!  Also removed nonfunctional
   --extraData switch.

 * Added ability to turn off some JBrowse UI panels via URL arguments
   to the default index.html, or via arguments to the Browser
   constructor itself.  Can dynamically turn off the navigation box,
   the overview panel, and the track list, respectively.  When all of
   these are off, and if run in an iframe, JBrowse is running in an
   "embedded mode" that looks similar to the output of GBrowse's
   gbrowse_img script, with the exception that the view in this case
   is a fully functioning, scrollable and zoomable JBrowse.  See the
   GMOD wiki (http://gmod.org/wiki/JBrowse) for more on how to set up
   embedded mode.  Thanks to Julie Moon, a co-op student working at
   OICR, for this work!

 * Improved graphical look and feel.

 * Browser support for this release:
      * Google Chrome 18                perfect
      * Google Chrome 17                perfect
      * Mozilla Firefox 11.0            perfect
      * Mozilla Firefox 10.1            perfect
      * Mozilla Firefox 10.0.2          perfect
      * Mozilla Firefox 3.6.28          nonfunctional
      * Apple Safari 5.1.5 (Lion)       perfect
      * Microsoft Internet Explorer 9   perfect
      * Microsoft Internet Explorer 8   good
      * Microsoft Internet Explorer 7   minor problems
      * Microsoft Internet Explorer 6   not tested
      * KDE Konqueror 4.7.4             nonfunctional
      * KDE Konqueror 4.5.5             nonfunctional
      * Opera (all versions)            not tested

   NOTE: Internet Explorer 6 is no longer supported by JBrowse.

 * Added an automated-setup script, setup.sh, that tries to install
   Perl prerequisites, format Volvox example data, and install Wiggle
   and BAM support (fetching samtools from SVN if necessary)
   automatically.

 * Navigating to JBrowse with missing or malformed configuration or
   data will now bring up an error page with useful messages and links
   to help documentation, instead of a blank white page.

 * JBrowse data directories now include an Apache .htaccess in their
   root directory that, if mod_headers is installed and AllowOverride
   FileInfo or AllowOverride All is enabled, will emit the proper HTTP
   headers to allow cross-origin XHR requests for the data.

 * A new "Help" link in the upper right, or pressing "?" on the
   keyboard, brings up a "JBrowse Help" dialog box with basic usage
   information and links to more help information.

 * Arrowheads indicating strandedness are now drawn inside feature
   boundaries.

 * Clicking on the overview bar or the main scale bar now centers the
   view at the clicked position.  In addition, while holding down
   shift, clicking in the main track panel will also center the view
   at that position.

 * Added bin/remove-track.pl, a script to remove a track from a
   JBrowse data directory.  Run bin/remove-track.pl -? to see its
   documentation.

 * Added build instrumentation to support a JSDoc-based system of
   developer API documentation.  This documentation is still far from
   complete.

 * Ian Davis contributed code to add a view of the reverse strand of
   the sequence in the DNA track.  Thanks Ian!

 * Fixed bug in which, for some sequence chunk sizes, the DNA bases
   would display incorrectly.

 * Added minor gridlines to the main track view.

 * Fixed a long-standing off-by-one bug where the window could not be
   scrolled to view the last base in the reference sequence.

 * Coordinates displayed in the user interface are now 1-based closed
   coordinates, which are more familiar to most users.  Previously,
   the labels displayed interbase (i.e. 0-based half-open)
   coordinates.

 * NON-BACKWARDS-COMPATIBLE improvements to the JSON format used for
   track configuration, feature data, and image data
     - initial support for a new hook system for greater
       administrator-configurability of feature display
     - support for more than one level of subfeatures

 * Miscellaneous improvements and refactoring of data-formatting Perl
   code.

 * More detailed POD-based help documentation on all scripts

 * --tracklabel options to all scripts replaced with --trackLabel.

 * New suite of integration tests, and some unit tests, for
   server-side Perl code.

 * Beginnings of a suite of Selenium-based integration tests for the
   front-end JavaScript code.

 * Support for Apple touch-based devices merged into normal
   index.html, so that the same link can be used regardless of the
   browsing platform.

 * Bug fixed in which non-stranded features do not display properly
   (a problem with the CSS styles).

========================================================

version 1.2.1, March 2011

Fixed bugs in release 1.2:

- problems with BED handling reported by Gregg Helt and Brenton Graveley

- performance regression reported by Chris Childers

- incorrect handling of names in ucsc-to-json.pl

- wig2png slowdown reported by Brenton Graveley

========================================================

version 1.2, Febrary 2011

These notes document changes since release 1.1 in September 2010.

Most of the work in this release went into making JBrowse handle large
amounts of feature data better.  Before, the amount of memory used
when processing BAM files was more than 10 times the size of the file;
now, the amount of memory required is fixed.

Other new features in this release:

- Import of UCSC database dumps.  A ucsc-to-json.pl script is now
  provided for taking database dumps from UCSC and creating a JBrowse
  instance using them.  The "genePred" and "bed" track types are
  currently supported; "psl" tracks are not yet supported.

- Touch.  Juan Aguilar's code for using JBrowse on an iOS device
  (iPhone, iPod touch, iPad) is now integrated.  As of the current
  release, users wanting to use JBrowse on those devices have to
  navigate to a separate HTML page (touch.html) rather than the
  default index.html; i.e. the code does not currently detect
  touchscreen devices automatically.

- Bug fixes. A number of bugs have also been fixed, including one that
  restricted the placement of the "data" directory, and a bug in
  wiggle rendering that caused spurious peaks or troughs at tile
  boundaries.

Known issues/limitations with this release:

- Some additional CPAN modules are now required:

    PerlIO::gzip
    Heap::Simple
    Devel::Size

- No JSON-level backward compatibility. If you are upgrading from an
  older version of JBrowse, you will have to regenerate all the JSON
  files on your server. This means wiping your jbrowse/data directory
  and re-running all server scripts (flatfile-to-json, biodb-to-json,
  wig-to-json, etc.) to regenerate your data from the original
  FASTA/GFF/BED/WIG files. We apologize for the inconvenience of this,
  but it is inevitable sometimes; we do aim to minimize the number of
  releases which are backwardly-incompatible in this way.

========================================================

version 1.1, September 2010.

These notes document JBrowse developments in the period from July 2009
(online publication of the first JBrowse paper in Genome Research, the
de facto "version 1.0") up to September 2010 (the first in a planned
series of quarterly releases).

New features in this release:

- Scalability. JBrowse can now handle very large data tracks,
including human EST/SNP tracks, or tracks of next-gen sequence
reads. Large datasets are broken into smaller chunks, so there is no
loading delay for big tracks.

- Extensibility. A Perl module (ImageTrackRenderer.pm) for creating
user-drawn image tracks is now available, based on the CPAN GD.pm
module. An example program is provided, draw-basepair-track.pl, that
uses this module to draw arcs over a sequence representing the
base-pairing interactions of RNA secondary structure.

- Bug fixes. Numerous display glitches have been fixed, including
issues with wide-screen monitors and long mostly-offscreen features.

Known issues/limitations with this release:

- No JSON-level backward compatibility. If you are upgrading from an
older version of JBrowse, you will have to regenerate all the JSON
files on your server. This means wiping your jbrowse/data directory
and re-running all server scripts (flatfile-to-json, biodb-to-json,
wig-to-json, etc.) to regenerate your data from the original
FASTA/GFF/BED/WIG files.

- Next-gen sequence display is currently restricted to the
co-ordinates of the outermost region to which a single read is
mapped. There is no support (yet) for displaying pairing between
reads, sequences of reads, alignment of read to reference sequence
(e.g. splicing), or mismatches between read and reference.

- Processing SAM/BAM next-gen sequence files takes a lot of memory
(about 500 megabytes per million features).

- Numerical (as opposed to comparative) readout of the data in Wiggle
tracks, e.g. via a y-axis label or mouseover popup, is still
unsupported.

Please visit the website for contact info

http://jbrowse.org/

