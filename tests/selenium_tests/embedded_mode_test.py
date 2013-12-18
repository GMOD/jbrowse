import unittest
from volvox_biodb_test import AbstractVolvoxBiodbTest

class EmbeddedModeTest( AbstractVolvoxBiodbTest, unittest.TestCase ):
    def baseURL( self ):
        if not self.base_url:
            self.base_url = super( AbstractVolvoxBiodbTest, self ).baseURL() + '?nav=0&tracklist=0&overview=0&tracks=volvox_microarray_bw_density%2Cvolvox_microarray_bw_xyplot&loc=ctgA'
        return self.base_url

    def test_volvox( self ):
        self.assert_track("BigWig Density")
        self.assert_track("BigWig XY")
        self.assert_no_js_errors()
