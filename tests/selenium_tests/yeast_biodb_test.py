from selenium import webdriver
from selenium.webdriver import ActionChains
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
from subprocess import check_call as call
import os
import time

def test_yeast():
    format_yeast()
    browser = webdriver.Firefox() # Get local session of firefox
    browser.get("file://%s/test_harness.html?data=sample_data/json/yeast" % os.getcwd() ) # Load page

    # check a good browser title
    assert "chrI" in browser.title

    # check that we have the appropriate tracks
    genes_tracks = assert_elements( browser, '//div[@class="tracklist-label"]' )
    assert len(genes_tracks) == 1, 'actually found %d genes tracks' % len(genes_tracks)
    assert genes_tracks[0].text == 'Protein-coding genes', "first track was called %s instead of %s" % (genes_tracks[0].text, 'Protein-coding genes')

    # do a test where we search for a certain gene using the search box
    search_yal024c(browser)

    assert_no_js_errors(browser)

    # test scrolling, make sure we get no js errors
    scroll(browser)

    browser.close()
    pass;

def scroll(browser):
    move_right_button = browser.find_element_by_id('moveRight')
    move_right_button.click()
    time.sleep(0.5)
    move_left_button = browser.find_element_by_id('moveLeft')
    move_left_button.click()
    # TODO: check the outcome of this
    time.sleep(0.5)

    assert_no_js_errors(browser)

    action_chains = ActionChains(browser)
    # scroll back and forth with the mouse
    action_chains \
       .move_to_element( move_right_button ) \
       .move_by_offset( 0, 300 ) \
       .click_and_hold( None ) \
       .move_by_offset( 500, 0 ) \
       .release( None ) \
       .move_by_offset( -100,100 ) \
       .click_and_hold( None ) \
       .move_by_offset( -600, 0 ) \
       .release( None ) \
       .perform()

    assert_no_js_errors(browser)

def assert_no_js_errors(browser):
    assert browser.find_element_by_xpath('/html/body').get_attribute('JSError') == None

def search_yal024c(browser):

    # check that a YAL024C feature label is not yet in the DOM
    yal024_xpath = "//div[@class='feature-label'][contains(.,'YAL024C')]"
    try:
        browser.find_element_by_xpath( yal024_xpath )
        assert 0, ( "YAL024C is already in the DOM at load time, something is wrong" )
    except NoSuchElementException:
        pass

    # Find the query box and put YAL024C into it and hit enter
    qbox = browser.find_element_by_id("location")
    qbox.clear()
    qbox.send_keys( "YAL024C" + Keys.RETURN )
    time.sleep( 0.2 )

    # test that YAL024C appeared in the DOM (TODO: check that it's
    # actually centered in the window), and that the protein-coding
    # genes track is now selected
    feature_labels = assert_elements( browser, yal024_xpath )
    assert feature_labels[0].text == 'YAL024C'
    assert len(feature_labels) == 1, "actually %d features match" % len(feature_labels)

    # test that the track with YAL024C has appeared and has the correct track label
    track_labels = get_track_labels_containing( browser, 'Protein-coding genes' )
    assert len(track_labels) == 1, '%d tracks displayed with that name' % len(track_labels)

    # do the search again, and make sure that again, only one track is displayed
    # Find the query box and put YAL024C into it and hit enter
    qbox = browser.find_element_by_id("location")
    qbox.clear()
    qbox.send_keys( "YAL024C" + Keys.RETURN )
    time.sleep( 0.2 )

    # test that the track with YAL024C has appeared and has the correct track label
    track_labels = get_track_labels_containing( browser, 'Protein-coding genes' )
    assert len(track_labels) == 1, '%d tracks displayed with that name' % len(track_labels)

def get_track_labels_containing( browser, string ):
    track_labels = assert_elements( browser, "//div[contains(@class,'track-label')][contains(.,'%s')]" % string )
    return track_labels


def assert_elements( browser, xpathExpression ):
    try:
        el = browser.find_elements_by_xpath( xpathExpression )
    except NoSuchElementException:
        assert 0, ( "can't find %s" % xpathExpression )
    return el

def format_yeast():
    call( "rm -rf sample_data/json/yeast/", shell=True )
    call( "bin/prepare-refseqs.pl --fasta sample_data/raw/yeast_scaffolds/chr1.fa.gz --fasta sample_data/raw/yeast_scaffolds/chr2.fa.gzip  --out sample_data/json/yeast/", shell=True )
    call( "bin/biodb-to-json.pl --conf sample_data/raw/yeast.json --out sample_data/json/yeast/", shell=True )
    call( "bin/generate-names.pl --dir sample_data/json/yeast/", shell=True )
