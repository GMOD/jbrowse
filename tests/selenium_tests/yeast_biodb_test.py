from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
from subprocess import check_call as call
import os
import shutil
import time

def test_yeast():
    format_yeast()
    browser = webdriver.Firefox() # Get local session of firefox
    browser.get("file://%s/test_harness.html?data=sample_data/json/yeast" % os.getcwd() ) # Load page

    # check a good browser title
    assert "chrI" in browser.title

    # check that we have the appropriate tracks
    genes_track = assert_element( browser, '//div[@class="tracklist-label"]' )
    assert genes_track.text == 'Protein-coding genes', "first track was called %s instead of %s" % (first_track.text, 'Protein-coding genes')

    # do a test where we search for a certain gene using the search box
    search_yal024c(browser)

def search_yal024c(browser):

    # check that a YAL024C feature label is not yet in the DOM
    yal024_xpath = "//div[@class='feature-label'][contains(.,'YAL024C')]"
    try:
        browser.find_element_by_xpath( yal024_xpath )
        assert 0, ( "YAL024C is already in the DOM at load time, something is wrong" )
    except NoSuchElementException:
        pass

    # Find the query box and put YAL024C into it and hit enter
    qbox = browser.find_element_by_id("location")
    qbox.clear()
    qbox.send_keys( "YAL024C" + Keys.RETURN )

    # test that YAL024C appeared in the DOM (TODO: check that it's
    # actually centered in the window), and that the protein-coding
    # genes track is now selected
    label = assert_element( browser, yal024_xpath )
    assert label.text == 'YAL024C';

    browser.close()
    pass;

def assert_element( browser, xpathExpression ):
    try:
        el = browser.find_element_by_xpath( xpathExpression )
    except NoSuchElementException:
        assert 0, ( "can't find %s" % xpathExpression )
    return el

def format_yeast():
    os.chdir('sample_data/json')
    os.environ['PATH'] = "../../bin:" + os.environ['PATH']
    call( "rm -rf yeast/", shell=True )
    call( "prepare-refseqs.pl --fasta ../raw/yeast_scaffolds/chr1.fa --fasta ../raw/yeast_scaffolds/chr2.fa  --out yeast/", shell=True )
    call( "biodb-to-json.pl --conf ../raw/yeast.json --out yeast/", shell=True )
    call( "generate-names.pl --dir yeast/", shell=True )
    os.chdir('../..')


# $ENV{PATH} = "../../bin:$ENV{PATH}";

# chdir 'sample_data/json';

# system 'rm -rf yeast/';
# system qw( prepare-refseqs.pl
#            --fasta ../raw/yeast_scaffolds/chr1.fa
#            --fasta ../raw/yeast_scaffolds/chr2.fa
#            --out yeast/
#          );
# system qw(
#          );

# # system qw( flatfile-to-json.pl
# #            --gff ../raw/yeast_chr1+2/yeast_chr1+2.gff3
# #            --tracklabel Genes
# #            --cssClass feature5
# #            --type gene
# #            --
# #            --out yeast/
# #          );
# #	flatfile-to-json.pl --gff ../raw/yeast_chr1+2/yeast_chr1+2.gff3 --autocomplete all --tracklabel Genes --getSubs --type gene --getLabel --urltemplate 'http://example.com/foo/genes/{id}' --out yeast/;
# #	flatfile-to-json.pl --gff ../raw/yeast_chr1+2/yeast_chr1+2.gff3 --autocomplete all --tracklabel Repeats --getSubs --type repeat_region --getLabel --urltemplate 'http://example.com/foo/repeats/{id}' --out yeast/;

# system qw( generate-names.pl --dir yeast/ );

# ok 1;
# done_testing;
