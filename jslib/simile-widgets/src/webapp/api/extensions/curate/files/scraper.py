#!/usr/bin/env python

import cgi
import sys
from urllib import urlopen
import simplejson

# HTTP Responses

def output_response(obj, callback, status):
    message = { 'status': status, 'obj': obj }
    resp = simplejson.dumps(message, indent=4)

    if callback:
        resp = "%s(%s)" % (callback, resp)


    print "Status: 200 Ok"
    print "Content-type: text/javascript"
    print
    print resp

def output_error(msg, callback):
    output_response(msg, callback, 'error')
    sys.exit()

def output_object(obj, callback):
    output_response(obj, callback, 'ok')
    
# Request handling

if len(sys.argv) > 1:
    callback = 'sample_func'
    url = sys.argv[1]
else:
    form = cgi.FieldStorage()
    callback = form.getvalue('callback', None)
    url = form.getvalue('url', None)

if not callback:
    output_error('no callback provided', None)
    
if not url:
    output_error('no url provided', callback)

if not url.startswith('http://'):
    url = 'http://' + url


try:
    contents = urlopen(url).read()
except Exception, e:
    output_error('error loading page: %s' % str(e), callback)
    
output_object(contents, callback)