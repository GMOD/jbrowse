# JBrowse docker image
FROM nginx
MAINTAINER Eric Rasche <esr@tamu.edu>
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get -qq update --fix-missing
RUN apt-get --no-install-recommends -y install git build-essential zlib1g-dev libxml2-dev libexpat-dev nodejs-legacy npm
RUN npm install -g bower
RUN git clone --depth 1 https://github.com/gmod/jbrowse
WORKDIR /jbrowse/
RUN bower --allow-root install
RUN ./setup.sh

RUN rm -rf /usr/share/nginx/html && ln -s /jbrowse/ /usr/share/nginx/html

VOLUME /data
