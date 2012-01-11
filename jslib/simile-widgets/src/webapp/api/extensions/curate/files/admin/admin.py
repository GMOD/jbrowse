#!/usr/bin/env python

import exhibit
from exhibit import ExhibitError

def dismiss(database, submissions, message):
    sub_id = message['sub_id']
    
    if not sub_id:
        raise ExhibitError('must provide an id to dismiss')
    
    filtered_subs = [s for s in submissions if s['sub_id'] != sub_id]
    
    if len(submissions) is len(filtered_subs):
        raise ExhibitError("id %s is not a valid submission" % (sub_id))
    
    # exhibit.save_submissions(filtered_subs)
    return { 'status': 'ok', 'result': filtered_subs }


def admin_handler(database, submissions, message):
    command = message['command']
    
    if command == 'dismiss':
        return dismiss(database, submissions, message)
    elif command == 'approve':
        raise ExhibitError('unimplemented')
    else:
        raise ExhibitError("can't' recognize command %s" % (command))

exhibit.execute_handler(admin_handler)