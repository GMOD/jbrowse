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

    tabs = browser.find_elements_by_xpath( '//div[@class="browsingTab"]' )
    for t in tabs:
        t.click()
        time.sleep(0.5)
        t.click()

    assert_no_js_errors(browser)

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
       .move_by_offset( 300, 0 ) \
       .release( None ) \
       .move_by_offset( -100,100 ) \
       .click_and_hold( None ) \
       .move_by_offset( -300, 0 ) \
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
    label = assert_element( browser, yal024_xpath )
    assert label.text == 'YAL024C';

def assert_element( browser, xpathExpression ):
    try:
        el = browser.find_element_by_xpath( xpathExpression )
    except NoSuchElementException:
        assert 0, ( "can't find %s" % xpathExpression )
    return el

def format_yeast():
    os.chdir('sample_data/json')
    os.environ['PATH'] = "../../bin:" + os.environ['PATH']
    call( "rm -rf yeast/", shell=True )
    call( "prepare-refseqs.pl --fasta ../raw/yeast_scaffolds/chr1.fa --fasta ../raw/yeast_scaffolds/chr2.fa  --out yeast/", shell=True )
    call( "biodb-to-json.pl --conf ../raw/yeast.json --out yeast/", shell=True )
    call( "generate-names.pl --dir yeast/", shell=True )
    call( "prepare-nested-structure.pl --out yeast/", shell=True )
    call( "setup-faceted-browsing.pl --out yeast/", shell=True )
    os.chdir('../..')
