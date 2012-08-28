import unittest
from volvox_biodb_test import AbstractVolvoxBiodbTest

class EmbeddedModeTest( AbstractVolvoxBiodbTest, unittest.TestCase ):
    def baseURL( self ):
        if not self.base_url:
            self.base_url = super( AbstractVolvoxBiodbTest, self ).baseURL() + '?nav=0&tracklist=0&overview=0&tracks=volvox_microarray.bw'
        return self.base_url

    def test_volvox( self ):
        self.assert_no_js_errors()
