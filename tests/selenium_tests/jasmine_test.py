import unittest
from jbrowse_selenium import JBrowseTest

from selenium.webdriver.support.wait   import WebDriverWait

class JasmineTest( JBrowseTest, unittest.TestCase ):

    def baseURL( self ):
        if not self.base_url:
            superbase = super( JasmineTest, self ).baseURL()
            self.base_url = superbase.replace('index.html','tests/js_tests/index.html')
        return self.base_url

    def setUp( self ):
        super( JasmineTest, self ).setUp()

    def test_jasmine( self ):
        WebDriverWait(self, 30*self.time_dilation).until(lambda self: self.does_element_exist('.symbolSummary') and not self.does_element_exist('.symbolSummary .pending'))
        self.assert_no_element('.failingAlert')
        self.assert_no_js_errors()
