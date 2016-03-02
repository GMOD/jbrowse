
To test, first add the following to `trackList.json` for the volvox example

    "notifications" : {
        "url" : "http://localhost:8000/faye"
    }

Then run the test server in this directory

    node minimal-server.js

Leave this server running.
Fire up your JBrowse instance in a web browser, and check that the console log has lines like this

    Subscribed to /alert at http://localhost:8000/faye
    Subscribed to /track/new at http://localhost:8000/faye

Then do a simple test with an `alert` message (should probably disable this for production!)

    node test-alert.js

(The browser should pop up a cute alert message)

Then try adding a track using a server message:

    node test-add-track.js

You should see a new track appear on the track list. It will not initially be opened. Open it, and (on refseq `ctgA`) you should see a single feature. Click on the feature to get the detail popup.
