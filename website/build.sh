#!/bin/bash
if [ ! -r package.json ]; then
    echo cannot read version number from ./package.json, aborting website deploy;
    exit 1;
fi;
RELEASE_VERSION=`node -e 'require("fs").readFile("package.json", (e,d)=>console.log(JSON.parse(d).version))'`
set -e
set -x
cd ${0%/*}
yarn
yarn build
cp -R ../img build/jbrowse/docs/assets/img
