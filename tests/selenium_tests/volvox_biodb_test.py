import subprocess
from subprocess import check_call as call, PIPE
import unittest
import time

from jbrowse_selenium import JBrowseTest

class AbstractVolvoxBiodbTest( JBrowseTest ):

    data_dir = 'sample_data/json/volvox'

    def setUp( self ):
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

        # test sequence track display
        self.sequence()

        # test that the frame usage track claims to have links to NCBI
        self.turn_on_track( 'HTMLFeatures - mRNAs' )
        self.do_typed_query('ctgA:2,381..21,220')
        self.assert_element("//div[contains(@title,'Search for Apple3 at NCBI')]")
        self.turn_off_track( 'HTMLFeatures - mRNAs' )

        # test bigwig
        self.bigwig()

        # test data export
        self.export()

        # test bam
        self.bam()

        # test cram
        self.cram()

        # test vcf
        self.vcf()

        # test CanvasFeatures tracks
        self.canvasfeatures()

        # test search tracks
        self.search_track()

        # test combination tracks
        self.combination()

    def canvasfeatures( self ):

        # turn on CanvasFeatures tracks and make sure they are created
        self.do_typed_query( 'Apple1' )
        self.click_search_disambiguation('CanvasFeatures','Go')
        self.turn_on_track('CanvasFeatures - Protein-coding genes')

        self.assert_elements("//div[@id='track_Genes']//canvas")
        self.assert_elements("//div[@id='track_CDS']//canvas")
        self.assert_no_js_errors()

        self.turn_off_track('CanvasFeatures - mixed')

        # test left-clicking on CanvasFeatures track
        self.do_typed_query( 'ctgA:1049..9000' )
        self.assert_no_element("//*[@class='dijitDialogTitle'][contains(text(), 'details')]")
        canvas = self.assert_element("//div[@id='track_Genes']/canvas")
        canvas.click()
        self.assert_element("//*[@class='dijitDialogTitle'][contains(text(), 'gene EDEN')]")
        self.close_dialog("gene EDEN")
        self.assert_no_element("//*[@class='dijitDialogTitle'][contains(text(), 'snippet')]")

        # test Canvas-features context menu functionality
        # right-click one of them
        self.actionchains() \
            .context_click(canvas) \
            .perform()

        self.menu_item_click("Popup with content snippet from string (feature EDEN)")
        self.assert_element("//*[@class='dijitDialogTitle'][contains(text(), 'from a JS callback')]")
        self.close_dialog('from a JS callback')

        # turn off canvasFeatures tracks so they're not cluttering everything up
        self.turn_off_track('CanvasFeatures - Protein-coding genes')

    def vcf( self ):
        self.do_typed_query('ctgA:18918..19070')
        self.turn_on_track('VCF - volvox-sorted')
        self.turn_on_track('VCF - additional')

        self.assert_elements("//div[@id='track_volvox_sorted_vcf']//canvas")
        self.assert_elements("//div[@id='track_volvox_vcf_test']//canvas")

        self.turn_off_track('VCF - volvox-sorted')
        self.turn_off_track('VCF - additional')

    def bam( self ):
        self.do_typed_query('ctgA:18918..19070')
        self.turn_on_track('volvox-sorted.bam')
        self.turn_on_track('volvox-sorted SNPs/Coverage')

        self.assert_elements("//div[@id='track_volvox_sorted_bam']//canvas")
        self.assert_elements("//div[@id='track_volvox_sorted_bam_coverage']//canvas")

        self.turn_off_track('volvox-sorted.bam')
        self.turn_off_track('volvox-sorted SNPs/Coverage')

    def cram( self ):
        self.do_typed_query('ctgA:18918..19070')
        self.turn_on_track('volvox-sorted.cram')
        self.assert_elements("//div[@id='track_volvox_sorted_cram']//canvas")
        self.turn_off_track('volvox-sorted.cram')

    def export( self ):
        self.do_typed_query('ctgA')

        self.turn_on_track( 'BigWig XY - volvox_microarray' )
        trackname = 'volvox_microarray_bw_xyplot'
        self.export_track( trackname, 'Visible region','GFF3','View')
        self.close_dialog('export')
        self.export_track( trackname, 'Whole', 'bedGraph', 'Save' )
        time.sleep( 0.5 * JBrowseTest.time_dilation )
        self.export_track( trackname, 'Whole', 'Wiggle', 'Save' )
        self.turn_off_track( 'BigWig XY - volvox_microarray' )

        self.turn_on_track( 'HTMLFeatures - Example Features' )
        trackname = 'ExampleFeatures'
        self.export_track( trackname, 'Visible region','GFF3','View')
        self.close_dialog('export')
        self.export_track( trackname, 'Visible region','BED','Save')
        self.turn_off_track( 'HTMLFeatures - Example Features' )

        self.turn_on_track( 'CanvasFeatures - transcripts' )
        trackname = 'Transcript'
        self.export_track( trackname, 'Visible region', 'GFF3', 'View')
        self.close_dialog('export')
        self.export_track( trackname, 'Visible region', 'BED', 'Save')
        self.turn_off_track( 'CanvasFeatures - transcripts' )

        self.do_typed_query('ctgA:8379..31627')
        self.export_track( 'DNA', 'Visible region','FASTA','View')
        self.assert_no_js_errors()
        self.close_dialog('export')
        self.assert_no_js_errors()


    def bigwig( self ):
        self.turn_on_track('BigWig XY - volvox_microarray')
        self.assert_elements("//div[@id='track_volvox_microarray.bw_xyplot']//canvas")
        self.assert_no_js_errors()
        self.turn_on_track('BigWig Density - volvox_microarray')
        self.assert_elements("//div[@id='track_volvox_microarray.bw_density']//canvas")
        self.assert_no_js_errors()
        self.turn_off_track('BigWig XY - volvox_microarray')
        self.turn_off_track('BigWig Density - volvox_microarray')

    def sequence( self ):
        self.do_typed_query( '0..80' )
        sequence_div_xpath_templ = "//table[contains(@class,'sequence')]//*[contains(.,'%s')]"
        sequence_div_xpath_1 = sequence_div_xpath_templ % 'aacaACGG'
        self.assert_element( sequence_div_xpath_1)
        self.turn_off_track( 'Reference sequence' )
        self.assert_no_element( sequence_div_xpath_1 )
        self.turn_on_track( 'Reference sequence' )
        self.assert_element( sequence_div_xpath_1 )
        self.do_typed_query( '1..20000')
        self.assert_no_element( sequence_div_xpath_1 )
        self.do_typed_query( 'ctgA:19961..20040')
        self.assert_element( sequence_div_xpath_templ % 'ccgcgtgtagtc' )

    def context_menus( self ):
        self.turn_on_track( 'HTMLFeatures - Features with right-click menus' )
        self.do_typed_query( '20147..35574' )

        # check that there is no dialog open
        self.assert_no_element("//*[@class='dijitDialogTitle'][contains(text(),'snippet')]")

        # get the example alignments features
        feature_elements = self.assert_elements("//div[@id='track_malformed_alignments']//div[contains(@class,'plus-feature4')]")
        time.sleep(1*JBrowseTest.time_dilation) # wait a second to make sure their click handlers are installed

        # right-click one of them
        self.actionchains() \
            .context_click(feature_elements[int(len(feature_elements)/2)]) \
            .perform()

        self.menu_item_click( 'Open popup' )

        # check that the proper HTML snippet popped up in the dialog
        self.assert_element("//div[contains(@class,'dijitDialog')]//span[@class='amazingTestSnippet']")

        self.close_dialog('Random XHR')


        # check that the dialog closed
        self.assert_no_element("//*[@class='dijitDialogTitle'][contains(text(),'Random XHR')]")
        self.turn_off_track( 'HTMLFeatures - Features with right-click menus' )

    def click( self ):
        self.turn_on_track('ChromHMM')

        self.assert_elements("//div[@id='track_ChromeHMM']//canvas")
        self.assert_no_js_errors()

        # test left-clicking on CanvasFeatures track
        self.do_typed_query( 'ctgA:20000..30000' )
        self.assert_no_element("//*[@class='featureTooltip'][contains(text(), '15_Quies')]")
        canvas = self.assert_element("//div[@id='track_ChromHMM']/canvas")
        canvas.mouseover()
        self.assert_element("//*[@class='featureTooltip'][contains(text(), '15_Quies')]")
        self.turn_off_track('ChromHMM')


    def search_f15( self ):

        # check that a f15 feature label is not yet in the DOM
        xpath = "//div[contains(@class,'feature-label')]//*[contains(.,'f15')]"
        # check that f15 is not already in the DOM at load time
        self.assert_no_element( xpath )

        self.do_typed_query( "f15" )

        # click "Go" on the first row
        self.click_search_disambiguation('HTMLFeatures','Go')

        # test that f15 appeared in the DOM (TODO: check that it's
        # actually centered in the window), and that the protein-coding
        # genes track is now selected
        assert self.assert_element(xpath).text =='f15'

        self.turn_off_track('HTMLFeatures - Example Features')

    def search_track( self ):
        self.assert_element("#dropdownbutton_file").click()
        self.assert_element("//*[contains(@class,'dijitMenuTable')]//*[contains(@class,'dijitMenuItemLabel')][contains(text(),'Add sequence search')]").click()
        self.assert_element("//div[contains(@class,'dijitDialogPaneContent')]//input[@type='text'][contains(@class,'dijitInputInner')]").send_keys( "aaaccc" )
        self.assert_element("//div[contains(@class,'dijitDialogPaneContent')]//span[contains(@class,'dijitButtonText')][text()='Search']").click()
        self.assert_element("//div[contains(@id, 'track_search_track')]//canvas")
        self.wait_for_dialog_disappearance()
        self.turn_off_track("Search reference sequence for")

    def combination( self ):
        self.assert_element("#dropdownbutton_file").click()
        self.assert_element("#menubar_combotrack_text").click()
        self.assert_element("//div[contains(@id, 'track_combination_track')]")
        self.turn_off_track("Combination Track")

class VolvoxBiodbTest( AbstractVolvoxBiodbTest, unittest.TestCase ):
    pass


if __name__ == '__main__':
    import unittest
    unittest.main()

