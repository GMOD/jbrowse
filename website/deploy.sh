#!/bin/bash
set -e
cd ${0%/*}
yarn
yarn build
openssl aes-256-cbc -K $encrypted_a33f2fb5219d_key -iv $encrypted_a33f2fb5219d_iv -in deploy.pem.enc -out deploy.pem -d
chmod 600 deploy.pem
rsync -r -e "ssh -i deploy.pem -o StrictHostKeyChecking=no" build/jbrowse/ jbrowse_docs@jbrowse.org:/var/www/site
