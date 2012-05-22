class SimpleTrackSelector (object):

    def __init__(self, browser):
        self.browser = browser

    def turn_on_track( self, tracktext ):

        # find the track label
        tracklabel = self.browser.assert_element( "//div[@class='tracklist-label'][contains(.,'%s')]" % tracktext )
        dragpane   = self.browser.assert_element( "//div[contains(@class, 'trackContainer')]" )

        # drag the track label over
        self.browser.actionchains() \
            .drag_and_drop( tracklabel, dragpane ) \
            .perform()

        self.browser.assert_no_js_errors()

    def turn_off_track( self, tracktext ):

        # drag the track back into the track list
        track_handle = self.browser.assert_element( "/html//div[contains(@class,'track')]//div[contains(@class,'track-label')][contains(.,'%s')]" % tracktext )
        track_list = self.browser.assert_element( "/html//div[@id='tracksAvail']" )

        self.browser.actionchains() \
            .drag_and_drop( track_handle, track_list ) \
            .perform()

        self.browser.assert_no_js_errors()


