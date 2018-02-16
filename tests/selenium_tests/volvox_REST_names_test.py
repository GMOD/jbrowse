import threading
import unittest
from selenium.webdriver.support.wait   import WebDriverWait
from selenium.webdriver.common.keys    import Keys
import name_server

from jbrowse_selenium import JBrowseTest

class VolvoxRestTest( JBrowseTest ):

    data_dir = 'tests/data/names_REST&tracks=Genes,CDS'

    def setUp( self ):
        # Does not bother formatting, assumes it's been done through ./setup
        # The volvox_biodb_test.py test can be used to test formatting

        t = threading.Thread(target=name_server.start_server, name='Backend')
        t.daemon = True
        t.start()

        super( VolvoxRestTest, self ).setUp()

    def test_volvox( self ):

        # select "ctgA from the dropdown
        self.select_refseq( 'ctgA' )

        # check a good browser title
        assert "ctgA" in self.browser.title, "browser title is actually %s" % self.browser.title
        self.assert_no_js_errors()

        # test scrolling, make sure we get no js errors
        self.scroll()

        # test sequence track display
        self.scroll_around()

        # test autocompletion
        self.autocomplete()

        self.assert_no_js_errors()

    def scroll_around( self ):
        self.do_typed_query( '0..80' )
        self.do_typed_query( '1..20000')
        self.do_typed_query( 'ctgA:19961..20047')

    def autocomplete( self ):
        self._do_typed_query_and_wait("App", 2)
        self._do_typed_query_and_wait("EDE", 1)
        loc = self.browser.title
        self.browser.find_element_by_id("location").send_keys( Keys.RETURN )
        self.waits_for_scroll(loc)

        self._do_typed_query_and_wait("Apple1", 1)
        loc = self.browser.title
        self.browser.find_element_by_id("location").send_keys( Keys.RETURN )
        self.waits_for_scroll(loc)

    # Do a search and wait for a specific number of results
    def _do_typed_query_and_wait( self, text, num_of_results ):
        qbox = self.browser.find_element_by_id("location")
        qbox.clear()
        qbox.send_keys( text )
        WebDriverWait(self, 5*self.time_dilation).until(lambda self: self.is_right_num_of_entries (num_of_results))

    # Compares number of returned results against expected results
    def is_right_num_of_entries( self, num ):
        return len(self.browser.find_elements_by_css_selector("#location_popup>*"))-2 == num


class VolvoxBiodbTest( VolvoxRestTest, unittest.TestCase ):
    pass


if __name__ == '__main__':
    import unittest
    unittest.main()

