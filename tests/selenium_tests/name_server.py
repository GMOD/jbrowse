#! /usr/bin/python
from wsgiref.simple_server import make_server
from cgi import parse_qs, escape
import json
import re

def application( environ, start_response ):

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
    starts = d.get('startswith', [''])[0]
    equals = d.get('equals', [''])[0]

    if starts and equals:
        start_response('400 Bad request', [['Content-Type','text/plain']]);
        return [ 'cannot provide both startswith and equals query params' ]

    return_obj = []
    if starts:
        search = re.compile("^" + re.escape(re.sub('\*$', '', starts)))
        if search.match("EDEN"):   return_obj.append(EDEN)
        if search.match("Apple1"): return_obj.append(Apple1)
        if search.match("Apple2"): return_obj.append(Apple2)
    elif equals:
        if equals == "EDEN":   return_obj.append(EDEN)
        elif equals == "Apple1": return_obj.append(Apple1)
        elif equals == "Apple2": return_obj.append(Apple2)

    response_headers = [('Content-Type', 'application/json'),
                       ('Access-Control-Allow-Origin', '*'),
                       ('Access-Control-Allow-Headers', 'X-Requested-With')];
    start_response('200 OK', response_headers)
    return [ json.dumps(return_obj) ]

def start_server():
    httpd = make_server('localhost', 8051, application)
    httpd.serve_forever()

if __name__ == "__main__":
    start_server()
