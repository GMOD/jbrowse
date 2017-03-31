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

legacy_message () {
   echo "Legacy scripts wig-to-json.pl and bam-to-json.pl have removed from setup. Their functionality has been superseded by add-bam-track.pl and add-bw-track.pl. If you require the old versions, run 'setup.sh legacy'."
 }



echo > setup.log;

LEGACY_INSTALL=0
if [ $# -gt 1 ] ; then
  echo "USAGE: ./setup.sh [legacy]"
  echo -e "\tTakes one optional argument, presence triggers legacy software install."
  exit 1
fi
if [[ ($# -eq 1) && ("$1" = "legacy") ]] ; then
  LEGACY_INSTALL=1
else
  legacy_message
fi

# if src/dojo/dojo.js exists, but that is the only file in that directory (or other directories don't exist)
# OR
# if dev we don't care
echo  -n "Installing javascript dependencies ..."
if [ -f "src/dojo/dojo.js" ] && ! [ -f "src/dojo/_firebug/firebug.js" ]; then
    echo "Detected precompiled version." ;
elif ! [ -f "src/dojo/dojo.js" ]; then
    echo "Dojo does not exist, installing" ;
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
    system_profiler;
    grep MemTotal /proc/meminfo;
    echo; echo;
) >>setup.log 2>&1;
echo "done"

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
    bin/biodb-to-json.pl -v --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox;
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
    cat docs/tutorial/data_files/volvox.sort.bed.gz.conf >> sample_data/json/volvox/tracks.conf
    cat docs/tutorial/data_files/bookmarks.conf >> sample_data/json/volvox/tracks.conf
    bin/add-json.pl '{ "dataset_id": "volvox", "include": [ "../../raw/volvox/functions.conf" ] }' sample_data/json/volvox/trackList.json
    bin/add-json.pl '{ "dataset_id": "volvox", "plugins": [ "NeatHTMLFeatures","NeatCanvasFeatures","HideTrackLabels" ] }' sample_data/json/volvox/trackList.json
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
    bin/biodb-to-json.pl --conf sample_data/raw/yeast.json --out sample_data/json/yeast/;
    bin/add-json.pl '{ "dataset_id": "yeast" }' sample_data/json/yeast/trackList.json
    bin/add-json.pl '{ "dataset_id": "yeast",  "plugins": [ "NeatHTMLFeatures","NeatCanvasFeatures","HideTrackLabels" ] }' sample_data/json/yeast/trackList.json
    bin/generate-names.pl --dir sample_data/json/yeast/;
) >>setup.log 2>&1
done_message "To see the yeast example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/yeast.";

if [ $LEGACY_INSTALL -eq 0 ] ; then
   legacy_message
   exit 0
fi

echo
echo -n "Building and installing legacy wiggle format support (superseded by BigWig tracks) ...";
(
    set -e;
    if( [ ! -f bin/wig2png ] ); then
        set -x;
        cd src/wig2png;
        ./configure && make;
        cd ../..;
    fi
    set -x;
    bin/wig-to-json.pl --key 'Image - volvox_microarray.wig' --wig docs/tutorial/data_files/volvox_microarray.wig --category "Pre-generated images" --out sample_data/json/volvox;
) >>setup.log 2>&1
done_message "" "If you really need wig-to-json.pl (most users don't), make sure libpng development libraries and header files are installed and try running setup.sh again.";

echo
echo -n "Building and installing legacy bam-to-json.pl support (superseded by direct BAM tracks) ...";
(
    set -e;

    # try to install Bio::DB::Sam if necessary
    if( perl -Iextlib/lib/perl5 -Mlocal::lib=extlib -MBio::DB::Sam -e 1 ); then
        echo Bio::DB::Sam already installed.
    else
        if( [ "x$SAMTOOLS" == "x" ] ); then
            set -x;

            if [ ! -e samtools-0.1.20 ]; then
                if hash curl 2>/dev/null; then
                    curl -L https://github.com/samtools/samtools/archive/0.1.20.zip -o samtools-0.1.20.zip;
                else
                    wget -O samtools-0.1.20.zip https://github.com/samtools/samtools/archive/0.1.20.zip;
                fi
                unzip -o samtools-0.1.20.zip;
                rm samtools-0.1.20.zip;
                perl -i -pe 's/^CFLAGS=\s*/CFLAGS=-fPIC / unless /\b-fPIC\b/' samtools-0.1.20/Makefile;
            fi;
            make -C samtools-0.1.20 -j3 lib;
            export SAMTOOLS="$PWD/samtools-0.1.20";
        fi
        echo "samtools in env at '$SAMTOOLS'";
        set +e;
        bin/cpanm -v -l extlib Bio::DB::Sam@1.41;
        set -e;
        bin/cpanm -v -l extlib Bio::DB::Sam@1.41;
    fi

    bin/bam-to-json.pl --bam docs/tutorial/data_files/volvox-sorted.bam --tracklabel bam_simulated --key "Legacy BAM - volvox-sorted.bam" --cssClass basic --metadata '{"category": "BAM"}' --clientConfig '{"featureCss": "background-color: #66F; height: 8px", "histCss": "background-color: #88F"}' --out sample_data/json/volvox;
) >>setup.log 2>&1;
done_message "" "If you really need bam-to-json.pl (most users don't), try reading the Bio-SamTools troubleshooting guide at https://metacpan.org/source/LDS/Bio-SamTools-1.33/README for help getting Bio::DB::Sam installed.";
