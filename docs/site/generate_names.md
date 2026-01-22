---
id: generate-names.pl
title: generate-names.pl
---

# Name Searching and Autocompletion

The JBrowse search box auto-completes the names of features and reference
sequences that are typed into it. After loading all feature and reference
sequence data into a JBrowse instance (with `prepare-refseqs.pl`,
`flatfile-to-json.pl`, etc.), `generate-names.pl` must be run to build the
indexes used for name searching and autocompletion.

## Autocompletion Configuration

Several settings are available to customize the behavior of autocompletion. Most
users will not need to configure any of these variables.

| Option                               | Value                                                                                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autocomplete→stopPrefixes`          | Array of word-prefixes for which autocomplete will be disabled. For example, a value of `['foo']` will prevent autocompletion when the user as typed 'f', 'fo', or 'foo', but autocompletion will resume when the user types any additional characters. |
| `autocomplete→resultLimit`           | Maximum number of autocompletion results to display. Defaults to 15.                                                                                                                                                                                    |
| `autocomplete→tooManyMatchesMessage` | Message displayed in the autocompletion dropdown when more than `autocomplete→resultLimit` matches are displayed. Defaults to 'too many matches to display'.                                                                                            |

## generate-names.pl

This script builds indexes of features by _label_ (the visible name below a
feature in JBrowse) and/or by _alias_ (a secondary name that is not visible in
the web browser, but may be present in the JSON used by JBrowse).

To search for a term, type it in the autocompleting text box at the top of the
JBrowse window.

Basic syntax:

`bin/generate-names.pl [options]`

Note that generate-names.pl does not require any arguments. However, some
options are available:

| Option            | Value                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --out             | A path to the output directory (default is 'data/' in the current directory).                                                                                               |
| --verbose         | This setting causes information about the division of nodes into chunks to be printed to the screen.                                                                        |
| --hashBits        | Sets the number of bits, or the filename length. If you get the error "Error reading from name store", try manually setting --hashBits to 16.                               |
| --completionLimit | Defines the number of letters used in the auto-completion. Example: --completionLimit 0 to disable autocompletion.                                                          |
| --incremental     | Incrementally index new tracks. Fixed in version 1.11.6.                                                                                                                    |
| --tracks          | A comma separated list of tracks to index. Can be combined with other options such as --incremental and --completionLimit to only provide autocompletion on certain tracks. |
| --workdir         | Output the temporary files for names generation to a specific directory. Fixed in 1.11.6.                                                                                   |

View bin/generate-names.pl --help for more options. Note that if you are getting
404 errors for names/root.json then JBrowse is falling back to the legacy names
store (and failing) so it is likely that you need to retry generate-names.

## Indexing custom fields in GFF

By default, the Name, ID, and Alias fields, for all feature types (gene, mRNA,
CDs, exon, etc.), are indexed by generate-names.pl

If you want to index more or different custom fields, you can run
flatfile-to-json.pl (not generate-names.pl!) with --nameAttributes
"name,id,alias,gene_id" for example, then it will also load the "gene_id" field
as a name, and then you can re-run generate-names.pl and the gene_id can be
searched for.

Also note that if you have a GFF3Tabix track (which is not loaded via
flatfile-to-json.pl) then you can add a nameAttributes=name,id,alias,gene_id to
the config for example.

If you have a GFF3Tabix track, you can also select the feature types that you
want to index, by adding indexedFeatures=gene,mRNA to the config for example.
Other feature types will not be indexed.
