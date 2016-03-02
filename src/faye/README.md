
To test, first add the following to `trackList.json` for the volvox example

    "notifications" : {
        "url" : "http://localhost:8000/faye"
    }

Then run the test server in this directory

    node minimal-server.js

Leave this server running.
Fire up your JBrowse instance in a web browser, and check that the console log has lines like this

    Subscribed to /alert at http://localhost:8000/faye
    Subscribed to /tracks/new at http://localhost:8000/faye

Then do a simple test with an `alert` message (should probably disable this for production!)

    node test-alert.js

(The browser should pop up a cute alert message)

Then try adding a track using a server message:

    node test-add-track.js

You should see a new track appear on the track list. It will not initially be opened. Open it, and (on refseq `ctgA`) you should see a single feature (on the far left). Click on the feature to get the detail popup.

You can try the same thing using the `add-track-json.js` script, which is a Faye-aware version of the `add-track-json.pl` Perl script

    ./add-track-json.js -o -t test-volvox-track.json -l ../../sample_data/json/volvox/trackList.json -p http://localhost:8000/faye

The `-o` option prevents `add-track-json.js` from permanently modifying the `trackList.json` file, instead printing the results to stdout (but this also means it can't tell if the track has already been added, so repeated calls will lead to duplicates in the browser track list because the `/tracks/new` message will be broadcast multiple times).
