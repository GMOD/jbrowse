import unittest
from jbrowse_selenium import JBrowseTest

class JasmineTest( JBrowseTest ):

    def baseURL( self ):
        if not self.base_url:
            superbase = super( JasmineTest, self ).baseURL()
            self.base_url = superbase.replace('index.html','tests/js_tests/index.html')
        return self.base_url

    def setUp( self ):
        super( JasmineTest, self ).setUp()

    def test_jasmine( self ):
        self.assert_element(".duration", 30)
        self.assert_no_element(".failingAlert")
        self.assert_no_js_errors()

class Jasmine_Test( JasmineTest, unittest.TestCase ):
    pass
