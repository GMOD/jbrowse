# JBrowseDesktop

JBrowseDesktop is an Electron distribution of the typical JBrowse codebase that allows the user to easily run JBrowse as a desktop application.

The full functionality is available in JBrowseDesktop and no web server is needed to run it, simply launch the executable (.app or .exe file)


## Use cases


### Open an existing JBrowse data directory

If you have a data directory from an existing JBrowse distribution that has been prepared with the prepare-refseqs.pl and flatfile-to-json.pl type pipelines, you can open it in the application as normal

### Prepare a new JBrowse data directory

If you want to prepare a new data directory with the JBrowse perl scripts, you can install the JBrowse perl scripts from github automatically with "cpanm" (aka cpanminus).

    cpanm https://github.com/GMOD/jbrowse.git

This will automatically install the JBrowse perl scripts such as flatfile-to-json.pl and prepare-refseqs.pl. It can be useful to "build up" a data directory so that your contents can be saved, and so that you can edit the config files for your custom purposes


### Open data files in the application

JBrowse does not necessarily need to be prepared with a data directory in the first place, and can quickly open your genome and associated data.

Example:

- Load FASTA (and FASTA index file)
- Load BAM (and the BAM index file)
- Load VCF (bgzipped with tabix index)
- Load GFF (bgzipped with tabix index)
- Load BW (bgzipped with tabix index)

Then you can "save" your config file with the share button. Many functionalities can be unlocked through the callbacks and editing in the config that are not yet integrated into the desktop interface, so manual editing of the config files is still useful!










    