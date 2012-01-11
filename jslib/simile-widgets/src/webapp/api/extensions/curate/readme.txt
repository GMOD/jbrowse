Curation Plugin Overview
----------------------------

The Curation plugin is a tool that Exhibit users make changes to an Exhibit, and Exhibit owners review and approve those changes.


Google Docs Backend
----------------------------

The Google Docs backend is supported by a Python CGI script, which takes JSON messages and writes them as rows in a Google Docs spreadsheet. The owner of the spreadsheet must have shared the spreadsheet with the email address 'exhibitbot@gmail.com', which is owned by the MIT Haystack group.

Dependencies: 

   - ElementTree: http://effbot.org/zone/element-index.htm
   - GData Python Client: http://code.google.com/p/gdata-python-client/
   - simplejson: http://pypi.python.org/pypi/simplejson
