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
    rm -rf sample_data/json/volvox;
    bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa --out sample_data/json/volvox;
    bin/biodb-to-json.pl -v --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox;
    bin/add-track-json.pl docs/tutorial/data_files/volvox_microarray.bw.conf sample_data/json/volvox/trackList.json
    bin/add-track-json.pl docs/tutorial/data_files/volvox_sine.bw.conf sample_data/json/volvox/trackList.json
    bin/add-track-json.pl docs/tutorial/data_files/volvox-sorted.bam.conf sample_data/json/volvox/trackList.json
    bin/add-track-json.pl docs/tutorial/data_files/volvox-sorted.bam.coverage.conf sample_data/json/volvox/trackList.json
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
done_message "To see the example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/volvox.";

echo
echo -n "Building and installing wiggle format support ...";
(
    set -e;
    if( [ ! -f bin/wig2png ] ); then
        set -x;
        cd src/wig2png;
        ./configure && make;
        cd ../..;
    fi
    set -x;
    bin/wig-to-json.pl --wig docs/tutorial/data_files/volvox_microarray.wig --out sample_data/json/volvox;
) >>setup.log 2>&1
done_message "" "Make sure libpng development libraries and header files are installed.";

echo
echo -n "Building and installing BAM format support (samtools and Bio::DB::Sam) ...";
(
    set -e;

    # try to install Bio::DB::Sam if necessary
    if( perl -Iextlib/lib/perl5 -Mlocal::lib=extlib -MBio::DB::Sam -e 1 ); then
        echo Bio::DB::Sam already installed.
    else
        if( [ "x$SAMTOOLS" == "x" ] ); then
            set -x;

            if [ ! -e samtools ]; then
                svn export https://samtools.svn.sourceforge.net/svnroot/samtools/trunk/samtools;
                perl -i -pe 's/^CFLAGS=\s*/CFLAGS=-fPIC / unless /\b-fPIC\b/' samtools/Makefile;
            fi;
            make -C samtools -j3 lib;
            export SAMTOOLS="$PWD/samtools";
        fi
        echo "samtools in env at '$SAMTOOLS'";
        set +e;
        bin/cpanm -v -l extlib Bio::DB::Sam;
        set -e;
        bin/cpanm -v -l extlib Bio::DB::Sam;
    fi

    bin/bam-to-json.pl --bam docs/tutorial/data_files/volvox-sorted.bam --tracklabel bam_simulated --key "Simulated next-gen reads" --cssClass basic --clientConfig '{"featureCss": "background-color: #66F; height: 8px", "histCss": "background-color: #88F"}' --out sample_data/json/volvox;
) >>setup.log 2>&1;
done_message "" "Try reading the Bio-SamTools troubleshooting guide at https://metacpan.org/source/LDS/Bio-SamTools-1.33/README for help getting Bio::DB::Sam installed.";
