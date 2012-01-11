/*======================================================================
 *  RemoteLog
 *
 *  This is a singleton that permis logging of key-valued data to a 
 *  remote location. 
 *======================================================================
 */
 
SimileAjax.RemoteLog = {
    defaultURL:"http://groups.csail.mit.edu/haystack/facetlog/logger.php", 
    url:null,
    logActive: false
};

SimileAjax.RemoteLog.possiblyLog = function(vals) {
    if ((SimileAjax.RemoteLog.logActive) && (SimileAjax.RemoteLog.url != null)) {
        vals["url"] = window.location.href;
	try {
        SimileAjax.jQuery.ajax({type:'POST',url:SimileAjax.RemoteLog.url,data:vals});        
	}
	catch (e) {}
    }
};

