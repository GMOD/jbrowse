# location of TWiki
TWIKI = /usr/local/twiki

# copy things over to TWiki
install:
	ln -sf $(CURDIR)/JBrowsePlugin.pm $(CURDIR)/JBrowsePlugin $(TWIKI)/lib/TWiki/Plugins/
	ln -sf $(CURDIR)/JBrowsePlugin.txt $(TWIKI)/data/TWiki/
	test -d $(TWIKI)/data/TWiki/JBrowsePlugin || mkdir $(TWIKI)/data/TWiki/JBrowsePlugin
	ln -sf $(CURDIR)/JBrowsePlugin/Makefile.jbrowse $(TWIKI)/pub/TWiki/JBrowsePlugin/Makefile
