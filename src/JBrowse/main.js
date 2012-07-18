define([ 'JBrowse/Browser', 'dojo/io-query' ], function (Browser,ioQuery) {
           var queryParams = ioQuery.queryToObject( window.location.search.slice(1) );
           var dataRoot = queryParams.data || 'data';
           return new Browser({
                                   containerID: "GenomeBrowser",
                                   refSeqs: dataRoot + "/seq/refSeqs.json",
                                   include: [
                                     'jbrowse_conf.json',
                                     dataRoot + "/trackList.json"
                                   ],
                                   nameUrl: dataRoot + "/names/root.json",
                                   defaultTracks: "DNA,gene,mRNA,noncodingRNA",
                                   queryParams: queryParams,
                                   location: queryParams.loc,
                                   forceTracks: queryParams.tracks,
                                   show_nav: queryParams.nav,
                                   show_tracklist: queryParams.tracklist,
                                   show_overview: queryParams.overview,
                                   config_list: queryParams.config
                               });
});
