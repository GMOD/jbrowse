#!/usr/bin/env python

import uuid
import exhibit
from exhibit import ExhibitError

valid_edit_types = ['added', 'modified']

def validate_message(msg):
    edits = msg['edits']
    if not edits:
        raise ExhibitError('no edits were given')
    
    for i, edit in enumerate(edits):
        label = edit['label']
        if not label:
            raise ExhibitError('edit #%s has no label' % (i+1))

        t = edit['type']
        if not t or t not in valid_edit_types:
            raise ExhibitError("invalid edit type '%s' for %s" % (t, label))


def submission_handler(database, submissions, message):
    message['sub_id'] = str(uuid.uuid4()).replace('-', '')
    validate_message(message)
    submissions.append(message)
    exhibit.save_submissions(submissions)
    
    return { 'status': 'ok' }

exhibit.execute_handler(submission_handler)