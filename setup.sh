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

echo > setup.log;

# log information about this system
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

echo -n "Installing Perl prerequisites ..."
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
    bin/add-track-json.pl docs/tutorial/data_files/volvox_microarray.bw.conf sample_data/json/volvox/trackList.json
    bin/add-track-json.pl docs/tutorial/data_files/volvox_sine.bw.conf sample_data/json/volvox/trackList.json
    bin/add-track-json.pl docs/tutorial/data_files/volvox-sorted.bam.conf sample_data/json/volvox/trackList.json
    bin/add-track-json.pl docs/tutorial/data_files/volvox-sorted.bam.coverage.conf sample_data/json/volvox/trackList.json
    bin/add-track-json.pl docs/tutorial/data_files/volvox.vcf.conf sample_data/json/volvox/trackList.json
    bin/add-json.pl '{ "dataset_id": "volvox" }' sample_data/json/volvox/trackList.json
    bin/generate-names.pl -v --out sample_data/json/volvox;

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

) >>setup.log 2>&1
done_message "To see the volvox example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/volvox.";

echo
echo -n "Formatting Yeast example data ...";
(   set -e;
    set -x;

    # format volvox
    rm -rf sample_data/json/yeast/;
    bin/prepare-refseqs.pl --fasta sample_data/raw/yeast_scaffolds/chr1.fa.gz --fasta sample_data/raw/yeast_scaffolds/chr2.fa.gzip  --out sample_data/json/yeast/;
    bin/biodb-to-json.pl --conf sample_data/raw/yeast.json --out sample_data/json/yeast/;
    bin/add-json.pl '{ "dataset_id": "yeast" }' sample_data/json/yeast/trackList.json
    bin/generate-names.pl --dir sample_data/json/yeast/;
) >>setup.log 2>&1
done_message "To see the yeast example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/yeast.";

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
    bin/wig-to-json.pl --key 'Image - volvox_microarray.wig' --wig docs/tutorial/data_files/volvox_microarray.wig --out sample_data/json/volvox;
) >>setup.log 2>&1
done_message "" "Make sure libpng development libraries and header files are installed.";
