#!/bin/bash
set -e;

### this is where to get the dojo source to build from
# wget http://download.dojotoolkit.org/release-1.3.3/dojo-release-1.3.3-src.tar.gz;
# tar -xzf dojo-release-1.3.3-src.tar.gz;

cd dojo-release-*-src/util/buildscripts;
./build.sh profileFile=../../../jbrowse_dojo.profile.js action=release copyTests=false mini=true optimize=shrinksafe version=0.0.0.jbrowse layerOptimize=shrinksafe cssOptimize=comments
cd ../../..;
cp -r dojo-release-*-src/release/dojo/* .;
