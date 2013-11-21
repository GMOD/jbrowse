import unittest
from jbrowse_selenium import JBrowseTest

class WelcomePageTest( JBrowseTest, unittest.TestCase ):

    data_dir = 'nonexistent'

    def test_volvox( self ):
        self.assert_element('//div[contains(@class,"fatal_error")]/h1')
