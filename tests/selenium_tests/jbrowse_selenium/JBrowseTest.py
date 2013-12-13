import os
import time
import re

import unittest

from selenium                          import webdriver
from selenium.webdriver                import ActionChains
from selenium.webdriver.common.keys    import Keys
from selenium.webdriver.support.wait   import WebDriverWait
from selenium.common.exceptions        import NoSuchElementException
from selenium.webdriver.support.ui     import Select

import track_selectors

class JBrowseTest (object):

    data_dir = None
    base_url = None

    tracksel_type = 'Hierarchical'

    ## TestCase override - use instead of constructor
    def setUp( self ):

        self.track_selector = getattr( track_selectors, '%sTrackSelector' % self.tracksel_type )( self )

        fp = webdriver.FirefoxProfile()

        fp.set_preference("browser.download.folderList",2)
        fp.set_preference("browser.download.manager.showWhenStarting",False)
        fp.set_preference("browser.download.dir", os.getcwd())
        fp.set_preference("browser.helperApps.neverAsk.saveToDisk","application/x-bedgraph,application/x-wiggle,application/x-bed")
        self.browser = webdriver.Firefox( firefox_profile = fp )
        if self.base_url and self.data_dir: self.browser.get(self.base_url+self.data_dir)
        else: 
            base = self.baseURL()
            self.browser.get(
                base + ( '&' if base.find('?') >= 0 else '?' )
                + ( "data="+self.data_dir if self.data_dir else "" )
            )
        self.addCleanup(self.browser.quit)
        self._waits_for_load()

    def baseURL( self ):
        if not self.base_url:
            self.base_url = os.environ['JBROWSE_URL'] if 'JBROWSE_URL' in os.environ else "http://localhost/jbrowse/index.html"
        return self.base_url


    ## convenience methods for us

    def assert_element( self, expression , time=5):
        self._waits_for_element( expression, time )
        try:
            if expression.find('/') >= 0:
                el = self.browser.find_element_by_xpath( expression )
            else:
                el = self.browser.find_element_by_css_selector( expression )
        except NoSuchElementException:
            raise AssertionError ("can't find %s" %expression)
        return el

    def assert_elements( self, expression ):
        self._waits_for_elements( expression )
        try:
            if expression.find('/') >= 0:
                el = self.browser.find_elements_by_xpath( expression )
            else:
                el = self.browser.find_elements_by_css_selector( expression )
        except NoSuchElementException:
            raise AssertionError ("can't find %s" %expression)
        return el

    def assert_track( self, tracktext ):
        trackPath = "//div[contains(@class,'track-label')][contains(.,'%s')]" %tracktext
        self._waits_for_element( trackPath )
    
    def assert_no_element( self, expression ):
        self._waits_for_no_element( expression )

    def assert_no_js_errors( self ):
        assert self.browser.find_element_by_xpath('/html/body') \
                      .get_attribute('JSError') == None

    # Find the query box and put f15 into it and hit enter
    def do_typed_query( self, text ):
        qbox = self.browser.find_element_by_id("location")
        qbox.clear()
        qbox.send_keys( text )
        qbox.send_keys( Keys.RETURN )

    def _rubberband( self, el_xpath, start_pct, end_pct, modkey = None ):
        el = self.assert_element( el_xpath )
        start_offset = el.size['width'] * start_pct - el.size['width']/2
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

        c.perform()

        self.assert_no_js_errors()

    def export_track( self, track_name, region, file_format, button ):

        self.track_menu_click( track_name, 'Save')

        # test view export
        self.assert_element("//label[contains(.,'%s')]" % region ).click()
        self.assert_element("//label[contains(.,'%s')]" % file_format ).click()
        self.assert_element("//*[contains(@class,'dijitButton')]//*[contains(@class,'dijitButtonText')][contains(.,'%s')]" % button ).click()
        self.assert_no_js_errors()

    def close_dialog( self, title ):
        dialog = "//div[@class='dijitDialogTitleBar'][contains(@title,'%s')]/span[contains(@class,'dijitDialogCloseIcon')]" % title 

        self.assert_element(dialog).click()
        self.assert_no_element(dialog)
        self.assert_no_js_errors()


    def track_menu_click( self, track_name, item_name ):
        
        menuButton =  "//div[contains(@class,'track_%s')]//div[contains(@class,'track-label')]//div[contains(@class,'track-menu-button')]" \
            % re.sub( '\W', '_', track_name.lower()) 

        self.assert_element(menuButton).click()

        self.menu_item_click( item_name )

    def menu_item_click( self, text ):
        menuItem = "//div[contains(@class,'dijitMenuPopup')][not(contains(@style,'display: none'))] \
            //td[contains(@class,'dijitMenuItemLabel')][contains(.,'%s')]" % text 
        self.assert_element(menuItem).click()

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
        return self.does_element_exist( \
            "//div[contains(@class,'track-label')]/span[contains(@class,'track-label-text')][contains(.,'%s')]" % tracktext )

    def turn_on_track( self, tracktext ):
        return self.track_selector.turn_on_track( tracktext )

    def turn_off_track( self, tracktext ):
        return self.track_selector.turn_off_track( tracktext )

    def actionchains( self ):
        return ActionChains( self.browser )

    def get_track_labels_containing( self, string ):
        return self.assert_elements( "//span[contains(@class,'track-label-text')][contains(.,'%s')]" % string )

    def _waits_for_elements( self, expression ):
        WebDriverWait(self, 5).until(lambda self: self.do_elements_exist(expression))

    def _waits_for_element( self, expression, time=5 ):
        WebDriverWait(self, time).until(lambda self: self.does_element_exist(expression))

    def _waits_for_no_element( self, expression ):
        WebDriverWait(self, 5).until(lambda self: not self.does_element_exist(expression))
    
    # Wait until faceted browser has narrowed results to one track
    def wait_until_one_track(self):
        WebDriverWait(self, 5).until(lambda self: self.is_one_row())

    # Return true/false if faceted browser narrowed down to one track
    def is_one_row(self):
        return self.assert_elements("div.dojoxGridRow").__len__() == 1

    # Return true/false if element exists
    def does_element_exist (self, expression):
        try:
            if expression.find('/') >= 0:
                self.browser.find_element_by_xpath( expression )
            else:
                self.browser.find_element_by_css_selector( expression )
            return True
        except NoSuchElementException:
            return False

    # Return true/false if elements exist
    def do_elements_exist (self, expression):
        try:
            if expression.find('/') >= 0:
                self.browser.find_elements_by_xpath( expression )
            else:
                self.browser.find_elements_by_css_selector( expression )
            return True
        except NoSuchElementException:
            return False
   
    def select_refseq( self, name ):
        self.do_typed_query( name )

    def scroll( self ):
        move_right_button = self.browser.find_element_by_id('moveRight')
        move_right_button.click()
        self.waits_for_scroll(self.browser.title)
        move_left_button = self.browser.find_element_by_id('moveLeft')
        move_left_button.click()
        self.waits_for_scroll(self.browser.title)

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

    # waits for the title of the page to change, since it 
    # gets updated after the scroll animation
    def waits_for_scroll ( self, location ):
        WebDriverWait(self, 5).until(lambda self: self.browser.title != location)
    

    #Exists because onload() get trigered before JBrowse is ready
    def _waits_for_load(self):
        WebDriverWait(self, 5).until(lambda self: self.browser.current_url.find("data=") >= 0 or self.browser.current_url.find("js_tests") >= 0)
        if self.browser.current_url.find("data=nonexistent"): #account for the test for bad data
            pass
        elif self.browser.current_url.find("js_tests"): #account for jasmine tests
            pass
        else:
            # Page title is initially "JBrowse",
            # so wait for it to change
            self.waits_for_scroll("JBrowse")

