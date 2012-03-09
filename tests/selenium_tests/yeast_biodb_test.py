import unittest
from subprocess import check_call as call

from jbrowse_selenium import JBrowseTest

class YeastBiodbTest ( JBrowseTest, unittest.TestCase ):

    data_dir = 'sample_data/json/yeast'

    def setUp( self ):
        call( "rm -rf sample_data/json/yeast/", shell=True )
        call( "bin/prepare-refseqs.pl --fasta sample_data/raw/yeast_scaffolds/chr1.fa.gz --fasta sample_data/raw/yeast_scaffolds/chr2.fa.gzip  --out sample_data/json/yeast/", shell=True )
        call( "bin/biodb-to-json.pl --conf sample_data/raw/yeast.json --out sample_data/json/yeast/", shell=True )
        call( "bin/generate-names.pl --dir sample_data/json/yeast/", shell=True )
        super( YeastBiodbTest, self ).setUp()


    def test_yeast( self ):
        # check a good browser title
        assert "chrI" in self.browser.title

        # check that we have the appropriate tracks
        genes_tracks = self.assert_elements( '//div[@class="tracklist-label"][contains(.,"coding")]' )
        assert len(genes_tracks) == 1, 'actually found %d genes tracks' % len(genes_tracks)
        assert genes_tracks[0].text == 'Protein-coding genes', "first track was called %s instead of %s" % (genes_tracks[0].text, 'Protein-coding genes')

        # do a test where we search for a certain gene using the search box
        self.search_yal024c()

        self.assert_no_js_errors()

        # test scrolling, make sure we get no js errors
        self.scroll()

        pass;

    def search_yal024c( self ):

        # check that a YAL024C feature label is not yet in the DOM
        yal024_xpath = "//div[@class='feature-label'][contains(.,'YAL024C')]"
        self.assert_no_element( yal024_xpath )

        # Find the query box and put YAL024C into it and hit enter
        self.do_typed_query( 'YAL024C' )

        # test that YAL024C appeared in the DOM (TODO: check that it's
        # actually centered in the window), and that the protein-coding
        # genes track is now selected
        feature_labels = self.assert_elements( yal024_xpath )
        assert feature_labels[0].text == 'YAL024C'
        assert len(feature_labels) == 1, "actually %d features match" % len(feature_labels)

        # test that the track with YAL024C has appeared and has the correct track label
        track_labels = self.get_track_labels_containing( 'Protein-coding genes' )
        assert len(track_labels) == 1, '%d tracks displayed with that name' % len(track_labels)

        # do the search again, and make sure that again, only one track is displayed
        # Find the query box and put YAL024C into it and hit enter
        self.do_typed_query( "YAL024C" )

        # test that the track with YAL024C has appeared and has the correct track label
        track_labels = self.get_track_labels_containing( 'Protein-coding genes' )
        assert len(track_labels) == 1, '%d tracks displayed with that name' % len(track_labels)

