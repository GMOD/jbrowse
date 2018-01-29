#!/bin/bash
done_message () {
    if [ $? == 0 ]; then
        echo " done."
        if [ "x$1" != "x" ]; then
            echo $1;
        fi
    else
        echo " failed.  See setup.log file for error messages." $2
    fi
}

function check_node(){
    node_executable=$(which node)
    npm_executable=$(which npm)
    if ! [ -x "$node_executable" ] ; then
        nodejs_executable=$(which nodejs)
        if ! [ -x "$nodejs_executable" ] ; then
            echo "No 'node' or 'nodejs' executable found, you must install 'Node JS' to install JBrowse."
            exit 1
        else
            echo "Creating an alias 'node' for 'nodejs'"
            node_executable="$nodejs_executable"
        fi
    fi
    if ! [ -x "$npm_executable" ] ; then
        echo "No 'npm' executable found, you must have a proper 'Node JS' installation to install JBrowse."
        exit 1
    fi
    NPM_VERSION=`$npm_executable -v | cut -d\. -f1`
    if [ $NPM_VERSION -lt 2 ]; then
        echo "npm version 2 or later must be installed.  Please install an updated version of node.js by following the instructions appropriate for your system https://nodejs.org/en/download/package-manager/";
        exit 1
    fi
    echo "Node installed";
}

echo > setup.log;

echo "NOTE: Legacy scripts wig-to-json.pl and bam-to-json.pl have removed from setup. Their functionality has been superseded by add-bam-track.pl and add-bw-track.pl. If you require the old versions, please use JBrowse 1.12.3 or earlier."

# if src/dojo/dojo.js exists, but that is the only file in that directory (or other directories don't exist)
# OR
# if dev we don't care
echo  -n "Installing javascript dependencies ..."
if [ -f "src/dojo/dojo.js" ] && ! [ -f "src/dojo/_firebug/firebug.js" ]; then
    echo "Detected precompiled version." ;
elif ! [ -f "src/dojo/dojo.js" ]; then
    echo "Dojo does not exist, installing" ;
    check_node;
    npm install;
fi
echo "done"


# log information about this system
echo -n "Gathering system information ..."
(
    echo '============== System information ====';
    set -x;
    lsb_release -a;
    uname -a;
    sw_vers;
    grep MemTotal /proc/meminfo;
    echo; echo;
) >>setup.log 2>&1;
echo "done"

# check Mac OS version
SUPPRESS_BIODB_TO_JSON=0

sw_vers >& /dev/null;
if [ $? -eq 0 ]; then
    product_version=`sw_vers -productVersion`;
    have_db=`perl -MConfig=myconfig -e 'print myconfig' | grep -- -ldb`
    if [[ $product_version =~ ^10.13 && x$have_db = 'x' ]]; then
        SUPPRESS_BIODB_TO_JSON=1;
        echo;
        echo ===============================================================
        echo "** MacOS High Sierra with broken system Perl detected. **";
        echo "biodb-to-json.pl does not work on MacOS High Sierra with the stock system Perl.";
        echo "The setup will not run biodb-to-json.pl for its sample data: Volvox and Yeast.";
        echo "To re-enable formatting on your High Sierra machine, install a Perl with a working BerkeleyDB."
        echo;
        echo "If you use Homebrew, an easy way to install a working Perl would be:"
        echo;
        echo "    brew install berkeley-db; brew install --build-from-source perl"
        echo;
        echo "Then delete the external perl libraries and run setup.sh again:"
        echo;
        echo "    rm -rf extlibs/; ./setup.sh"
        echo;
        echo ===============================================================
        echo;
    fi
fi

echo  -n "Installing Perl prerequisites ..."
if ! ( perl -MExtUtils::MakeMaker -e 1 >/dev/null 2>&1); then
    echo;
    echo "WARNING: Your Perl installation does not seem to include a complete set of core modules.  Attempting to cope with this, but if installation fails please make sure that at least ExtUtils::MakeMaker is installed.  For most users, the best way to do this is to use your system's package manager: apt, yum, fink, homebrew, or similar.";
fi;
( set -x;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
  set -e;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
) >>setup.log 2>&1;
done_message "" "As a first troubleshooting step, make sure development libraries and header files for GD, Zlib, and libpng are installed and try again.";

echo
echo -n "Formatting Volvox example data ...";
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
    cat docs/tutorial/data_files/volvox_microarray.bw.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox_sine.bw.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox-sorted.bam.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox-sorted.bam.coverage.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox-paired.bam.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox.vcf.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox_fromconfig.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox.gff3.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox.gtf.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox.sort.gff3.gz.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox.bw.gff3.gz.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/volvox.sort.bed.gz.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/bookmarks.conf >> sample_data/json/volvox/tracks.conf
    bin/add-json.pl '{ "dataset_id": "volvox", "include": [ "../../raw/volvox/functions.conf" ] }' sample_data/json/volvox/trackList.json
    bin/add-json.pl '{ "dataset_id": "volvox", "plugins": [ "NeatHTMLFeatures","NeatCanvasFeatures","HideTrackLabels" ] }' sample_data/json/volvox/trackList.json
    bin/flatfile-to-json.pl --bed docs/tutorial/data_files/volvox_segment.bed --out sample_data/json/volvox --trackLabel ChromHMM --trackType CanvasFeatures --clientConfig '{"color": "{chromHMM}", "strandArrow": false}' --config '{"displayMode": "collapsed", "enableCollapsedMouseover": true, "category": "Miscellaneous" }';
    bin/generate-names.pl --safeMode -v --out sample_data/json/volvox;

    # also recreate some symlinks used by tests and such
    if [ -d sample_data/json/modencode ]; then
            mkdir -p sample_data/json/modencode/tracks;
            ln -sf ../../volvox/tracks/volvox_microarray.wig sample_data/json/modencode/tracks/volvox_microarray.wig;
    fi;
    mkdir -p sample_data/raw;
    if [ ! -e sample_data/raw/volvox ]; then
        ln -s ../../docs/tutorial/data_files sample_data/raw/volvox;
    fi;
    ln -sf ../../docs/tutorial/conf_files/volvox.json sample_data/raw/;

    touch sample_data/json/volvox/successfully_run;

) >>setup.log 2>&1
done_message "To see the volvox example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/volvox.";

echo
echo -n "Formatting Yeast example data ...";
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
) >>setup.log 2>&1
done_message "To see the yeast example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/yeast.";
