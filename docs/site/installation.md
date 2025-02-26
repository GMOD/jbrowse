---
id: installation
title: Installation
---

At the most basic level, setting up JBrowse consists of placing a copy of the
JBrowse directory somewhere in the web-servable part of your server's file
system (often `/var/www` or `/var/www/html`) and then JBrowse simply is a
"static site" where it is just some HTML, Javascript, and CSS that can
dynamically fetch and understand data formats.

## What do I need to install JBrowse

There are a couple of pre-requisites that help with getting JBrowse setup
including

- \*nix operating system - MacOSX, Linux, or WSL on Windows
- Webserver - JBrowse is a static set of files, can be served with Apache or
  nginx
- Command line skills - Familiarity with the command line will help you follow
  this tutorial
- Sudo access - sudo is not necessary unless you need it to modify webserver
  files e.g. in /var/www

If you don't have all these things, consider using
[JBrowse Desktop](jbrowse_desktop.html), as this does not require command line
and is easy to use on all operating systems :)

## Important note about JBrowse plugins

If you are using JBrowse plugins, you will also want to install Node.js version
6 or over. Follow steps from
https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions
to install Node.js on Ubuntu to get the required Node.js, as the default
installed Node.js from APT can sometimes be lower than 6.

## Install system pre-requisites

Some system pre-requisites for a Ubuntu/WSL/Debian type system

    sudo apt install build-essential zlib1g-dev

On CentOS/RedHat

    sudo yum groupinstall "Development Tools"
    sudo yum install zlib-devel perl-ExtUtils-MakeMaker

## Download JBrowse minified release

Download a JBrowse release from GitHub

{@inject: setup_snip}

## Alternative JBrowse setup needed if you use plugins

JBrowse now bundles plugins at build time, so if you use plugins or want to
modify jbrowse source code yourself you must download the source code or use git
clone of https://github.com/GMOD/jbrowse

{@inject: setup_alt}

Note: use `npm run watch` to automatically pick up changes to the code that you
make (need to restart if you add or remove files though)

Also note: for users in China it has been recommended to set a mirror to npm
when you use this alternative setup

    npm config set registry http://r.cnpmjs.org
    npm config set puppeteer_download_host=http://cnpmjs.org/mirrors
    export ELECTRON_MIRROR="http://cnpmjs.org/mirrors/electron/"

## Congratulations

You should see a message that says "Congratulations, JBrowse is on the web" with
a link to the "Volvox example data"

If you don't see this then you may have missed a setup step
