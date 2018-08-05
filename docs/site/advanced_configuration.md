---
id: advanced_config
title: Advanced configuration
---

## Including external files and functions in trackList.json

The trackList.json configuration format is limited when it comes to specifying callbacks, because functions can only be specified on a single line. However, you can create functions in an external .conf file that span multiple lines and include them in the trackList.json configuration easily. The functions should follow the guidelines specified in the .conf section [here](/#Text_Configuration_Format_.28.conf.29 "wikilink").

Example: say there is a complex coloring function, so it is stored in a file called functions.conf in the data directory
```
# functions.conf
customColor = function(feature) {
    return feature.get("type")=="mRNA" ? "green" : "blue";
    /* note the closing bracket should be spaced away from the leftmost column */
  }
```
Then you can use this function in a particular track by referencing it with curly brackets, or "variable interpolation".
```
"style": {
   "color":"{customColor}"
}
```
Make sure to also include your functions.conf in the "trackList.json" (e.g. anywhere outside the "tracks": [ ... ] section of trackList.json), add

` "include": "functions.conf"`

Note that include can also be an array of multiple files

`"include": ["functions1.conf","functions2.conf"]`

In the above example, the callback parameters exactly match, so the interpolated function can just be dropped in place. Alternatively, if the callback parameters don't match, you can store the interpolated function in a variable and adjust the callback parameters appropriately.
```
"style": {
  "color": "function(feature) { var f={customColor}; return f(feature); }"
}
```
or shorthand
```
"style": {
  "color": "function(feature) { return ({customColor})(feature); }"
}
```
See the general configuration section for details on the include command.


