import time

from selenium.webdriver             import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions     import NoSuchElementException

def assert_element( browser, xpathExpression ):
    try:
        el = browser.find_element_by_xpath( xpathExpression )
    except NoSuchElementException:
        assert 0, ( "can't find %s" % xpathExpression )
    return el

def assert_no_element( browser, xpath ):
    try:
        browser.find_element_by_xpath( xpath )
        assert 0, ( "not supposed to find %s" % xpath )
    except NoSuchElementException:
        pass

def assert_elements( browser, xpathExpression ):
    try:
        el = browser.find_elements_by_xpath( xpathExpression )
    except NoSuchElementException:
        assert 0, ( "can't find %s" % xpathExpression )
    return el

def assert_no_js_errors(browser):
    assert browser.find_element_by_xpath('/html/body').get_attribute('JSError') == None

def do_typed_query( browser, text ):
    # Find the query box and put f15 into it and hit enter
    qbox = browser.find_element_by_id("location")
    qbox.clear()
    qbox.send_keys( text + Keys.RETURN )
    time.sleep( 0.2 )


def turn_on_track( browser, tracktext ):

    # find the microarray track label
    tracklabel = assert_element( browser, "//div[@class='tracklist-label'][contains(.,'%s')]" % tracktext )

    # drag the track label over
    ActionChains( browser ) \
        .move_to_element( tracklabel ) \
        .click_and_hold( None ) \
        .move_by_offset( 300, 50 ) \
        .release( None ) \
        .perform()

    assert_no_js_errors(browser)

def turn_off_track( browser, tracktext ):

    # drag the track back into the track list
    track_handle = assert_element( browser, "/html//div[contains(@class,'track')]//div[contains(@class,'track-label')][contains(.,'%s')]" % tracktext )
    track_list = assert_element( browser, "/html//div[@id='tracksAvail']" )

    ActionChains( browser ) \
        .drag_and_drop( track_handle, track_list ) \
        .perform()

    assert_no_js_errors( browser )

def get_track_labels_containing( browser, string ):
    track_labels = assert_elements( browser, "//div[contains(@class,'track-label')][contains(.,'%s')]" % string )
    return track_labels

