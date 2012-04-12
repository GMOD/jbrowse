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

    def baseURL( self ):
        if not self.base_url:
            self.base_url = re.sub('[^/]+$','compat_121.html',super( AbstractVolvoxBiodbTest, self ).baseURL() )
        return self.base_url

