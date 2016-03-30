This directory contains server code for implementing push notifications of track updates to JBrowse clients.

To test on the Volvox example, first add the following to `../sample_data/json/volvox/trackList.json`

    "notifications" : {
        "url" : "http://localhost:8000/faye"
    }

Then run the message server in this directory (you may first need to run `./setup.sh` to install relevant node modules)

    ./message-server.js

Leave this server running.
Fire up your JBrowse instance in a web browser, and check that the console log has lines like this

    Subscribed to /alert at http://localhost:8000/faye
    Subscribed to /tracks/new at http://localhost:8000/faye

Then do a simple test with an `alert` message

    node tests/test-alert.js

Then try adding a track using a server message:

    node tests/test-add-track.js

You should see a new track appear on the track list. It will not initially be opened. Open it, and (on refseq `ctgA`) you should see a single feature (on the far left). Click on the feature to test the detail popup.

You can replace the track data (the track name and feature data should be updated in the client)

    node tests/test-replace-track.js

You can remove the track (it should disappear from the client)

    node tests/test-delete-track.js

You can try the same thing using the `add-track-json.js` script, which is a Faye-aware version of the `add-track-json.pl` Perl script

    ./add-track-json.js -o -t tests/new-volvox-track.json -d ../sample_data/json/volvox -n http://localhost:8000/faye

The `-o` option prevents `add-track-json.js` from permanently modifying the Volvox `trackList.json` file, instead printing the results to stdout (but this also means it can't tell if the track has already been added, so repeated calls will lead to duplicates in the browser track list because the `/tracks/new` message will be broadcast multiple times).

The `remove-track.js` script does what you probably expect, and sends a `/tracks/delete` message to the client.

To prevent cross-site request forgeries (e.g. malicious users deleting other users' tracks), you'll probably want to make the Faye server push-only. You can do this by requiring a secret password on `/tracks/*` messages. Only clients with this secret (typically only server-side clients) will then be allowed to publish messages on those channels. Use the `-s` option to specify the secret.
