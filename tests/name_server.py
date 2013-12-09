#! /usr/bin/python
from wsgiref.simple_server import make_server
from cgi import parse_qs, escape
import json
import re

def application(environ, start_response):

    d = parse_qs(environ['QUERY_STRING'])
   
    EDEN = [{"name":"EDEN","location":{"ref":"ctgA","start":1049,"end":9000,"tracks":["Genes"],"objectName":"EDEN"},"label":"EDEN <span class=\"locString\">ctgA:1050..9000 (EDEN)</span>"}]
    Apple = [{"name":"Apple1","location":{"ref": "ctgA","start":9999,"end":11500,"tracks":["CDS"],"objectName":"Apple1"},"label":"Apple1 <span class=\"locString\">ctgA:10000..11500 (Apple1)</span>"},{"name":"Apple2","location":{"ref": "ctgA","start":12999,"end":17200,"tracks":["CDS"],"objectName":"Apple2"},"label":"Apple2 <span class=\"locString\">ctgA:10000..11500 (Apple2)</span>"}]
    Apple1 = [{"name":"Apple1","location":{"ref": "ctgA","start":9999,"end":11500,"tracks":["CDS"],"objectName":"Apple1"},"label":"Apple1 <span class=\"locString\">ctgA:10000..11500 (Apple1)</span>"}]
    Apple2 = [{"name":"Apple2","location":{"ref": "ctgA","start":12999,"end":17200,"tracks":["CDS"],"objectName":"Apple2"},"label":"Apple2 <span class=\"locString\">ctgA:10000..11500 (Apple2)</span>"}] 
   
    starts = escape(d.get('starts', [''])[0])
    trailing_star = re.compile('.+\*$')
    
    starts_obj = {}
    if trailing_star.match(starts) is not None:
        starts = re.sub('\*$', '', starts)
        search = re.compile("^" + starts)
        print ("trail")
        if search.match("EDEN") is not None:
            starts_obj = EDEN
            print("")
        elif search.match("Apple1") is not None or search.match("Apple2") is not None:
            starts_obj = Apple
    elif starts == "EDEN":
        starts_obj = EDEN
    elif starts == "Apple1":
        starts_obj = Apple1
    elif starts == "Apple2":
        starts_obj = Apple2

    json_text = json.dumps(starts_obj)
    response_headers = [('Content-Type', 'application/json'),
                       ('Content-Length', str(len(json_text)))]
    start_response('200 OK', response_headers)
    return [json_text]



httpd = make_server('localhost', 8051, application)
httpd.serve_forever()
