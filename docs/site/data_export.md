---
id: data_export
title: Data export
---

Starting with version 1.7.0, JBrowse users can export track data in a variety of
formats for either specific regions, or for entire reference sequences. Export
functionality can also be limited and disabled on a per-track basis using the
configuration variables listed below.

## Data Formats

Current supported export data formats are:

- FASTA (sequence tracks)
- GFF3 (all tracks)
- bed (feature and alignment tracks)
- bedGraph (wiggle tracks)
- Wiggle (wiggle tracks)

## Export Configuration

Each track in JBrowse that can export data supports the following configuration
variables.

| Option                              | Value                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `noExport`                          | If true, disable all data export functionality for this track. Default false.                                                                     |
| `maxExportSpan`                     | Maximum size of the a region, in bp, that can be exported from this track. Default 500 Kb.                                                        |
| `maxExportFeatures`                 | Maximum number of features that can be exported from this track. If "Save track" is unexpectedly greyed out, inspect this setting. Default: 50000 |
| `maxFeatureSizeForUnderlyingRefSeq` | Maximum length of sequence to be displayed in the popup boxes. Default: 250kb                                                                     |
