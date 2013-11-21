import os
import unittest
import re
from volvox_biodb_test import AbstractVolvoxBiodbTest

class VolvoxBiodbTest121 ( AbstractVolvoxBiodbTest, unittest.TestCase ):

    data_dir = 'tests/data/volvox_formatted_1_2_1/'

    def setUp( self ):
        # skip calling VolvoxBiodbTest's setUp, cause we are not
        # actually running any formatting
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

    def baseURL( self ):
        if not self.base_url:
            self.base_url = re.sub('[^/]+$','compat_121.html',super( AbstractVolvoxBiodbTest, self ).baseURL() )
        return self.base_url

