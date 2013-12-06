#! /usr/bin/python
from wsgiref.simple_server import make_server
from cgi import parse_qs, escape
import json

def application(environ, start_response):

    d = parse_qs(environ['QUERY_STRING'])
    
    starts = escape(d.get('starts', [''])[0])
    equals = escape(d.get('equals', [''])[0])
   
    if starts:
        if starts == "EDEN": 
            starts_obj = [{"name":"EDEN","location":{"ref":"ctgA","start":1049,"end":9000,"tracks":["Genes"],"objectName":"EDEN"},"label":"EDEN <span class=\"locString\">ctgA:1050..9000 (EDEN)</span>"}]
        else:
            starts_obj = [{"name":"EDEN","location":{"ref":"ctgA","start":1049,"end":9000,"tracks":["Genes"],"objectName":"EDEN"},"label":"EDEN <span class=\"locString\">ctgA:1050..9000 (EDEN)</span>"}]
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
