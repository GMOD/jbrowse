import time

class TrackSelector (object):
    def __init__(self, browser,time_dilation):
        self.test = browser
        self.time_dilation = time_dilation

class SimpleTrackSelector (TrackSelector):
    def turn_on_track( self, tracktext ):
        # find the track label
        tracklabel = self.test.assert_element( "//div[@class='tracklist-label'][contains(.,'%s')]" % tracktext )

        # drag the track label over
        self.test.actionchains() \
            .double_click(tracklabel) \
            .perform()

        self.test.assert_track(tracktext)
        self.test.assert_no_js_errors()

    def turn_off_track( self, tracktext ):
        # drag the track back into the track list
        self.test.assert_element( \
            "//div[contains(@class,'track-label')][contains(.,'%s')]/div[contains(@class,'track-close-button')]"%tracktext) \
            .click()

        self.test.assert_no_js_errors()

class HierarchicalTrackSelector (TrackSelector):
    def turn_on_track( self, tracktext ):
        self._click_track( tracktext )
        self.test.assert_track( tracktext )

    def turn_off_track( self, tracktext ):
        self._click_track( tracktext )

    def _click_track( self, tracktext ):
        # find the track in the selector and click it
        tracklabel = self.test \
            .assert_element( "//label[contains(@class,'tracklist-label')]/span[contains(.,'%s')]" % tracktext ) \
            .click()

        self.test.assert_no_js_errors()


class FacetedTrackSelector (TrackSelector):
    def turn_on_track( self, tracktext ):

        # find the track in the track selector
        track_row = self._find_track_by_text( tracktext )

        # click the box to turn on the first matching track
        checkbox = track_row.find_element_by_css_selector('.dojoxGridRowSelector')
        checkbox.click()

        self._close_selector()

    def turn_off_track( self, tracktext ):
        track_row = self._find_track_by_text( tracktext )
        # click the box to turn on the first matching track
        checkbox = track_row.find_element_by_css_selector('.dojoxGridRowSelector')
        checkbox.click()

        # check that the track is not on
        assert not self.test.is_track_on( tracktext ), 'track should be off now'

        self._close_selector()

    def _find_track_by_text( self, tracktext ):
        # turn on the track selector tab
        self.test.assert_element("//div[contains(@class,'faceted_tracksel_on_off')]")
        selector_tab = self.test.assert_element("//div[contains(@class,'faceted_tracksel_on_off')]")
        selector_tab.click()
        time.sleep(0.4*self.time_dilation)

        # type the track's text in the text filter box
        textfilter = self.test.assert_element("//div[@id='faceted_tracksel']//label[@class='textFilterControl']//input[@type='text']")
        textfilter.send_keys( tracktext )

        # check that the number of matching tracks is 1
        
        self.test.wait_until_one_track () 
        return self.test.assert_element("div.dojoxGridRow")

    def _close_selector( self ):
        # turn off the track selector tab
        selector_tab = self.test.assert_element("//div[contains(@class,'faceted_tracksel_on_off')]")
        selector_tab.click()
        time.sleep(0.4*self.time_dilation)

