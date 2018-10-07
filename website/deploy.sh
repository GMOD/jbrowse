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
ln -sf ../code/JBrowse-$RELEASE_VERSION/dist build/jbrowse/docs/dist
openssl aes-256-cbc -K $encrypted_a33f2fb5219d_key -iv $encrypted_a33f2fb5219d_iv -in deploy.pem.enc -out deploy.pem -d
chmod 600 deploy.pem
rsync -r -e "ssh -i deploy.pem -o StrictHostKeyChecking=no" build/jbrowse/ jbrowse_docs@jbrowse.org:/var/www/site
