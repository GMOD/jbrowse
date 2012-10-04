import unittest
import time
from subprocess import check_call as call

from jbrowse_selenium import JBrowseTest

class AbstractModEncodeFacetedTest ( JBrowseTest ):

    tracksel_type = 'Faceted'
    data_dir = 'sample_data/json/modencode'

    def test_faceted( self ):
        time.sleep(1.0)

        self.turn_on_track( 'fly/Dm_CAGE_HYB' );

        self.browser.close();

class ModEncodeFacetedTest ( AbstractModEncodeFacetedTest, unittest.TestCase  ):
    pass
