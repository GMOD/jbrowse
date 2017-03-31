for i in dojo dijit dojox util xstyle put-selector FileSaver jszlib; do
    cp -R node_modules/$i src/$i;
done;
