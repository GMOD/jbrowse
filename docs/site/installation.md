---
id: installation
title: Installation
---

At the most basic level, setting up JBrowse consists of placing a copy of the JBrowse directory somewhere in the web-servable part of your server's file system (often `/var/www` or `/var/www/html`) and then JBrowse simply is a "static site" where it is just some HTML, Javascript, and CSS that can dynamically fetch and understand data formats.


## What do I need to install JBrowse

There are a couple of pre-requisites that help with getting JBrowse setup including

- *nix operating system - MacOSX, Linux, or WSL on Windows
- Webserver - JBrowse is a static set of files, can be served with Apache or nginx
- Command line skills - Familiarity with the command line will help you follow this tutorial
- Sudo access - sudo is not necessary unless you need it to modify webserver files e.g. in /var/www

If you don't have all these things, consider using [JBrowse Desktop](jbrowse_desktop.html), as this does not require command line and is easy to use on all operating systems :)


## Important note about JBrowse plugins

If you are using  JBrowse plugins, you will also want to install Node.js version 6 or over. Follow steps from https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions to install Node.js on Ubuntu to get the required Node.js, as the default installed Node.js from APT can sometimes be lower than 6.


## Install system pre-requisites

Some system pre-requisites for a Ubuntu/WSL/Debian type system

    sudo apt install build-essential zlib1g-dev

On CentOS/RedHat

    sudo yum groupinstall "Development Tools"
    sudo yum install zlib-devel perl-ExtUtils-MakeMaker

## Download JBrowse


Download a JBrowse release from GitHub


{@inject: setup_snip}

**IMPORTANT NOTE: if you are using JBrowse plugins, you must download the source code or use git clone of https://github.com/GMOD/jbrowse instead of the minified release. Then you must run ./setup.sh or npm run build/npm run watch when you are adding or building plugin code or the jbrowse source code**


Source code:

 {@inject: download_snip}
