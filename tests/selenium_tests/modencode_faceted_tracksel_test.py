import unittest
import time
from subprocess import check_call as call

from jbrowse_selenium import JBrowseTest

class AbstractModEncodeFacetedTest ( JBrowseTest ):

    tracksel_type = 'Faceted'
    data_dir = 'sample_data/json/modencode'

    def test_faceted( self ):
        self.turn_on_track( 'fly/Dm_CAGE_HYB' )
        
        assert self.is_track_on( '5-prime-UTR;Y cn bw sp;Mixed Embryos 0-24 hr;CAGE'  ), 'track should be on now'

class ModEncodeFacetedTest ( AbstractModEncodeFacetedTest, unittest.TestCase  ):
    pass
