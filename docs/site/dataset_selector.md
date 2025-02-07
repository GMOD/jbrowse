---
id: dataset_selector
title: Dataset Selector
---

Beginning in version 1.9.0, JBrowse supports an optional dropdown dataset
selector that appears in the menu bar in the upper left corner of the JBrowse
display. The selector displays a list of dataset names based on the `datasets`
key in the JBrowse configuration. When the selector is changed, a page reload is
triggered, with the browser navigating to the URL associated with the selected
dataset.

To set which value of the dataset selector is currently selected, the
configuration variable `dataset_id` should be set to the name of the
corresponding entry in the `datasets` list.

The selector is only shown if **both** `datasets` and `dataset_id` are set in
the configuration.

## Example Dataset Switching Configuration

In a global config, like jbrowse.conf, you can add the "list of datasets"

in `jbrowse.conf`:

```
[datasets.volvox]
url  = ?data=sample_data/json/volvox
name = Volvox Example
[datasets.modencode]
url  = ?data=sample_data/json/modencode
name = MODEncode Example
[datasets.yeast]
url  = ?data=sample_data/json/yeast
name = Yeast Example
```

Then add the "dataset_id" to the tracks.conf file for your individual data
directories

in `sample_data/json/volvox/tracks.conf`:

```
   [general]
   dataset_id = volvox
```

in `sample_data/json/modencode/tracks.conf`:

```
   [general]
   dataset_id = modencode
```

in `sample_data/json/yeast/tracks.conf`:

```
   [general]
   dataset_id = yeast
```

You can see that the dataset_id corresponds to whatever is inside the
declaration, e.g. when it says [datasets.yeast], yeast is the ID.

Note that it is also possible to put the "list of datasets" in a tracks.conf
file instead of the jbrowse.conf file if you prefer to store all your configs in
track specific directories. Then you just paste the same "list of datasets" in
all your dataset directories.

For example, having this code in tracks.conf

```
   [general]
   dataset_id = fish1
   [datasets.fish1]
   name = Fish genome 1.0
   [datasets.fish2]
   name = Fish genome 2.0
```

Will populate the dataset selector with Fish 1 and 2 and display the name of
Fish 1 in the genome area. This is just in contrast to putting the datasets
configuration in jbrowse.conf and the dataset_id in the individual data
directories (e.g. all the datasets configs are copied to each data directory)
