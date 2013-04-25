import os
import sys
from subprocess import check_call as call

import unittest

sys.path.append( "tests/selenium_tests/" )
from yeast_biodb_test import AbstractYeastBiodbTest

class CompressedYeastBiodbTest( AbstractYeastBiodbTest, unittest.TestCase ):
    def setUp( self ):
        call( "rm -rf sample_data/json/yeast/", shell=True )
        call( "bin/prepare-refseqs.pl --compress --fasta sample_data/raw/yeast_scaffolds/chr1.fa.gz --fasta sample_data/raw/yeast_scaffolds/chr2.fa.gzip  --out sample_data/json/yeast/", shell=True )
        call( "bin/biodb-to-json.pl --compress --conf sample_data/raw/yeast.json --out sample_data/json/yeast/", shell=True )
        call( "bin/generate-names.pl --dir sample_data/json/yeast/", shell=True )
        super( AbstractYeastBiodbTest, self ).setUp()

