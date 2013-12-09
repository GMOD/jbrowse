#! /usr/bin/python
from wsgiref.simple_server import make_server
from cgi import parse_qs, escape
import json
import re

def application(environ, start_response):

    d = parse_qs(environ['QUERY_STRING'])
   
    EDEN = [{"name":"EDEN","location":{"ref":"ctgA","start":1049,"end":9000,"tracks":["Genes"],"objectName":"EDEN"},"label":"EDEN <span class=\"locString\">ctgA:1050..9000 (EDEN)</span>"}]
    Apple = [{"name":"Apple1","location":{"ref": "ctgA","start":9999,"end":11500,"tracks":["CDS"],"objectName":"Apple1"},"label":"Apple1 <span class=\"locString\">ctgA:10000..11500 (Apple1)</span>"}] 
   
    starts_obj = {}
    starts = escape(d.get('starts', [''])[0])
    search = re.compile("^" + starts)
    print("starts: " + starts, "search: " + search.pattern)
    if starts:
        if search.match("EDEN") is not None:
            starts_obj = EDEN
        elif search.match("Apple1") is not None:
            starts_obj = Apple
        json_text = json.dumps(starts_obj)
    else:
        start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
        return ['Not Found']

    response_headers = [('Content-Type', 'application/json'),
                       ('Content-Length', str(len(json_text)))]
    start_response('200 OK', response_headers)
    return [json_text]

httpd = make_server('localhost', 8051, application)
httpd.serve_forever()
