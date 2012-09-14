rm -rf json;
mkdir -p json/;
../bin/prepare-refseqs.pl --fasta contig1234.fa --out json;
../bin/biodb-to-json.pl --conf test_conf.json --out json;
../bin/generate-names.pl --out json/;
