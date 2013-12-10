#! /usr/bin/python
from wsgiref.simple_server import make_server
from cgi import parse_qs, escape
import json
import re

def application(environ, start_response):
   
    EDEN = {
        "name":"EDEN",
        "location": {
            "ref":"ctgA",
            "start":1049,
            "end":9000,
            "tracks":["Genes"],
            "objectName":"EDEN"
        }
    }
    Apple1 = {
        "name":"Apple1",
        "location": {
            "ref": "ctgA",
            "start":9999,
            "end":11500,
            "tracks":["CDS"],
            "objectName":"Apple1"
        }
    }
    Apple2 = {
        "name":"Apple2",
        "location": {
            "ref": "ctgA",
            "start":12999,
            "end":17200,
            "tracks":["CDS"],
            "objectName":"Apple2"
        }
    } 
   
    d = parse_qs(environ['QUERY_STRING'])
    starts = escape(d.get('starts', [''])[0])
    
    starts_obj = []
    if re.match('.+\*$', starts):
        search = re.compile("^" + re.escape(re.sub('\*$', '', starts)))
        if search.match("EDEN"):   starts_obj.append(EDEN)
        if search.match("Apple1"): starts_obj.append(Apple1)
        if search.match("Apple2"): starts_obj.append(Apple2)

    elif starts == "EDEN":   starts_obj.append(EDEN)
    elif starts == "Apple1": starts_obj.append(Apple1)
    elif starts == "Apple2": starts_obj.append(Apple2)

    json_text = json.dumps(starts_obj)

    response_headers = [('Content-Type', 'application/json'),
                       ('Content-Length', str(len(json_text)))]
    start_response('200 OK', response_headers)
    return [json_text]

httpd = make_server('localhost', 8051, application)
httpd.serve_forever()
