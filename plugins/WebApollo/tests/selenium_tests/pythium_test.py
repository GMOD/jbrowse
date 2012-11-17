import unittest
from lib import WebApolloTest;

class PythiumTest(WebApolloTest, unittest.TestCase):

    data_dir = 'sample_data/json/volvox'

    def setUp( self ):
        # call( "rm -rf sample_data/json/volvox/", shell=True )
        # call( "bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa --out sample_data/json/volvox/", shell=True )
        # call( "bin/biodb-to-json.pl --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox/", shell=True )
        # call( "bin/wig-to-json.pl --out sample_data/json/volvox/ --wig docs/tutorial/data_files/volvox_microarray.wig", shell=True )
        # call( "bin/add-track-json.pl sample_data/raw/volvox/volvox_microarray.bw.conf sample_data/json/volvox/trackList.json", shell=True )
        # call( "bin/add-track-json.pl sample_data/raw/volvox/volvox-sorted.bam.conf sample_data/json/volvox/trackList.json", shell=True )
        # call( "bin/add-track-json.pl sample_data/raw/volvox/volvox-sorted.bam.coverage.conf sample_data/json/volvox/trackList.json", shell=True )
        # call( "bin/generate-names.pl --dir sample_data/json/volvox/", shell=True )
        super( PythiumTest, self ).setUp()


    def test_pythium( self ):
        test_ref = 'scf1117875582023';
        # select "ctgA from the dropdown
        self.select_refseq( test_ref )

        # check a good browser title
        assert test_ref in self.browser.title, "browser title is actually %s" % self.browser.title

        self.browser.close()

