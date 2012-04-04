#!/bin/bash
done_message () {
    if [ $? == 0 ]; then
        echo done.
        if [ "x$1" != "x" ]; then
            echo $1;
        fi
    else
        echo failed.  See install.log file for error messages.
    fi
}

echo -n "Installing Perl prerequisites ... ";
( set -e;
  set -x;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null
) >install.log 2>&1;
done_message;

echo
echo -n "Formatting Volvox example data ... ";
(   set -e;
    set -x;
    rm -rf sample_data/json/volvox;
    bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa --out sample_data/json/volvox;
    bin/biodb-to-json.pl -v --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox;
    bin/generate-names.pl -v --out sample_data/json/volvox;
) >>install.log 2>&1
done_message "To see the example data, browse to http://your.jbrowse.root/index.html?data=sample_data/json/volvox.";

echo
echo -n "Building and installing wiggle format support (requires libpng and libpng-dev) ... ";
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
) >>install.log 2>&1
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
        cpanm -v -l extlib Bio::DB::Sam
    fi

    bin/bam-to-json.pl --bam docs/tutorial/data_files/volvox-sorted.bam --tracklabel bam_simulated --key "Simulated next-gen reads" --cssClass basic --clientConfig '{"featureCss": "background-color: #66F; height: 8px", "histCss": "background-color: #88F"}' --out sample_data/json/volvox;
) >>install.log 2>&1
done_message;
