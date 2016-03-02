
To test, first add the following to `trackList.json` for the volvox example

<pre><code>
    "notifications" : {
	"url" : "http://localhost:8000/faye"
    }
</code></pre>

Then run the test server in this directory

<code>
    node minimal-server.js
</code>

Leave this server running.
Fire up your JBrowse instance in a web browser, and check that the console log has lines like this

<pre><code>
    Subscribed to /alert at http://localhost:8000/faye
    Subscribed to /track/new at http://localhost:8000/faye
</code></pre>

Then do a simple test with an `alert` message (should probably disable this for production!)

<code>
    node test-alert.js
</code>

(The browser should pop up a cute alert message)

Then try adding a track using a server message:

<code>
    node test-add-track.js
</code>

You should see a new track appear on the track list. It will not initially be opened. Open it, and (on refseq `ctgA`) you should see a single feature. Click on the feature to get the detail popup.
