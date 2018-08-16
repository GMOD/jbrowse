---
id: cors
title: Cross-origin resource sharing (CORS)
---


Because of JavaScript's same-origin security policy, if data files shown in JBrowse do not reside on the same server as JBrowse, the web server software that serves them must be configured to allow access to them via [Cross-origin resource sharing (CORS)](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).

Example wide-open CORS configuration for Apache:

```
 <IfModule mod_headers.c>
   Header onsuccess set Access-Control-Allow-Origin *
   Header onsuccess set Access-Control-Allow-Headers X-Requested-With,Range
 </IfModule>
```

The CORS Range header is needed to support loading byte-range pieces of BAM, VCF, and other large files from Remote URLs. If you receive an error that says "Unable to fetch <your file>" using Remote URLs, then check to make sure that the proper CORS settings are enabled on the server that you are loading the file from.


