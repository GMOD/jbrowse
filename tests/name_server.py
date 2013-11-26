#! /usr/bin/python
from wsgiref.simple_server import make_server
from cgi import parse_qs, escape
import json

def application(environ, start_response):

    d = parse_qs(environ['QUERY_STRING'])
    
    starts = escape(d.get('starts', [''])[0])
    equals = escape(d.get('equals', [''])[0])
    
    if starts:
        starts_obj = {"startswith": starts , "names":[starts+"_1",starts+"_123"]}
        json_text = json.dumps(starts_obj)
    elif equals:
        equals_obj = {"equals": equals, "location": "chr3L:20000-30000"} 
        json_text = json.dumps(equals_obj)
    else:
        json_text = json.dumps({})

    status = '200 OK'
    response_headers = [('Content-Type', 'application/json'),
                       ('Content-Length', str(len(json_text)))]
    start_response(status, response_headers)
    return [json_text]

httpd = make_server('localhost', 8051, application)
httpd.serve_forever()
