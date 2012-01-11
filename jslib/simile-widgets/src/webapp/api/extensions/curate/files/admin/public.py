#!/usr/bin/env python

from exhibit import database, jsondb, extract
import cgi
import cgitb

cgitb.enable()

json_database_path = 'apartments.js'
db = jsondb.load_database(json_database_path)

form = cgi.FieldStorage()
action_name = form.getvalue('action', 'noAction')

# basic responses

def response(status, content_type, text):
    print "Status: " + status
    print "Content-type: " + content_type
    print
    print text

def json(obj):
    response('200 Ok', 'application/json', jsondb.dump(obj))

def ok(text):
    response('200 Ok', 'text/html', text)

def error(msg):
    response('400 Bad Request', 'text/html', msg)


# actions

def output_database(form):
    json(db.to_dict(filter_items=True))


def submit_item(form):
    form_dict = dict([(k,form[k].value) for k in form.keys()])
    del form_dict['action']
    
    db.add_item(form_dict)
    jsondb.write_database(db, json_database_path)
    
    json({'status': 'success', 'item': form_dict }) 

# action_map maps Action parameter to the Python function that handles it

action_map = {
    'extract': extract_from_url,
    'output': output_database,
    'submitItem': submit_item,
    'noAction': output_database
}

action = action_map.get(action_name, False)
if action:
    action(form)
else:
    error("unrecognized action " + action_name)