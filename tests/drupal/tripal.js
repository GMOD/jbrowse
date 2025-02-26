if (Drupal.jsEnabled) {
  function tripal_get_base_url() {
    // Get the base url. Drupal can not pass it through a form so we need
    // to get it ourself. Use different patterns to match the url in case
    // the Clean URL function is turned on
    var baseurl = location.href.substring(
      0,
      location.href.lastIndexOf('/?q=/node'),
    )
    if (!baseurl) {
      var baseurl = location.href.substring(
        0,
        location.href.lastIndexOf('/node'),
      )
    }
    if (!baseurl) {
      // This base_url is obtained when Clena URL function is off
      var baseurl = location.href.substring(
        0,
        location.href.lastIndexOf('/?q=node'),
      )
    }
    if (!baseurl) {
      // The last possibility is we've assigned an alias path, get base_url til the last /
      var baseurl = location.href.substring(0, location.href.firstIndexOf('/'))
    }
    return baseurl
  }
}
