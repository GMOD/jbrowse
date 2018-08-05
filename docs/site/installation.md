---
id: installation
title: Installation
---

# Installation

At the most basic level, setting up JBrowse consists of:

-   Placing a copy of the JBrowse directory somewhere in the web-servable part of your server's file system (often `/var/www` by default)
-   Running the JBrowse setup script to install a few server-side dependencies
-   Running one or more server-side scripts to create a directory containing a JBrowse-formatted copy of your data.

Both the JBrowse code and these data files must be in a location where the web server can serve them to users. Then, a user pointing their web browser at the appropriate URL for the index.html file in the JBrowse directory will see the JBrowse interface, including sequence and feature tracks reflecting the data source.

Reference sequence data should be added first (using `prepare-refseqs.pl`\`), followed by annotation data. Once all of annotation data has been added, use `generate-names.pl` to make the feature names searchable.

## Making a New JBrowse

0. Install build prerequisites, plus make and a C compiler. On Ubuntu, you could do this with:

` sudo apt-get install zlib1g-dev libpng-dev libgd2-noxpm-dev build-essential`

Some other things that sometimes need to be manually installed if your setup.sh is failing includes these

` sudo apt-get install libexpat-dev libxml2-dev libdb-dev`

If you need a web server you can add apache2 to the list

1. [Download JBrowse](http://jbrowse.org/install/) onto your web server.

2. Unpack JBrowse into a directory that is served by your web browser. On many systems, this defaults to `/var/www` or `/var/www/html` for apache2

`   cd /var/www/html`
`   unzip JBrowse-*.zip`

**Make sure you have permissions to write to the contents of the jbrowse/ directory you have just created.**

3. Run the automated-setup script, `./setup.sh`, which will attempt to install all of JBrowse's (modest) prerequisites for you in the `jbrowse/` directory itself. Note that `setup.sh` should not be run as root or with `sudo`.

4. Visit <http://your.machine.address/jbrowse/index.html?data=sample_data/json/volvox>. If you can see the included Volvox example data, you are ready to configure JBrowse to show your own data! The [Getting Started with JBrowse Tutorial](http://jbrowse.org/code/latest-release/docs/tutorial/) provides a very basic step-by-step guide to formatting your own data, and in-depth configuration reference information can be found on this page.

Note: if there is an error installing the perl pre-requisites, and you get an error in your setup.log such as `/home.local/username/.cpanm/build.log: No such file or directory at /loader/0x10b108f0/App/cpanminus/script.pm line 224.`

Then you can clear out your users locallib with `rm -rf ~/.cpanm` and re-run setup.sh. Only do this if you are not concerned about your personal cpanm folder in the first place. Otherwise, you can use your system's cpanm to install jbrowse pre-requisites with `cpanm .` inside the jbrowse directory.

## Upgrading an Existing JBrowse

To upgrade an existing JBrowse (1.3.0 or later) to the latest version, simply move its data directory (and `jbrowse_conf.json` if you are using it) into the directory of a newer JBrowse, and the new JBrowse will display that data.

To upgrade a 1.2.x JBrowse, copy its data directory into the new JBrowse directory, and point your browser at compat_121.html in the new JBrowse directory, instead of index.html. Or, if desired, you could simply overwrite index.html with compat_121.html.

If you are upgrading from a version of JBrowse older than 1.2.0, a fresh installation is required.


