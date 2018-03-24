#!/bin/bash

# wrapper for selenium tests meant to increase the robustness of the Travis build.
# if the selenium tests fail on the first run, runs them again to make sure it
# wasn't just a random failure.

set +e

NOSEOPTS="--verbose --stop $NOSEOPTS"
nosetests $NOSEOPTS .
FIRST_RUN_STATUS=$?

if [[ $FIRST_RUN_STATUS -ne 0 ]]; then
    echo
    echo ============= FIRST SELENIUM RUN FAILED, RETRYING TO MAKE SURE ===============
    echo
    nosetests $NOSEOPTS .
    SECOND_RUN_STATUS=$?
    if [[ $SECOND_RUN_STATUS -ne 0 ]]; then
        echo ============= SELENIUM TEST FAILED ON SECOND RUN ==============
        exit $SECOND_RUN_STATUS
    fi
else
    echo ============= SELENIUM TEST PASSED ON FIRST RUN ===============
    exit 0
fi

echo ============= SELENIUM TEST PASSED ON SECOND RUN ==============
