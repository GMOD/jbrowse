import os
import sys
import time
sys.path.append( 'tests/selenium_tests' ) # relative to JBrowse root

from jbrowse_selenium import JBrowseTest

class WebApolloTest (JBrowseTest):

    wa_url = None

    def setUp( self ):
        super( WebApolloTest, self ).setUp()
        self.login( os.environ['WA_USER'], os.environ['WA_PASS'] )
        self.browser.get( self.baseURL() )

    def baseURL( self ):
        return self.waURL()+'/jbrowse/index.html'

    def waURL( self ):
        if not self.wa_url:
            self.wa_url = os.environ['WA_URL']
        return self.wa_url

    def login( self, username, password ):
        self.browser.get( self.waURL() + '/Login' );
        username_input = self.assert_element('//input[@id="username"]')
        password_input = self.assert_element('//input[@id="password"]')
        username_input.send_keys(username)
        password_input.send_keys(password)
        login_button = self.assert_element('//button[@id="login_button"]')
        login_button.click()
        time.sleep( 0.4 )
        pass

