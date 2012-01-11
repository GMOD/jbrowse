#!/usr/bin/env python

import sys
import cgi
import simplejson
import os.path
import portalocker

#  config dict stores server-side exhibit configuration details
config = dict(

    # enter a unique admin password for this exhibit
    password = 'MY_PASSWORD ',

    # json file the exhibit database is stored in
    database_path = '../apartments.js',

    # json file to store unapproved submissions    
    submissions_path = 'submissions.js',
    
    # maximum number of unapproved submissions
    max_submissions = 100,
    
    # maximum number of characters in any submission field
    max_field_size = 250
)

# HTTP responses

def output_response(status, content_type, text):
    print "Status: " + status
    print "Content-type: " + content_type
    print
    print text
    
def output_error(msg):
    output_response('400 Bad Request', 'text/plain', msg)

def output_object(obj):
    resp = simplejson.dumps(obj, indent=4)
    output_response('200 Ok', 'text/javascript', resp)

# lock handling

lock_map = {
    None: [],
    'submissions': ['submissions_path'],
    'both': ['database_path', 'submissions_path']
}

def paths_for_locks(locks):
    return (config[opt_name] for opt_name in lock_map[locks])
    
locked_files = []

def lock(locks):
    for path in paths_for_locks(locks):
        f = open(path, 'r+')
        portalocker.lock(f, portalocker.LOCK_EX)
        locked_files.append(f)
    
def unlock():
    for f in locked_files:
        portalocker.unlock(f)
        locked_files.remove(f)
    
 
# JSON file helpers
 
def load_json(filename):
    if os.path.exists(filename):
        json = simplejson.load(open(filename))
        return json

def save_json(obj, filename):
    f = open(filename, 'w')
    s = simplejson.dumps(obj, indent=4)
    f.write(s)
    
# convenience functions for handlers
def save_submissions(sub):
    save_json(sub, config['submissions_path'])
    
def save_database(data):
    save_json(data, config['database_path'])

class ExhibitError(Exception):
    def __init__(self, value):
        self.value = value
    def __str__(self):
        return repr(self.value)

# handlers are functions that take (database, submissions, input message),
# and return an object, which will be converted to JSON and sent to the
# browser as a response.

def execute_handler(handler):
    try:
        lock('both')
        __execute_handler(handler)
    except Exception, e:
        output_error(str(e))
    finally:
        unlock()
    
def __execute_handler(handler):    
    form = cgi.FieldStorage()
    json = form.getvalue('message')
    
    if not json:
        raise ExhibitError("can't read 'message' field")
    
    message = simplejson.loads(json)
    
    database = load_json(config['database_path'])
    submissions = load_json(config['submissions_path']) or []
    
    result = handler(database, submissions, message)
    output_object(result)
    