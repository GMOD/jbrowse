// http://thomas.loc.gov/cgi-bin/bdquery/?&Db=d112&querybd=@BAND(@FIELD(FLD010+@eq(20110802))+@FIELD(FLD007(11000)))
// Db=d(CONGRESS)
// eq(DATE)

// already loads an ancient version of jQuery, so no jQuerifying; run this first
// var sc = document.createElement("script");
// sc.type = "text/javascript";
// sc.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js";
// document.head.appendChild(sc);

var obj = {
    "items": [],
    "types" :  {
        "Bill" : {
            "pluralLabel" : "Bills",
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#Bill"
        }
    },
    "properties" : {
        "cosponsor" :    {
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#cosponsor"
        },
        "sponsor" :      {
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#sponsor"
        },
        "description" :  {
            "uri" : "http://purl.org/dc/elements/1.1/description"
        },
        "inCommittee" :  {
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#inCommittee"
        },
        "billHomepage" : {
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#billHomepage"
        }
    }
};

var congress;
var params = document.location.search.substring(1).split(/&/);
for (var i = 0; i < params.length; i++) {
     var param = params[i].split("=");
     if (param.length === 2) {
         if (param[0] === "Db") {
              congress = param[1].substring(1);
         }
     }
}

var parseName = function(s) {
    var r, a;
    a = s.substring(4).split(/,/, 3);
    r = a[1].substring(1) + " " + a[0];
    if (a.length > 2) {
        r += "," + a[2];
    }
    return r;
};

$('#content p:gt(0):not(:last)').each(function(idx, el) {
    var billobj = {
        "type": "Bill"
    };
    var id = $('a:eq(0)', this).text();
    billobj.label = id.substring(0, id.length - 1);

    var alltext = $(this).text();
    billobj.description = alltext.substring(alltext.indexOf(":")+3, alltext.indexOf("Sponsor:"));

    billobj.sponsor = parseName($('a:eq(1)', this).text());

    var com = alltext.substring(alltext.indexOf("Committees: ")+12, alltext.indexOf("Latest Major Action:"));
    com = com.substring(0, com.length-1).replace("Senate ", "");
    if (com === "Judiciary") {
       com = "the " + com;
    }
    billobj.inCommittee = "Committee on " + com;

    billobj.uri = "http://thomas.loc.gov/cgi-bin/query/z?c" + congress + ":" + billobj.label + ":";
    billobj.billHomepage = billobj.uri;
    billobj.congress = parseInt(congress, 10);

    billobj.cosponsor = [];
    if ($('b:eq(2)', this).text() !== "Cosponsors") {
        var colink = $('a:eq(2)', this).attr('href');
        $.ajax({
	    "url": colink,
            "async": false,
            "dataType": "html",
            "success": function(data, status, xhr) {
		$('a[name]', $(data)[40]).next().next().children('a').each(function(idx, el) {
                    billobj.cosponsor.push(parseName($(this).text()));
                });
            }
        });
    }

    obj.items.push(billobj);
});
JSON.stringify(obj);

