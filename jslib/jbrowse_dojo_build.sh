#!/bin/bash
set -e;
cd dojo-release-*-src/util/buildscripts;
./build.sh profileFile=../../../jbrowse_dojo.profile.js action=release copyTests=false mini=true optimize=shrinksafe version=0.0.0.jbrowse layerOptimize=shrinksafe cssOptimize=comments
cd ../../..;
cp -r dojo-release-*-src/release/dojo/* .;
