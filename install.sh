#!/bin/bash
done_message () {
    if( [ $? == 0 ] ); then
        echo done.
    else
        echo failed.  See install.log file for error messages.
    fi
}


echo -n "Installing Perl dependencies ... ";
( set -e;
  set -x;
  bin/cpanm -v --notest -l extlib/ --installdeps . < /dev/null
) >install.log 2>&1;
done_message;

echo
echo -n "Formatting Volvox example data ... ";
if( [ -d data/ ] ); then
    echo data/ directory already exists, skipping example data formatting.
else
    (   set -e;
        set -x;
        bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa;
        bin/biodb-to-json.pl -v --conf docs/tutorial/conf_files/volvox.json;
        bin/generate-names.pl -v;
    ) >>install.log 2>&1
fi
done_message;

echo
echo -n "Building and installing wiggle-format support (requires libpng and libpng-dev) ... ";
(
    set -e;
    if( [ ! -f bin/wig2png ] ); then
        set -x;
        cd wig2png;
        ./configure && make;
        cd ..;
    fi
    set -x;
    bin/wig-to-json.pl --wig docs/tutorial/data_files/volvox_microarray.wig;
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
        set -x;
        rm -rf samtools;
        svn co https://samtools.svn.sourceforge.net/svnroot/samtools/trunk/samtools;
        make -C samtools -j3 lib;
        export SAMTOOLS="$PWD/samtools";
        echo "samtools in env at '$SAMTOOLS'";
        cpanm -v -l extlib Bio::DB::Sam
    fi

    bin/bam-to-json.pl --bam docs/tutorial/data_files/volvox-sorted.bam --tracklabel bam_simulated --key "Simulated next-gen reads" --cssClass basic --clientConfig '{"featureCss": "background-color: #66F; height: 8px", "histCss": "background-color: #88F"}'
) >>install.log 2>&1
done_message;
