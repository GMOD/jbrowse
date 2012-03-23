import time
from subprocess import check_call as call
import unittest

from jbrowse_selenium import JBrowseTest;

class AbstractVolvoxBiodbTest( JBrowseTest ):

    data_dir = 'sample_data/json/volvox'

    def setUp( self ):
        call( "rm -rf sample_data/json/volvox/", shell=True )
        call( "bin/prepare-refseqs.pl --fasta sample_data/raw/volvox/volvox.fa --out sample_data/json/volvox/", shell=True )
        call( "bin/biodb-to-json.pl --conf sample_data/raw/volvox.json --out sample_data/json/volvox/", shell=True )
        call( "bin/wig-to-json.pl --out sample_data/json/volvox/ --wig sample_data/raw/volvox/volvox_microarray.wig", shell=True )
        call( "bin/generate-names.pl --dir sample_data/json/volvox/", shell=True )
        super( AbstractVolvoxBiodbTest, self ).setUp()

    def test_volvox( self ):
        # select "ctgA from the dropdown
        self.select_refseq( 'ctgA' )

        # check a good browser title
        assert "ctgA" in self.browser.title, "browser title is actually %s" % self.browser.title

        # do a test where we search for a certain gene using the search box
        self.search_f15()

        self.assert_no_js_errors()

        # test scrolling, make sure we get no js errors
        self.scroll()

        # test dragging in and displaying the wiggle track
        self.wiggle()

        # test sequence track display
        self.sequence()

        # test that the alignments track has links to example.com
        self.turn_on_track( 'alignments' );
        self.do_typed_query('ctgA:39520..45364');
        self.assert_element("//a[@href='http://example.com/seg14-42056-42474']");

        self.browser.close()

    def sequence( self ):
        self.do_typed_query( '0..80' );
        sequence_div_xpath_templ = "/html//div[contains(@class,'sequence')][contains(.,'%s')]"
        sequence_div_xpath_1 = sequence_div_xpath_templ % 'aacaACGG';
        self.assert_element( sequence_div_xpath_1)
        self.turn_off_track( 'DNA' );
        self.assert_no_element( sequence_div_xpath_1 )
        self.turn_on_track( 'DNA' );
        self.assert_element( sequence_div_xpath_1 )
        self.do_typed_query( '1..20000');
        self.assert_no_element( sequence_div_xpath_1 )
        self.do_typed_query( 'ctgA:19961..20047');
        self.assert_element( sequence_div_xpath_templ % 'ccgcgtgtagtc' )

    def wiggle( self ):

        self.turn_on_track( 'microarray' )

        # see that we have an image track png in the DOM now
        imagetrack_xpath =  "//div[contains(@class,'track')]//img[@class='image-track']";
        imagetrack_png = self.assert_element( imagetrack_xpath )

        self.turn_off_track( 'microarray' )
        # check that imagetrack png is not still in the DOM after the
        # track is turned off
        self.assert_no_element( imagetrack_xpath )

    def search_f15( self ):

        # check that a f15 feature label is not yet in the DOM
        xpath = "//div[@class='feature-label'][contains(.,'f15')]"
        # check that f15 is not already in the DOM at load time
        self.assert_no_element( xpath )

        self.do_typed_query( "f15" );

        # test that f15 appeared in the DOM (TODO: check that it's
        # actually centered in the window), and that the protein-coding
        # genes track is now selected
        label = self.assert_element( xpath )
        assert label.text == 'f15';


class VolvoxBiodbTest( AbstractVolvoxBiodbTest, unittest.TestCase ):
    pass


if __name__ == '__main__':
    import unittest
    unittest.main()

