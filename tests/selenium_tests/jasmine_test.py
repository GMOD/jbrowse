import unittest
from jbrowse_selenium import JBrowseTest

class JasmineTest( JBrowseTest ):

    data_dir = 'tests/js_tests/index.html'
    base_url = 'http://localhost/'
    def setUp( self ):
        super( JasmineTest, self ).setUp()

    def test_jasmine( self ):
        self.assert_element(".duration", 30)
        self.assert_no_element(".alert")
        self.assert_no_js_errors()

class Jasmine_Test( JasmineTest, unittest.TestCase ):
    pass
