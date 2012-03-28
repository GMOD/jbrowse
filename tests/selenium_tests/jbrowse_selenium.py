import os
import time

import unittest

from selenium                       import webdriver
from selenium.webdriver             import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions     import NoSuchElementException
from selenium.webdriver.support.ui  import Select

class JBrowseTest (object):

    base_url = os.environ['JBROWSE_URL'] if 'JBROWSE_URL' in os.environ else "file://"+os.getcwd()+"/index.html"
    data_dir = None

    ## TestCase overrides

    def setUp( self ):
        self.browser = webdriver.Firefox()
        self.browser.get(
            self.base_url
            + ( "?data="+self.data_dir if self.data_dir else "" )
        )
        time.sleep(0.5)

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

    def _rubberband( self, el_xpath, start_pct, end_pct, modkey = None ):
        el = self.assert_element( el_xpath )
        start_offset = el.size['width'] * start_pct - el.size['width']/2;
        c = self.actionchains() \
            .move_to_element( el ) \
            .move_by_offset( start_offset, 0 )

        if( modkey ):
            c = c.key_down( modkey )

        c =  c \
            .click_and_hold( None ) \
            .move_by_offset( el.size['width']*(end_pct-start_pct), 0 ) \
            .release( None )

        if( modkey ):
            c = c.key_up( modkey )

        c \
            .release( None ) \
            .perform()

        self.assert_no_js_errors()

    def overview_rubberband( self, start_pct, end_pct ):
        """Executes a rubberband gesture from start_pct to end_pct on the overview bar"""
        self._rubberband( "//div[@id='overview']", start_pct, end_pct )

    # I can't get a mainscale_rubberband() working, can't find an
    # element to tell selenium to move to that will hit it.  can't
    # move to the scale itself because it's so wide.

    def trackpane_rubberband( self, start_pct, end_pct ):
        """Executes a rubberband gesture from start_pct to end_pct in the main track pane"""
        self._rubberband( "//div[contains(@class,'dragWindow')]", start_pct, end_pct, Keys.SHIFT )

    def turn_on_track( self, tracktext ):

        # find the track label
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

