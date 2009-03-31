include mk/binaries.mk

JROOT = $(CURDIR)
include mk/standard.mk

default: binaries

all: binaries jbrowse

clean: binaries-clean jbrowse-clean

.PHONY: default all clean

.SECONDARY:
