#!/usr/bin/env python

import os
import sys
import cgi
from datetime import date

# Configuration Loading

# config file should have gmail account name on first line, password on second
config_path = 'config.cgi'
email = None
password = None

if os.path.exists(config_path):
    email, password = [l.rstrip('\n') for l in open(config_path).readlines()]

# HTTP Responses

def output_response(status, content_type, text):
    print "Status: " + status
    print "Content-type: " + content_type
    print
    print text

def output_error(msg):
    output_response('400 Bad Request', 'text/plain', msg)
    sys.exit()

try:
    import simplejson
except Exception, e: 
    output_error('error loading simplejson library: %s' % (str(e)))

try:
    import gdata.spreadsheet.service
except Exception, e:
    output_error('error loading gdata library: %s' % (str(e)))

def output_object(obj, callback):
    resp = simplejson.dumps(obj, indent=4)
    if callback:
        resp = "%s(%s)" % (callback, resp)
    output_response('200 Ok', 'text/javascript', resp)

# Google Spreadsheets Code

def gdata_login(token=None, session_token=None):
    gd_client = gdata.spreadsheet.service.SpreadsheetsService()
    if session_token:
        gd_client.SetAuthSubToken(session_token)
    elif token:
        gd_client.SetAuthSubToken(token)
        gd_client.UpgradeToSessionToken()
    else:
        gd_client.email = email
        gd_client.password = password
        gd_client.source = 'Exhibit Submitter'
        gd_client.ProgrammaticLogin()
    return gd_client
    
def print_feed(feed):
  for entry in feed.entry:
    if isinstance(feed, gdata.spreadsheet.SpreadsheetsCellsFeed):
      print '%s %s' % (entry.title.text, entry.content.text)
    elif isinstance(feed, gdata.spreadsheet.SpreadsheetsListFeed):
      print '%s %s' % (entry.title.text, entry.content.text)
    else:
      print '%s' % (entry.title.text)

class SheetManager(object):
    def __init__(self, client):
        self.client = client

    def get_spreadsheet(self, name):
        for e in self.client.GetSpreadsheetsFeed().entry:
            if e.title.text == name:
                key = e.id.text.rsplit('/', 1)[1]
                return Spreadsheet(self.client, key)

class Spreadsheet(object):
    def __init__(self, client, key):
        self.client = client
        self.key = key
    
    def get_worksheet(self, name=None, index=None):
        entry = self.client.GetWorksheetsFeed(self.key).entry
        ws = None
        if name != None:
            for e in entry:
                if e.title.text.lower() == name.lower(): 
                    ws = e
        elif index != None:
            index = int(index)
            if entry[index]: ws = entry[index]
        else:
            raise Exception()
        if ws:
            key = ws.id.text.split('/')[-1]
            return Worksheet(self.client, self.key, key)

class Worksheet(object):
    def __init__(self, client, ss_key, ws_key):
        self.client = client
        self.ss_key = ss_key
        self.ws_key = ws_key
        self.feed = self.client.GetCellsFeed(self.ss_key, self.ws_key)
        
    def insert_row(self, obj):
        return self.client.InsertRow(obj, self.ss_key, self.ws_key)


# Actions

# Request handling

def get_form_values():
    form = cgi.FieldStorage()
    vals = {}
    vals['callback'] = form.getvalue('callback')
    vals['json'] = form.getvalue('json')
    vals['ss_key'] = form.getvalue('spreadsheetkey')
    vals['wk_name'] = form.getvalue('worksheetname')
    vals['wk_index'] = form.getvalue('worksheetindex')
    vals['token'] = form.getvalue('token')
    vals['session_token'] = form.getvalue('session')
    return vals

try:
    vals = {
        'token':None,
        'session_token':None,
        'callback':None,
        'ss_key':'pHCVS1LwNriVBoIRKJryCeg',
        'wk_index':'1',
        'wk_name': None,
        'json':'[{"id":"Atlas Shrugged","label":"Atlas Shrugged","availability":"unavailable","submitteremail":"test@","submittercomment":"test comment"}]'
    }
    # vals = get_form_values()
except Exception, e:
    output_error('error getting form values: %s' % (str(e)))

if 'json' not in vals:
    output_error('no message provided')
    
if 'ss_key' not in vals:
    output_error('no spreadsheet key provided')

# we default to using the first worksheet in the spreadsheet
if not 'wk_name' in vals and not 'wk_index' in vals:
    vals['wk_index'] = 0

try:
    message = simplejson.loads(vals['json'])
except Exception, e:
    output_error('invalid json: %s' % (str(e)))


client = gdata_login(token=vals['token'], session_token=vals['session_token'])
response_message = { 'status': 'ok' }

if 'session' in vals:
    response_message['session'] = client.GetAuthSubToken()

try:
    ss = Spreadsheet(client, vals['ss_key'])
    ws = ss.get_worksheet(name=vals['wk_name'], index=vals['wk_index'])
    for r in message:
        ws.insert_row(r)
    output_object(response_message, vals['callback'])
except Exception, e:
    output_error(str(e) + "\n" + str(message))
