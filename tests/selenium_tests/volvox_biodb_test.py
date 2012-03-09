import os
import time

from subprocess import check_call as call

from selenium                      import webdriver
from selenium.webdriver            import ActionChains
from selenium.webdriver.support.ui import Select

from jbrowse_selenium import *

def test_volvox():
    format_volvox()
    browser = webdriver.Firefox() # Get local session of firefox
    browser.get("file://%s/index.html?data=sample_data/json/volvox" % os.getcwd() ) # Load page

    # select "ctgA from the dropdown
    refseq_selector = Select( browser.find_element_by_id('chrom') )
    refseq_selector.select_by_value( 'ctgA' )

    # check a good browser title
    assert "ctgA" in browser.title, "browser title is actually %s" % browser.title

    tabs = browser.find_elements_by_xpath( '//div[@class="browsingTab"]' )
    for t in tabs:
        t.click()
        time.sleep(1)
        t.click()
        time.sleep(0.5)

    assert_no_js_errors(browser)

    # do a test where we search for a certain gene using the search box
    search_f15(browser)

    assert_no_js_errors(browser)

    # test scrolling, make sure we get no js errors
    scroll(browser)

    # test dragging in and displaying the wiggle track
    wiggle(browser)

    # test sequence track display
    sequence(browser)

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

def sequence(browser):
    do_typed_query( browser, '0..80' );
    #turn_on_track( browser, 'DNA' );
    sequence_div_xpath_templ = "/html//div[contains(@class,'sequence')][contains(.,'%s')]"
    sequence_div_xpath_1 = sequence_div_xpath_templ % 'aacaACGG';
    assert_element( browser, sequence_div_xpath_1)
    turn_off_track( browser, 'DNA' );
    assert_no_element( browser, sequence_div_xpath_1 )
    turn_on_track( browser, 'DNA' );
    assert_element( browser, sequence_div_xpath_1 )
    do_typed_query( browser, '1..20000');
    assert_no_element( browser, sequence_div_xpath_1 )
    do_typed_query( browser, 'ctgA:19961..20047');
    assert_element( browser, sequence_div_xpath_templ % 'ccgcgtgtagtc' )

def wiggle(browser):

    turn_on_track( browser, 'microarray' )

    # see that we have an image track png in the DOM now
    imagetrack_xpath =  "//div[contains(@class,'track')]//img[@class='image-track']";
    imagetrack_png = assert_element( browser, imagetrack_xpath )

    turn_off_track(browser,'microarray')
    # check that imagetrack png is not still in the DOM after the
    # track is turned off
    assert_no_element( browser, imagetrack_xpath )

def search_f15(browser):

    # check that a f15 feature label is not yet in the DOM
    yal024_xpath = "//div[@class='feature-label'][contains(.,'f15')]"
    # check that f15 is not already in the DOM at load time
    assert_no_element( browser, yal024_xpath )

    do_typed_query( browser, "f15" );

    # test that f15 appeared in the DOM (TODO: check that it's
    # actually centered in the window), and that the protein-coding
    # genes track is now selected
    label = assert_element( browser, yal024_xpath )
    assert label.text == 'f15';

def format_volvox():
    call( "rm -rf sample_data/json/volvox/", shell=True )
    call( "bin/prepare-refseqs.pl --fasta sample_data/raw/volvox/volvox.fa --out sample_data/json/volvox/", shell=True )
    call( "bin/biodb-to-json.pl --conf sample_data/raw/volvox.json --out sample_data/json/volvox/", shell=True )
    call( "bin/wig-to-json.pl --out sample_data/json/volvox/ --wig sample_data/raw/volvox/volvox_microarray.wig", shell=True )
    call( "bin/generate-names.pl --dir sample_data/json/volvox/", shell=True )
