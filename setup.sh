#!/bin/bash
done_message () {
    if [ $? == 0 ]; then
        echo done.
        if [ "x$1" != "x" ]; then
            echo $1;
        fi
    else
        echo failed.  See setup.log file for error messages.
    fi
}

echo -n "Installing Perl prerequisites (may require development libraries for GD, Zlib, and libpng) ... ";
if ! ( perl -MExtUtils::MakeMaker -e 1 >/dev/null 2>&1); then
    echo;
    echo "WARNING: Your Perl installation does not seem to include a complete set of core modules.  Attempting to cope with this, but if installation fails please make sure that at least ExtUtils::MakeMaker is installed.  For most users, the best way to do this is to use your system's package manager: apt, yum, fink, homebrew, or similar.";
fi;
( set -x;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
  set -e;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null;
) >setup.log 2>&1;
done_message;

echo
echo -n "Formatting Volvox example data ... ";
(   set -e;
    set -x;
    rm -rf sample_data/json/volvox;
    bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa --out sample_data/json/volvox;
    bin/biodb-to-json.pl -v --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox;
    bin/generate-names.pl -v --out sample_data/json/volvox;
) >>setup.log 2>&1
done_message "To see the example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/volvox.";

echo
echo -n "Building and installing wiggle format support (requires libpng and libpng-devel) ... ";
(
    set -e;
    if( [ ! -f bin/wig2png ] ); then
        set -x;
        cd wig2png;
        ./configure && make;
        cd ..;
    fi
    set -x;
    bin/wig-to-json.pl --wig docs/tutorial/data_files/volvox_microarray.wig --out sample_data/json/volvox;
) >>setup.log 2>&1
done_message;

echo
echo -n "Building and installing BAM format support ...";
(
    set -e;

    # try to install samtools
    if( perl -Iextlib/ -Mlocal::lib=extlib -MBio::DB::Sam -e 1 ); then
        echo Bio::DB::Sam already installed.
    else
        if( [ "x$SAMTOOLS" == "x" ] ); then
            set -x;
            rm -rf samtools;
            svn co https://samtools.svn.sourceforge.net/svnroot/samtools/trunk/samtools;
            make -C samtools -j3 lib;
            export SAMTOOLS="$PWD/samtools";
        fi
        echo "samtools in env at '$SAMTOOLS'";
        set +e;
        cpanm -v -l extlib Bio::DB::Sam;
        set -e;
        cpanm -v -l extlib Bio::DB::Sam;
    fi

    bin/bam-to-json.pl --bam docs/tutorial/data_files/volvox-sorted.bam --tracklabel bam_simulated --key "Simulated next-gen reads" --cssClass basic --clientConfig '{"featureCss": "background-color: #66F; height: 8px", "histCss": "background-color: #88F"}' --out sample_data/json/volvox;
) >>setup.log 2>&1
done_message;
