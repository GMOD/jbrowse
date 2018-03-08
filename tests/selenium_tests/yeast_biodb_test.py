import time
import unittest
from subprocess import check_call as call

from jbrowse_selenium import JBrowseTest

class AbstractYeastBiodbTest ( JBrowseTest ):

    data_dir = 'sample_data/json/yeast'

    def setUp( self ):
        call( "rm -rf sample_data/json/yeast/", shell=True )
        call( "bin/prepare-refseqs.pl --fasta sample_data/raw/yeast_scaffolds/chr1.fa.gz --fasta sample_data/raw/yeast_scaffolds/chr2.fa.gzip  --out sample_data/json/yeast/", shell=True )
        call( "bin/biodb-to-json.pl --conf sample_data/raw/yeast.json --out sample_data/json/yeast/", shell=True )
        call( "bin/generate-names.pl --dir sample_data/json/yeast/", shell=True )
        super( AbstractYeastBiodbTest, self ).setUp()


    def test_yeast( self ):
        # check a good browser title
        assert "chrI" in self.browser.title

        # check that we have the appropriate tracks
        genes_tracks = self.assert_elements( '//label[contains(@class,"tracklist-label")]/span[contains(.,"coding")]' )
        assert len(genes_tracks) == 1, 'actually found %d genes tracks' % len(genes_tracks)
        assert genes_tracks[0].text == 'Protein-coding genes', "first track was called %s instead of %s" % (genes_tracks[0].text, 'Protein-coding genes')

        # do a test where we search for a certain gene using the search box
        self.search_yal024c()
        self.assert_no_js_errors()

        # do a rubberband zoom in the overview
        self.overview_rubberband( 0.2, 0.5 )
        # should be no feature labels zoomed out this far
        self.assert_no_element("//div[contains(@class,'feature-label')]")
        self.assert_elements("//div[@class='track']//div[@class='minus-feature5']")
        self.overview_rubberband( 0.1, 0.11 )
        self.assert_elements("//div[@class='track']//div[@class='minus-feature5']")
        self.assert_elements("//div[contains(@class,'feature-label')]")

        # do some more rubberbanding and check that the title (which
        # says the displayed area) is changing in response to them
        t1 = self.browser.title
        self.overview_rubberband( 0.6, 0.9 )
        t2 = self.browser.title
        assert t1 != t2
        self.trackpane_rubberband( 0.1, 0.2 )
        t3 = self.browser.title
        assert t3 != t2
        assert t3 != t1

        # test scrolling, make sure we get no js errors
        self.scroll()

        # test sequence fetching
        self.sequence()

    def sequence( self ):
        self.do_typed_query( 'chrII:296318..296380' )
        if not self.is_track_on('Reference sequence'):
            self.turn_on_track( 'Reference sequence' )
        sequence_div_xpath_templ = "/html//div[contains(@class,'sequence')][contains(.,'%s')]"
        sequence_div_xpath_1 = sequence_div_xpath_templ % 'TATATGGTCTT'
        self.assert_element( sequence_div_xpath_1)
        self.turn_off_track( 'Reference sequence' )
        self.assert_no_element( sequence_div_xpath_1 )
        self.turn_on_track( 'Reference sequence' )
        self.assert_element( sequence_div_xpath_1 )
        self.do_typed_query( '1..20000')
        self.assert_no_element( sequence_div_xpath_1 )
        self.do_typed_query( 'chrI:19961..20038')
        self.assert_element( sequence_div_xpath_templ % 'AATTATAATCCTCGG' )

    def search_yal024c( self ):

        # check that a YAL024C feature label is not yet in the DOM
        yal024_label_xpath = "//div[contains(@class,'feature-label')]//div[contains(@class,'feature-name')][contains(text(),'YAL024C')]"
        self.assert_no_element( yal024_label_xpath )

        # Find the query box and put YAL024C into it and hit enter
        self.do_typed_query( 'YAL024C' )
        time.sleep(1*JBrowseTest.time_dilation) # cannot seem to figure out a positive wait for an element that works here :-(

        # test that the YAL024C label appeared in the DOM (TODO: check that it's
        # actually centered in the window), and that the protein-coding
        # genes track is now selected
        feature_labels = self.assert_elements( yal024_label_xpath )
        assert len(feature_labels) == 1, "actually %d features match" % len(feature_labels)
        assert feature_labels[0].text == 'YAL024C'

        # test that the track with YAL024C has appeared and has the correct track label
        track_labels = self.get_track_labels_containing( 'Protein-coding genes' )
        assert len(track_labels) == 1, '%d tracks displayed with that name' % len(track_labels)

        # test that the features in the track have the right classes
        self.assert_elements("//div[@class='track']//div[@class='minus-feature5']")

        # do the search again, and make sure that again, only one track is displayed
        # Find the query box and put YAL024C into it and hit enter
        self.do_typed_query( "YAL024C" )

        # test that the track with YAL024C has appeared and has the correct track label
        track_labels = self.get_track_labels_containing( 'Protein-coding genes' )
        assert len(track_labels) == 1, '%d tracks displayed with that name' % len(track_labels)

class YeastBiodbTest( AbstractYeastBiodbTest, unittest.TestCase ):
    pass
