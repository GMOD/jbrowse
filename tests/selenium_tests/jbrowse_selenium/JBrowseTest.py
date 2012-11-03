import os
import time
import re

import unittest

from selenium                       import webdriver
from selenium.webdriver             import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions     import NoSuchElementException
from selenium.webdriver.support.ui  import Select

import track_selectors

class JBrowseTest (object):

    data_dir = None
    base_url = None

    tracksel_type = 'Simple'

    ## TestCase override - use instead of constructor
    def setUp( self ):

        self.track_selector = getattr( track_selectors, '%sTrackSelector' % self.tracksel_type )( self )


        fp = webdriver.FirefoxProfile()

        fp.set_preference("browser.download.folderList",2)
        fp.set_preference("browser.download.manager.showWhenStarting",False)
        fp.set_preference("browser.download.dir", os.getcwd())
        fp.set_preference("browser.helperApps.neverAsk.saveToDisk","application/x-bedgraph,application/x-wiggle,application/x-bed")

        self.browser = webdriver.Firefox( firefox_profile = fp )

        base = self.baseURL()
        self.browser.get(
            base + ( '&' if base.find('?') >= 0 else '?' )
            + ( "data="+self.data_dir if self.data_dir else "" )
        )
        time.sleep(0.5)  # give selenium some time to get its head on straight

    def baseURL( self ):
        if not self.base_url:
            self.base_url = os.environ['JBROWSE_URL'] if 'JBROWSE_URL' in os.environ else "file://"+os.getcwd()+"/index.html"
        return self.base_url


    ## convenience methods for us

    def maybe_find_element_by_xpath( self, xpathExpression ):
        try:
            el = self.browser.find_element_by_xpath( xpathExpression )
        except NoSuchElementException:
            return None
        return el

    def assert_element( self, expression ):
        try:
            if expression.find('/') >= 0:
                el = self.browser.find_element_by_xpath( expression )
            else:
                el = self.browser.find_element_by_css_selector( expression )
        except NoSuchElementException:
            assert 0, ( "can't find %s" % expression )
        return el

    def assert_elements( self, expression ):
        try:
            if expression.find('/') >= 0:
                el = self.browser.find_elements_by_xpath( expression )
            else:
                el = self.browser.find_elements_by_css_selector( expression )
        except NoSuchElementException:
            assert 0, ( "can't find %s" % expression )
        return el


    def assert_no_element( self, expression ):
        try:
            if expression.find('/') >= 0:
                el = self.browser.find_element_by_xpath( expression )
            else:
                el = self.browser.find_element_by_css_selector( expression )
            assert 0, ( "not supposed to find %s" % expression )
        except NoSuchElementException:
            pass

    def assert_no_js_errors( self ):
        assert self.browser.find_element_by_xpath('/html/body') \
                      .get_attribute('JSError') == None

    def do_typed_query( self, text ):
        # Find the query box and put f15 into it and hit enter
        qbox = self.browser.find_element_by_id("location")
        qbox.send_keys( Keys.BACK_SPACE * 40 )
        time.sleep( 0.05 )
        for i in range( len(text) ):
            qbox.send_keys( text[i] )
        qbox.send_keys( Keys.RETURN );
        time.sleep( 0.3 )

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

    def export_track( self, track_name, region, format, button ):
        track_name = re.sub( '\W', '_', track_name.lower() )

        self.track_menu_click( track_name, 'Save')

        # test view export
        self.assert_element("//label[contains(.,'%s')]" % region ).click()
        self.assert_element("//label[contains(.,'%s')]" % format ).click()
        self.assert_element("//*[contains(@class,'dijitButton')]//*[contains(@class,'dijitButtonText')][contains(.,'%s')]" % button ).click()
        self.assert_no_js_errors()

    def close_dialog( self, title ):
        self.assert_element("//div[@class='dijitDialogTitleBar'][contains(@title,'%s')]/span[contains(@class,'dijitDialogCloseIcon')]" % title ).click()
        self.assert_no_js_errors()


    def track_menu_click( self, track_name, item_name ):
        self.assert_element( "//div[contains(@class,'track_%s')]//div[contains(@class,'track-label')]//div[contains(@class,'track-menu-button')]" % re.sub( '\W', '_', track_name ) ) \
            .click()

        time.sleep(0.4)

        self.menu_item_click( item_name )

    def menu_item_click( self, text ):
        self.assert_element( "//div[contains(@class,'dijitMenuPopup')][not(contains(@style,'display: none'))]//td[contains(@class,'dijitMenuItemLabel')][contains(.,'%s')]" % text ) \
            .click()

    def overview_rubberband( self, start_pct, end_pct ):
        """Executes a rubberband gesture from start_pct to end_pct on the overview bar"""
        self._rubberband( "//div[@id='overview']", start_pct, end_pct )

    # I can't get a mainscale_rubberband() working, can't find an
    # element to tell selenium to move to that will hit it.  can't
    # move to the scale itself because it's so wide.

    def trackpane_rubberband( self, start_pct, end_pct ):
        """Executes a rubberband gesture from start_pct to end_pct in the main track pane"""
        self._rubberband( "//div[contains(@class,'dragWindow')]", start_pct, end_pct, Keys.SHIFT )

    def is_track_on( self, tracktext ):
        # find the track label in the track pane
        return not self.maybe_find_element_by_xpath( "//div[contains(@class,'dragWindow')]//div[@class='track-label'][contains(.,'%s')]" % tracktext )

    def turn_on_track( self, tracktext ):
        return self.track_selector.turn_on_track( tracktext )

    def turn_off_track( self, tracktext ):
        return self.track_selector.turn_off_track( tracktext )

    def actionchains( self ):
        return ActionChains( self.browser )

    def get_track_labels_containing( self, string ):
        return self.assert_elements( "//div[contains(@class,'track-label')][contains(.,'%s')]" % string )

    def select_refseq( self, name ):
        self.do_typed_query( name );

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

