---
id: faq_track_selector
title: Track selector
---

## How do I add categories to the Hierarchical data selector?

The hierarchical data selector can support multiple levels of drop down
categories. To use this, set the "category" variable on your track, and
use a "/" to represent a subcategory. Use multiple / for multiple
subcategories.

Example

```
    {
     "category": "ParentCatgory / DiseaseBAM",
     "label": "myTrack",
     "storeClass": "JBrowse/Store/SeqFeature/BAM",
     "type": "Alignments2";
    },
    {
     "category": "ParentCatgory / NonDiseaseBAM",
     "label": "myTrack2",
     "storeClass": "JBrowse/Store/SeqFeature/BAM",
     "type": "Alignments2";
    }
```

In tracks.conf
form

```
[tracks.myTrack]
category=ParentCategory / DiseaseBAM
type=Alignments2
storeClass=JBrowse/Store/SeqFeature/BAM
```

## How do I collapse categories in the Hierarchical data selector by default?

You can set the following
config

`collapseCategories=ParentCategory1/ChildCategory,ParentCategory2/ChildCategory`

etc. to your jbrowse.conf. This is a comma separated list (don't include
spaces around the slashes though). Remember, don't quote the values in
the jbrowse.conf file :)


