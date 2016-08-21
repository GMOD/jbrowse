var commentStats = [];
var dirty = false;

/**
 *  Load initial comment thread on site load
 */
var disqus_config = function () {
    this.page.identifier = "identifier_1";
};

/**
 * Load exisiting thread and refresh disqus comments section
 */
function reload(identifier) {
    DISQUS.reset({
        reload: true,
        config: function () {
            this.page.identifier = identifier;
        }
    });
}

/**
 * Start a new thread and refresh disqus comment section
 */
function startThread(url, identifier, title) {
    DISQUS.reset({
        reload: true,
        config: function () {
            this.page.identifier = identifier;
            this.page.url = url;
            this.page.title = title;
        }
    });
}

/**
 * Fetch comment counts per thread
 */
function describeThreads(callback) {
    DISQUSWIDGETS.getCount({
        reset: true
    });
    $.ajax({
        type: 'GET',
        url: "https://disqus.com/api/3.0/threads/list.json",
        data: {
            api_key: '4qbBkNnB0MPR3NjwsqKEj3zovR7XKiWLFgJTCbj4Hqj7nnXtBjs26s4BD03b5UqS',
            forum: 'jbrowse',
            limit: 100
        },
        cache: false,
        dataType: 'jsonp',
        success: function (data) {
            var threads = data.response;
            var changes = [];
            for (var i = 0; i < threads.length; i++) {
                var thread = threads[i];
                var id = thread.identifiers[0];
                var postCount = thread.posts;
                var likes = thread.likes;
                var title = thread.title;

                if (!commentStats[id]) {
                    commentStats[id] = {};
                }
                commentStats[id].oldCount = commentStats[id].newCount || 0;
                commentStats[id].newCount = postCount;

                if (commentStats[id].newCount !== commentStats[id].oldCount) {
                    changes[id] = commentStats[id].newCount - commentStats[id].oldCount;
                }
            }
            console.log(commentStats);
            if (callback) {
                callback(changes);
            }
            dirty = true;
            return changes;
        }
    });
}

/**
 * Fetch comment counts per thread using span element
 */
function describeThreadsWs(callback) {
    DISQUSWIDGETS.getCount({
        reset: true
    });
    require(['dojo/query'],function(query){
        var threads = query('.disqus-comment-count');
        var changes = [];
        for (var i = 0; i < threads.length; i++) {
            var thread = threads[i];
            var id = thread.dataset.disqusIdentifier;
            var postMessage = thread.innerHTML;

            if (!commentStats[id]) {
                commentStats[id] = {};
            }
            commentStats[id].oldMessage = commentStats[id].newMessage || '';
            commentStats[id].newMessage = postMessage;

            if (commentStats[id].newMessage !== commentStats[id].oldMessage && postMessage !== "0 Comments") {
                changes[id] = 1;
            }
        }
        if (callback) {
            callback(changes);
        }
        dirty = true;
        return changes;
    });
}

(function () { // DON'T EDIT BELOW THIS LINE
    var d = document, s = d.createElement('script');
    s.src = '//jbrowse.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
})();