#!/usr/bin/env bash

for i in dojo dijit dojox xstyle put-selector jszlib json-schema lazyload dbind dgrid; do
    cp -R node_modules/$i src/$i;
done;

cp -R node_modules/dojo-util src/util
cp -R node_modules/filesaver.js src/FileSaver
cp -R node_modules/jdataview src/jDataView



