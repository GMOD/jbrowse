// https://www.senate.gov/general/committee_assignments/assignments.htm
// use jQuerify bookmarklet
// run this on the js console

var obj, committees, i, com;
obj = {
    "items": [],
    "types" :      {
        "Senator" :   {
            "pluralLabel" : "Senators",
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#Senator"
        },
        "Committee" : {
            "pluralLabel" : "Committees",
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#Committee"
        }
    },
    "properties" : {
        "state" :           {
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#state"
        },
        "party" :           {
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#party"
        },
        "familyName" :      {
            "uri" : "http://xmlns.com/foaf/0.1/familyName"
        },
        "hasMember" :       {
            "uri" :       "http://simile.mit.edu/2007/05/senate-ns#hasMember",
            "valueType" : "item"
        },
        "givenName" :       {
            "uri" : "http://xmlns.com/foaf/0.1/givenName"
        },
        "committeeMember" : {
            "uri" :       "http://simile.mit.edu/2007/05/senate-ns#committeeMember",
            "valueType" : "item"
        },
        "generatedBy" :     {
            "uri" :       "http://simile.mit.edu/2005/04/piggy-bank#generatedBy"
,
            "valueType" : "item"
        },
        "homepage" :        {
            "uri" : "http://xmlns.com/foaf/0.1/homepage"
        },
        "originURL" :       {
            "uri" :       "http://simile.mit.edu/2005/04/piggy-bank#originURL",
            "valueType" : "item"
        },
        "stateLatLng" :     {
            "uri" : "http://simile.mit.edu/2007/05/senate-ns#stateLatLng"
        },
        "originTitle" :     {
            "uri" : "http://simile.mit.edu/2005/04/piggy-bank#originTitle"
        }
    }
};
committees = {};
i = 1;

$("td.contenttext table tbody tr").filter(function(idx) {
    return (idx > 1 && idx % 2 === 0);
}).each(function(idx, el) {
    var senobj, senator, site, names, partystate, c, uri;
    senobj = {
        "type": "Senator",
        "originURL": document.location.href,
        "originTitle": document.title,
        "uri": "http://simile.mit.edu/2007/05/senate#senator" + i++
    };
    senator = $("td:eq(0) a", this).text();
    site = $("td:eq(0) a", this).attr('href');
    senobj.homepage = site.substr(23).substring(0, site.length-26);

    names = senator.split(/,/, 3);
    senobj.familyName = names[0];
    senobj.givenName = names[1].substring(1);
    senobj.label = senobj.givenName + " " + senobj.familyName;
    if (names.length > 2) {
        senobj.label += "," + names[2];
    }

    partystate = $("td:eq(0)", this).text();
    partystate = partystate.substring(partystate.indexOf("("));
    partystate = partystate.replace("(","").replace(")","");
    senobj.party = partystate.split("-")[0];
    senobj.state = partystate.split("-")[1];
    senobj.committeeMember = [];

    $("td:eq(1) a", this).each(function(idx, el){
        c = $(this).text();
        uri = "https://www.senate.gov" + $(this).attr("href");
        senobj.committeeMember.push(c);
        if (typeof committees[c] === "undefined") {
            committees[c] = {
                "label": c,
                "type": "Committee",
                "originURL": document.location.href,
                "originTitle": document.title,
                "uri": uri,
	        "hasMember": []
            };
        }
        committees[c].hasMember.push(senobj.label);
    });
    obj.items.push(senobj);
});
for (com in committees) {
    obj.items.push(committees[com]);
}
JSON.stringify(obj);
