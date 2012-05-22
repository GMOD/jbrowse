import time

class TrackSelector (object):
    def __init__(self, browser):
        self.test = browser

class SimpleTrackSelector (TrackSelector):
    def turn_on_track( self, tracktext ):
        # find the track label
        tracklabel = self.test.assert_element( "//div[@class='tracklist-label'][contains(.,'%s')]" % tracktext )
        dragpane   = self.test.assert_element( "//div[contains(@class, 'trackContainer')]" )

        # drag the track label over
        self.test.actionchains() \
            .drag_and_drop( tracklabel, dragpane ) \
            .perform()

        self.test.assert_no_js_errors()

    def turn_off_track( self, tracktext ):
        # drag the track back into the track list
        track_handle = self.test.assert_element( "/html//div[contains(@class,'track')]//div[contains(@class,'track-label')][contains(.,'%s')]" % tracktext )
        track_list = self.test.assert_element( "/html//div[@id='tracksAvail']" )

        self.test.actionchains() \
            .drag_and_drop( track_handle, track_list ) \
            .perform()

        self.test.assert_no_js_errors()

class FacetedTrackSelector (TrackSelector):
    def turn_on_track( self, tracktext ):

        # find the track in the track selector
        track_row = self._find_track_by_text( tracktext )

        # click the box to turn on the first matching track
        checkbox = track_row.find_element_by_css_selector('.dojoxGridRowSelector');
        checkbox.click();

        # check that the track is on
        assert self.test.is_track_on( tracktext ), 'track should be on now';

        self._close_selector();

    def turn_off_track( self, tracktext ):
        track_row = self._find_track_by_text( tracktext )
        # click the box to turn on the first matching track
        checkbox = track_row.find_element_by_css_selector('.dojoxGridRowSelector');
        checkbox.click();

        # check that the track is not on
        assert not self.test.is_track_on( tracktext ), 'track should be off now';

        self._close_selector();

    def _find_track_by_text( self, tracktext ):
        # turn on the track selector tab
        selector_tab = self.test.assert_element("//div[contains(@class,'faceted_tracksel_on_off')]")
        selector_tab.click()
        time.sleep(0.4);

        # type the track's text in the text filter box
        textfilter = self.test.assert_element("//div[@id='faceted_tracksel']//label[@class='textFilterControl']//input[@type='text']")
        textfilter.send_keys( tracktext )
        time.sleep(1);

        # check that the number of matching tracks is 1
        matching_track_rows = self.test.assert_elements("div.dojoxGridRow")
        assert len( matching_track_rows ) == 1, ('actually %d matching track rows: ' % len(matching_track_rows))+repr(map(lambda x: x.text, matching_track_rows))
        track_row = matching_track_rows[0]
        return track_row

    def _close_selector( self ):
        # turn off the track selector tab
        selector_tab = self.test.assert_element("//div[contains(@class,'faceted_tracksel_on_off')]")
        selector_tab.click()
        time.sleep(0.4);

