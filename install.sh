#!/bin/bash
set -e;

echo Installing Perl dependencies ...;
set -x;
bin/cpanm -l extlib/ --installdeps .;
set +x;

echo
echo Formatting Volvox example data ...;
set -x;
bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa;
bin/biodb-to-json.pl --conf docs/tutorial/conf_files/volvox.json;
bin/generate-names.pl -v;
set +x;

echo
echo Building wig2png \(requires libpng and libpng-dev\) ...;
set -x;
(
    cd wig2png && ./configure && make && cd ..;
)
bin/wig-to-json.pl --wig docs/tutorial/data_files/volvox_microarray.wig;

