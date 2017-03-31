for i in dojo dijit dojox util xstyle put-selector FileSaver jszlib json-schema jDataView lazyload dbind dgrid; do
    cp -R node_modules/$i src/$i;
done;
