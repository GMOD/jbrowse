#!/bin/sh

# This is an exercise in theory as it doesn't function properly in practice.

cd /web/root/of/this/demo

WHEREAMI=http://simile.mit.edu/exhibit/demos/senate/
PORT=10000

# Scrape Senate committee data
curl -s --get --data "mode=scrape&url=http://www.senate.gov/general/committee_assignments/assignments.htm&delay=1000&scraper=http://simile.mit.edu/~ryanlee/assignment-scraper.js" http://127.0.0.1:$PORT/ > scraped.rdf

# Ask Babel for JSON
curl http://simile.mit.edu/babel/translator?reader=rdf-xml&writer=exhibit-json&url=$WHEREAMI/scraped.rdf > senate-committees.js

# When you run this, you get bills introduced in the senate yesterday
# (best run after 11AM ET since the Library of Congress asserts the
# coordination takes about that long to get yesterday's data into the
# system)

# This could probably be gotten from the above actions...
CONGRESS=110

# Yesterday, on BSD-ish systems
TODAY=`date +%Y%m%d`
DATE=`expr `date +%s` - 86400 | xargs date -I= -r = +%Y%m%d`

# Scrape THOMAS record for yesterday's bills that were referred
# to commitee (understanding how to make a THOMAS query via GET
# was arcane; what can you expect)
curl -s --data "mode=scrape&url=http%3A%2F%2Fthomas.loc.gov%2Fcgi-bin%2Fbdquery%2F%3F%26Db%3Dd$CONGRESS%26querybd%3D%40BAND(%40FIELD(FLD010%2B%40eq($DATE))%2B%40FIELD(FLD007(11000)))&delay=1000&scraper=http://simile.mit.edu/~ryanlee/thomas-scraper.js" http://127.0.0.1:$PORT/ > scraped.rdf

# Put the bills in a date-specific file
curl http://simile.mit.edu/babel/translator?reader=rdf-xml&writer=exhibit-json&url=$WHEREAMI/scraped.rdf > senate-bills.js.$DATE
rm senate-bills.js ; ln -s senate-bills.js.$DATE senate-bills.js

rm scraped.rdf
