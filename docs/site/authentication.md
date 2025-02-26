---
id: authentication
title: HTTP authentication for JBrowse
---

# Authentication and Access Control

JBrowse works with HTTP Basic, HTTP Digest, and cookie (session) authentication
methods, relying on the native support for them in browsers.

For cookie-based authentication methods, the session cookie should be set by
another page before the user launches JBrowse.

## HTTP Basic LDAP under Nginx

Provided you have a LDAP authentication server already available it is
relatively easy to configure nginx to require users to login and optionally be
members of particular groups.

This approach is designed to block access to all of JBrowse until authenticated
and is not suitable for excluding sub-sets of tracks.

The following block lists the installation method for the module and
dependancies with versions available at time of writing:

```
sudo apt-get install libldap2-dev
sudo apt-get install build-essential
sudo apt-get install libcurl4-openssl-dev
mkdir ldap_test
cd ldap_test/
wget http://nginx.org/download/nginx-1.10.1.tar.gz
tar zxf nginx-1.10.1.tar.gz
wget http://zlib.net/zlib-1.2.8.tar.gz
tar zxf zlib-1.2.8.tar.gz
wget ftp://ftp.csx.cam.ac.uk/pub/software/programming/pcre/pcre-8.37.tar.gz
tar zxf pcre-8.37.tar.gz
wget https://github.com/kvspb/nginx-auth-ldap/archive/master.zip
unzip master.zip
rm *.zip *.gz
cd nginx-1.10.1/
./configure --prefix=/jbrowse/nginx_ldap --with-zlib=../zlib-1.2.8 --with-pcre=../pcre-8.37 --with-http_ssl_module --add-module=../nginx-auth-ldap-master
make install
```

**_pcre2 is not compatible, you must use pcre-X.XX_**

The next block shows an example configuration that would be added to the 'http'
section of 'nginx.conf'

```
http {
 ...
 # for any user who successfully authenticates against LDAP
 ldap_server shared_site {
   # user search base.
   url "ldap://ldap-ro.internal.example.ac.uk/dc=example,dc=ac,dc=uk?uid?sub?objectClass=person";
   # bind as
   binddn "uid=WEBSERVER_USER,ou=people,dc=example,dc=ac,dc=uk";
   # bind pw
   binddn_passwd "WEBSERVER_USER_PW";
   # group attribute name which contains member object
   group_attribute member;
   # search for full DN in member object
   group_attribute_is_dn on;
   # matching algorithm (any / all)
   satisfy any;
   require valid_user;
 }
 # just our sub team
 ldap_server team_only
 {
   # exactly the same as above but adding:
   # list of allowed groups
   require group "CN=mygroup,OU=group,DC=example,DC=ac,DC=uk";
 }
```

You may need to use 'ldapsearch' or speak to your admins for help getting the
settings correct.

Once this is in place you can then limit the accessible locations by adding to
the 'server' section:

```
 server {
   ...
   # this is open access
   location / {
     root   html;
     index  index.html index.htm;
   }
   # these require authentication
   location /shared_site {
     auth_ldap "Restricted access cancer members only";
     auth_ldap_servers shared_site;
   }
   location /team_only {
     auth_ldap "Restricted access cgppc members only";
     auth_ldap_servers team_only;
   }
   ...
 }
```

If you place the 'auth_ldap\*' directives before the location sections then you
restrict all areas.

This was pieced together from the following pages:

- <https://github.com/kvspb/nginx-auth-ldap>
- <http://www.allgoodbits.org/articles/view/29>
