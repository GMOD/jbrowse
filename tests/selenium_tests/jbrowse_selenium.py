import os
import time

from unittest import TestCase

from selenium                       import webdriver
from selenium.webdriver             import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions     import NoSuchElementException
from selenium.webdriver.support.ui  import Select

class JBrowseTest( TestCase ):

    base_url = "file://%s/index.html" % os.getcwd()
    data_dir = None

    ## TestCase overrides

    def setUp( self ):
        self.browser = webdriver.Firefox()
        self.browser.get(
            self.base_url
            + ( "?data="+self.data_dir if self.data_dir else "" )
        )

    def tearDown( self ):
        self.browser.close()

    ## convenience methods for us

    def assert_element( self, xpathExpression ):
        try:
            el = self.browser.find_element_by_xpath( xpathExpression )
        except NoSuchElementException:
            assert 0, ( "can't find %s" % xpathExpression )
        return el

    def assert_no_element( self, xpath ):
        try:
            self.browser.find_element_by_xpath( xpath )
            assert 0, ( "not supposed to find %s" % xpath )
        except NoSuchElementException:
            pass

    def assert_elements( self, xpathExpression ):
        try:
            el = self.browser.find_elements_by_xpath( xpathExpression )
        except NoSuchElementException:
            assert 0, ( "can't find %s" % xpathExpression )
        return el

    def assert_no_js_errors( self ):
        assert self.browser.find_element_by_xpath('/html/body') \
                      .get_attribute('JSError') == None

    def do_typed_query( self, text ):
        # Find the query box and put f15 into it and hit enter
        qbox = self.browser.find_element_by_id("location")
        qbox.clear()
        qbox.send_keys( text + Keys.RETURN )
        time.sleep( 0.2 )

    def turn_on_track( self, tracktext ):

        # find the microarray track label
        tracklabel = self.assert_element( "//div[@class='tracklist-label'][contains(.,'%s')]" % tracktext )

        # drag the track label over
        self.actionchains() \
            .move_to_element( tracklabel ) \
            .click_and_hold( None ) \
            .move_by_offset( 300, 50 ) \
            .release( None ) \
            .perform()

        self.assert_no_js_errors()

    def turn_off_track( self, tracktext ):

        # drag the track back into the track list
        track_handle = self.assert_element( "/html//div[contains(@class,'track')]//div[contains(@class,'track-label')][contains(.,'%s')]" % tracktext )
        track_list = self.assert_element( "/html//div[@id='tracksAvail']" )

        self.actionchains() \
            .drag_and_drop( track_handle, track_list ) \
            .perform()

        self.assert_no_js_errors()

    def actionchains( self ):
        return ActionChains( self.browser )

    def get_track_labels_containing( self, string ):
        return self.assert_elements( "//div[contains(@class,'track-label')][contains(.,'%s')]" % string )

    def select_refseq( self, name ):
        refseq_selector = Select( self.browser.find_element_by_id('chrom') )
        refseq_selector.select_by_value( name )

    def scroll( self ):
        move_right_button = self.browser.find_element_by_id('moveRight')
        move_right_button.click()
        time.sleep(0.5)
        move_left_button = self.browser.find_element_by_id('moveLeft')
        move_left_button.click()
        # TODO: check the outcome of this
        time.sleep(0.5)

        self.assert_no_js_errors()

        # scroll back and forth with the mouse
        self.actionchains() \
           .move_to_element( move_right_button ) \
           .move_by_offset( 0, 300 ) \
           .click_and_hold( None ) \
           .move_by_offset( 300, 0 ) \
           .release( None ) \
           .move_by_offset( -100,100 ) \
           .click_and_hold( None ) \
           .move_by_offset( -300, 0 ) \
           .release( None ) \
           .perform()

        self.assert_no_js_errors()

