import subprocess
from subprocess import check_call as call, PIPE
import unittest
import time

from jbrowse_selenium import JBrowseTest

class AbstractVolvoxBiodbTest( JBrowseTest ):

    data_dir = 'tests/data/names/rest_test'

    def setUp( self ):
        call( "rm -rf sample_data/json/volvox/", shell=True )
        call( "bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa --out sample_data/json/volvox/", shell=True )
        call( "bin/biodb-to-json.pl --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox/", shell=True )
        call( "bin/wig-to-json.pl --out sample_data/json/volvox/ --wig docs/tutorial/data_files/volvox_microarray.wig", shell=True )
        call( "bin/add-track-json.pl sample_data/raw/volvox/volvox_microarray.bw.conf sample_data/json/volvox/trackList.json", shell=True )
        call( "bin/add-track-json.pl sample_data/raw/volvox/volvox-sorted.bam.conf sample_data/json/volvox/trackList.json", shell=True )
        call( "bin/add-track-json.pl sample_data/raw/volvox/volvox-sorted.bam.coverage.conf sample_data/json/volvox/trackList.json", shell=True )
        call( "bin/add-track-json.pl docs/tutorial/data_files/volvox.vcf.conf sample_data/json/volvox/trackList.json", shell=True )
        call( "bin/generate-names.pl --dir sample_data/json/volvox/", shell=True )
        call( "cat sample_data/json/volvox/trackList.json", shell=True )
        super( AbstractVolvoxBiodbTest, self ).setUp()

    def test_volvox( self ):
 
        # select "ctgA from the dropdown
        self.select_refseq( 'ctgA' )

        # check a good browser title
        assert "ctgA" in self.browser.title, "browser title is actually %s" % self.browser.title
        self.assert_no_js_errors()

        # test scrolling, make sure we get no js errors
        self.scroll()
        
        # test sequence track display
        self.sequence()

    def sequence( self ):
        self.do_typed_query( '0..80' )
        sequence_div_xpath_templ = "/html//div[contains(@class,'sequence')]//*[contains(.,'%s')]"
        sequence_div_xpath_1 = sequence_div_xpath_templ % 'aacaACGG'
        self.assert_element( sequence_div_xpath_1)
        self.turn_off_track( 'Reference sequence' )
        self.assert_no_element( sequence_div_xpath_1 )
        self.turn_on_track( 'Reference sequence' )
        self.assert_element( sequence_div_xpath_1 )
        self.do_typed_query( '1..20000')
        self.assert_no_element( sequence_div_xpath_1 )
        self.do_typed_query( 'ctgA:19961..20047')
        self.assert_element( sequence_div_xpath_templ % 'ccgcgtgtagtc' )

class VolvoxBiodbTest( AbstractVolvoxBiodbTest, unittest.TestCase ):
    pass


if __name__ == '__main__':
    import unittest
    unittest.main()

