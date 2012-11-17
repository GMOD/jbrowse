#!/bin/bash
set -e;

# try to install pip if we don't have it
if ! ( which pip >/dev/null 2>&1 ); then
    if ( which apt-get ); then
        sudo apt-get install python-pip
    else if ( which easy_install >/dev/null 2>&1 ); then
        easy_install pip
        fi;
    fi;
fi;

# install selenium and nose with pip
pip install selenium nose
