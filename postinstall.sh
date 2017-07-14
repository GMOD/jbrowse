#!/usr/bin/env bash

for i in dojo dijit dojox jszlib json-schema lazyload dgrid jDataView; do
    rm -rf src/$i;
    cp -R node_modules/$i src/$i;
done;

rm -rf src/util
rm -rf src/FileSaver
rm -rf src/dstore

cp -R node_modules/dojo-util src/util
cp -R node_modules/filesaver.js src/FileSaver
cp -R node_modules/dojo-dstore src/dstore
