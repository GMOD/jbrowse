#!/bin/bash

# check the exit status of the command, and print the last bit of the log if it fails
done_message () {
    if [ $? == 0 ]; then
        log_echo " done."
        if [ "x$1" != "x" ]; then
            echo $1;
        fi
    else
        echo " failed.  See setup.log file for error messages." $2;
        if [[ "x$3" != "x" ]]; then
            echo "setup cannot continue, aborting.";
            tail -200 setup.log;
            exit 1;
        fi
    fi
}

# echoes both to the console, and to setup.log
# adds extra carriage returns in setup.log for readability.
log_echo () {
    echo $@
    echo >> setup.log
    echo $@ >> setup.log
    echo >> setup.log
}

check_node () {
    set +e
    node_executable=$(which node)
    npm_executable=$(which npm)
    if ! [ -x "$node_executable" ] ; then
        nodejs_executable=$(which nodejs)
        if ! [ -x "$nodejs_executable" ] ; then
            echo "No 'node' executable found. JBrowse expects node version 6 or later. Please install an updated version of node.js by following the instructions appropriate for your system https://nodejs.org/en/download/package-manager/";
            exit 1
        else
            echo "Creating an alias 'node' for 'nodejs'"
            node_executable="$nodejs_executable"
        fi
    fi
    set -e
    if ! [ -x "$npm_executable" ] ; then
        echo "No 'npm' executable found. JBrowse expects npm version 3 or later. Please install an updated version of node.js by following the instructions appropriate for your system https://nodejs.org/en/download/package-manager/";
        exit 1
    fi
    NODE_VERSION=`$node_executable -v`
    NODE_MAJOR_VERSION=`$node_executable -v | cut -dv -f2 | cut -d. -f1`
    NODE_MINOR_VERSION=`$node_executable -v | cut -d. -f1`
    NPM_VERSION=`$npm_executable -v`
    NPM_MAJOR_VERSION=`$npm_executable -v | cut -d. -f1`
    if [[ $NODE_MAJOR_VERSION -lt 6 ]]; then
        echo "node $NODE_VERSION found, but node version 6 or later must be installed.  Please install an updated version of node.js by following the instructions appropriate for your system https://nodejs.org/en/download/package-manager/";
        exit 1
    fi
    if [[ $NPM_MAJOR_VERSION -lt 3 ]]; then
        echo "npm $NPM_VERSION found, but npm version 3 or later must be installed.  Please install an updated version of node.js by following the instructions appropriate for your system https://nodejs.org/en/download/package-manager/";
        exit 1
    fi
    echo "Node $NODE_VERSION installed at $node_executable with npm $NPM_VERSION";
}

# we are starting a new setup. clear the log file
rm -f setup.log

# log information about this system
log_echo -n "Gathering system information ..."
(
    echo '============== System information ====';
    set -x;
    lsb_release -a;
    uname -a;
    sw_vers;
    grep MemTotal /proc/meminfo;
    echo; echo;
) >>setup.log 2>&1;
done_message "" ""

# check Mac OS version
SUPPRESS_BIODB_TO_JSON=0

sw_vers >& /dev/null;
if [ $? -eq 0 ]; then
    product_version=`sw_vers -productVersion`;
    have_db=`perl -MConfig=myconfig -e 'print myconfig' | grep -- -ldb`
    if [[ $product_version =~ ^10.13 && x$have_db = 'x' ]]; then
        SUPPRESS_BIODB_TO_JSON=1;
        log_echo;
        log_echo ===============================================================
        log_echo "** MacOS High Sierra with broken system Perl detected. **";
        log_echo "biodb-to-json.pl does not work on MacOS High Sierra with the stock system Perl.";
        log_echo "The setup will not run biodb-to-json.pl for its sample data: Volvox and Yeast.";
        log_echo "To re-enable formatting on your High Sierra machine, install a Perl with a working BerkeleyDB."
        log_echo;
        log_echo "If you use Homebrew, an easy way to install a working Perl would be:"
        log_echo;
        log_echo "    brew install berkeley-db; brew install --build-from-source perl"
        log_echo;
        log_echo "Then delete the external perl libraries and run setup.sh again:"
        log_echo;
        log_echo "    rm -rf extlibs/; ./setup.sh"
        log_echo;
        log_echo ===============================================================
        log_echo;
    fi
fi

log_echo "NOTE: Legacy scripts wig-to-json.pl and bam-to-json.pl have been removed from setup. Their functionality has been superseded by add-bam-track.pl and add-bw-track.pl. If you require the old versions, please use JBrowse 1.12.3 or earlier."

# if we are running in a development build, then run npm install and run the webpack build.
if [ -f "src/JBrowse/Browser.js" ]; then
    log_echo -n "Installing node.js dependencies and building with webpack ..."
    (
        set -e
        check_node
        [[ -f node_modules/.bin/yarn ]] || npm install yarn
        node_modules/.bin/yarn install
        node_modules/.bin/yarn build
    ) >>setup.log 2>&1;
    done_message "" "" "FAILURE NOT ALLOWED"
else
    log_echo "Minimal release, skipping node and Webpack build"
fi

log_echo  -n "Installing Perl prerequisites ..."
if ! ( perl -MExtUtils::MakeMaker -e 1 >/dev/null 2>&1); then
    log_echo;
    log_echo "WARNING: Your Perl installation does not seem to include a complete set of core modules.  Attempting to cope with this, but if installation fails please make sure that at least ExtUtils::MakeMaker is installed.  For most users, the best way to do this is to use your system's package manager: apt, yum, fink, homebrew, or similar.";
fi;
( set -x;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
  set -e;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
) >>setup.log 2>&1;
done_message "" "As a first troubleshooting step, make sure development libraries and header files for GD, Zlib, and libpng are installed and try again.";

log_echo
log_echo -n "Formatting Volvox example data ...";
(   set -e;
    set -x;

    # format volvox
    rm -rf sample_data/json/volvox;
    bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa --out sample_data/json/volvox;
    if [ $SUPPRESS_BIODB_TO_JSON -eq 1 ]; then
        echo "Not running biodb-to-json.pl for Volvox";
    else
        bin/biodb-to-json.pl -v --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox;
    fi

    cat \
        docs/tutorial/data_files/volvox_microarray.bw.conf \
        docs/tutorial/data_files/volvox_sine.bw.conf \
        docs/tutorial/data_files/volvox-sorted.bam.conf \
        docs/tutorial/data_files/volvox-sorted.bam.coverage.conf \
        docs/tutorial/data_files/volvox-paired.bam.conf \
        docs/tutorial/data_files/volvox.vcf.conf \
        docs/tutorial/data_files/volvox_fromconfig.conf \
        docs/tutorial/data_files/volvox.gff3.conf \
        docs/tutorial/data_files/volvox.gtf.conf \
        docs/tutorial/data_files/volvox.sort.gff3.gz.conf \
        docs/tutorial/data_files/volvox.sort.gff3.gz.htmlfeatures.conf \
        docs/tutorial/data_files/volvox.sort.bed.gz.conf \
        docs/tutorial/data_files/gvcf.vcf.gz.conf \
        docs/tutorial/data_files/bookmarks.conf \
        docs/tutorial/data_files/volvox.subsubparts.gff3.conf \
        docs/tutorial/data_files/volvox-long-reads.fastq.sorted.bam.conf \
        docs/tutorial/data_files/volvox-long-reads.fastq.sorted.cram.conf \
        docs/tutorial/data_files/volvox.bb.conf >> sample_data/json/volvox/tracks.conf \
        docs/tutorial/data_files/volvox-sorted.cram.conf >> sample_data/json/volvox/tracks.conf \
    >> sample_data/json/volvox/tracks.conf

    bin/add-json.pl '{ "dataset_id": "volvox", "include": [ "../../raw/volvox/functions.conf" ] }' sample_data/json/volvox/trackList.json
    bin/add-json.pl '{ "dataset_id": "volvox", "plugins": [ "HideTrackLabels", "NeatCanvasFeatures", "NeatHTMLFeatures" ] }' sample_data/json/volvox/trackList.json
    bin/flatfile-to-json.pl --bed docs/tutorial/data_files/volvox_segment.bed --out sample_data/json/volvox --trackLabel ChromHMM --trackType CanvasFeatures --clientConfig '{"color": "{chromHMM}", "strandArrow": false}' --config '{"displayMode": "collapsed", "enableCollapsedMouseover": true, "category": "Miscellaneous" }';
    bin/generate-names.pl --safeMode -v --out sample_data/json/volvox;

    mkdir -p sample_data/raw;
    if [ ! -e sample_data/raw/volvox ]; then
        ln -s ../../docs/tutorial/data_files sample_data/raw/volvox;
    fi;
    ln -sf ../../docs/tutorial/conf_files/volvox.json sample_data/raw/;

    touch sample_data/json/volvox/successfully_run;

) >>setup.log 2>&1
done_message "To see the volvox example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/volvox.";

log_echo
log_echo -n "Formatting Yeast example data ...";
(   set -e;
    set -x;

    # format volvox
    rm -rf sample_data/json/yeast/;
    bin/prepare-refseqs.pl --fasta sample_data/raw/yeast_scaffolds/chr1.fa.gz --fasta sample_data/raw/yeast_scaffolds/chr2.fa.gzip  --out sample_data/json/yeast/;
    gunzip -c sample_data/raw/yeast_scaffolds/chr1.fa.gz sample_data/raw/yeast_scaffolds/chr2.fa.gzip > sample_data/raw/yeast_chr1+2/yeast.fa;
    if [ $SUPPRESS_BIODB_TO_JSON -eq 1 ]; then
        echo "Not running biodb-to-json.pl for Yeast";
    else
        bin/biodb-to-json.pl --conf sample_data/raw/yeast.json --out sample_data/json/yeast/;
    fi
    bin/add-json.pl '{ "dataset_id": "yeast" }' sample_data/json/yeast/trackList.json
    bin/add-json.pl '{ "dataset_id": "yeast",  "plugins": [ "NeatHTMLFeatures","NeatCanvasFeatures","HideTrackLabels" ] }' sample_data/json/yeast/trackList.json
    bin/generate-names.pl --dir sample_data/json/yeast/;
) >>setup.log 2>&1;
done_message "To see the yeast example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/yeast.";
