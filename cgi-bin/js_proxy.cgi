#!/usr/bin/env python

# IF YOU ARE SEEING THIS CODE
# THEN YOU HAVEN'T CONFIGURED
# APACHE CGI-BIN DIR properly

import urllib2
import cgi
import sys, os
import re

# Designed to prevent Open Proxy type stuff.

# Edit allowed hosts here
allowedHosts = [
		'localhost','example.org',
		]

method = os.environ["REQUEST_METHOD"]

if method == "POST":
    qs = os.environ["QUERY_STRING"]
    d = cgi.parse_qs(qs)
    if d.has_key("url"):
        url = d["url"][0]
    else:
        url = "http://example.org"
    #AP: the following structure is untested
    for param in d:
        if param != 'url':
                url += '&' + param + '=' + d[param][0]
else:
    fs = cgi.FieldStorage()
    url = fs.getvalue('url', "http://example.org") + '?xz='
    for param in fs:
        if param != 'url':
	    	url += '&' + param + '=' + fs.getvalue(param)
    
try:
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url

    parsedurl = re.search("^https?://(?P<domain>[^/?]+)", url) 
    host = parsedurl.group("domain")

    if allowedHosts and not host in allowedHosts:
        print "Status: 502 Bad Gateway"
        print "Content-Type: text/plain\n"
        print "Cannot access this location.\n"
#debug comment out for production
#        print "This proxy does not allow you to access this location (%s)." % (host,)
#        print os.environ

    elif url.startswith("http://") or url.startswith("https://"):

        if method == "POST":
            length = int(os.environ["CONTENT_LENGTH"])
            headers = {"Content-Type": os.environ["CONTENT_TYPE"]}
            body = sys.stdin.read(length)
            r = urllib2.Request(url, body, headers)
            y = urllib2.urlopen(r)
        else:
            y = urllib2.urlopen(url)
       
        # print content type header
        i = y.info()
        if i.has_key("Content-Type"):
            print "Content-Type: %s" % (i["Content-Type"])
        else:
            print "Content-Type: text/plain"
        print

        print y.read()

        y.close()
    else:
        print "Content-Type: text/plain"
        print
        print "Illegal request."

except Exception, E:
    print "Status: 500 Unexpected Error"
    print "Content-Type: text/plain\n"
# debug comment out for production
#    print "Some unexpected error occurred. Error text was:", E
