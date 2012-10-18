import time
import subprocess
from subprocess import check_call as call, PIPE;
import unittest

from jbrowse_selenium import JBrowseTest;

class AbstractVolvoxBiodbTest( JBrowseTest ):

    data_dir = 'sample_data/json/volvox'

    def setUp( self ):
        call( "rm -rf sample_data/json/volvox/", shell=True )
        call( "bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa --out sample_data/json/volvox/", shell=True )
        call( "bin/biodb-to-json.pl --conf docs/tutorial/conf_files/volvox.json --out sample_data/json/volvox/", shell=True )
        call( "bin/wig-to-json.pl --out sample_data/json/volvox/ --wig docs/tutorial/data_files/volvox_microarray.wig", shell=True )
        call( "bin/add-track-json.pl sample_data/raw/volvox/volvox_microarray.bw.conf sample_data/json/volvox/trackList.json", shell=True )
        call( "bin/add-track-json.pl sample_data/raw/volvox/volvox-sorted.bam.conf sample_data/json/volvox/trackList.json", shell=True )
        call( "bin/add-track-json.pl sample_data/raw/volvox/volvox-sorted.bam.coverage.conf sample_data/json/volvox/trackList.json", shell=True )
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

        # test context menus
        self.context_menus()

        # test dragging in and displaying the wiggle track
        self.wiggle()

        # test sequence track display
        self.sequence()

        # test that the frame usage track claims to have links to NCBI
        self.turn_on_track( 'Frame usage' )
        self.do_typed_query('ctgA:2,381..21,220')
        self.assert_element("//div[@title='search at NCBI']")

        # test bigwig
        self.bigwig()

        # test data export
        self.export()

        # test bam
        self.bam()

        self.browser.close()

    def bam( self ):
        self.do_typed_query('ctgA:18918..19070');
        self.turn_on_track('volvox-sorted.bam');
        self.turn_on_track('volvox-sorted Coverage');

        self.assert_element('//div[contains(@class,"alignment")]/span[contains(@class,"mismatch") and contains(@class,"base_c")]');
        self.assert_elements("//div[@id='track_volvox_sorted_bam_coverage']//canvas")


    def export( self ):
        self.do_typed_query('ctgA')

        trackname = 'volvox_microarray.bw'
        self.turn_on_track( trackname )
        self.export_track( trackname, 'Visible region','GFF3','View')
        time.sleep(0.4);
        self.close_dialog('export')
        self.export_track( trackname, 'Whole', 'bedGraph', 'Download' )
        self.export_track( trackname, 'Whole', 'Wiggle', 'Download' )

        self.turn_on_track( 'Example Features' )
        trackname = 'ExampleFeatures'
        self.export_track( trackname, 'Visible region','GFF3','View')
        time.sleep(0.4)
        self.close_dialog('export')
        self.export_track( trackname, 'Visible region','BED','Download')

        self.do_typed_query('ctgA:8379..31627');
        self.export_track( 'DNA', 'Visible region','FASTA','View')

        self.assert_no_js_errors();

    def bigwig( self ):
        self.turn_on_track('volvox_microarray.bw')
        self.assert_elements("//div[@id='track_volvox_microarray.bw']//canvas")
        self.assert_no_js_errors()
        self.turn_off_track('volvox_microarray.bw')

    def sequence( self ):
        self.do_typed_query( '0..80' );
        time.sleep(0.2);
        sequence_div_xpath_templ = "/html//div[contains(@class,'sequence')]//*[contains(.,'%s')]"
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

    def context_menus( self ):
        self.turn_on_track( 'Example alignments' )
        self.do_typed_query( '20147..35574' );

        # check that there is no dialog open
        self.assert_no_element("//div[@class='dijitDialogTitleBar'][contains(@title,'snippet')]");

        # get the example alignments features
        feature_elements = self.assert_elements("//div[@id='track_Alignments']//div[contains(@class,'plus-feature4')]")

        # right-click one of them
        self.actionchains() \
            .context_click(feature_elements[40]) \
            .perform()

        # wait for the context menu to generate
        time.sleep(0.7)

        self.menu_item_click( 'XHR HTML' )

        # wait for the dialog to finish fading in
        time.sleep(1.0)

        # check that the proper HTML snippet popped up in the dialog
        self.assert_element("//div[contains(@class,'dijitDialog')]//span[@class='amazingTestSnippet']")

        self.close_dialog('Random XHR')

        time.sleep(0.5) # wait for it to finish fading out

        # check that the dialog closed
        self.assert_no_element("//div[@class='dijitDialogTitleBar'][contains(@title,'Random XHR')]");


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
        xpath = "//div[@class='feature-label']//*[contains(.,'f15')]"
        # check that f15 is not already in the DOM at load time
        self.assert_no_element( xpath )

        self.do_typed_query( "f15" );
        time.sleep(0.2);

        # test that f15 appeared in the DOM (TODO: check that it's
        # actually centered in the window), and that the protein-coding
        # genes track is now selected
        label = self.assert_element( xpath )
        assert label.text == 'f15';

        self.turn_off_track('Example Features')


class VolvoxBiodbTest( AbstractVolvoxBiodbTest, unittest.TestCase ):
    pass


if __name__ == '__main__':
    import unittest
    unittest.main()

