var SelectedItems = new Hash();
var selected_tracks_shown = false;

function start_faceted_browsing (currentSelection) {
    SelectedItems = new Hash();
    if(currentSelection) {
        currentSelection = String(currentSelection).split(",");
        for( var i = 0; i < currentSelection.length; i++) {
            SelectedItems.set(currentSelection[i],1);
        }
        var selected = SelectedItems.keys();
        }
    else {
        var selected = [];
    }
    if (selected.size() > 0) {
        if(selected_tracks_shown) {
            selected_tracks_text_shown(selected);
        } else {
            selected_tracks_text_hidden(selected);
        }
    } else {
        selected_tracks_text_none();
    }
    var divs = $$('.submission');
    divs.each (function (d) {
        var id = d.getAttribute('ex:itemid');
        if (SelectedItems.get(id)) {
            d.addClassName('selected');
            d.select('input')[0].checked=1;
        } else {
            d.removeClassName('selected');
            d.select('input')[0].checked=0;
        }
    });
}

function selected_tracks_text_none (){
    $('selection_count').innerHTML='no tracks selected';
}
function selected_tracks_text_hidden (selected){
    //$('selection_count').innerHTML   = selected.size()+' tracks selected';
    $('selection_count').innerHTML  = ' <a href="javascript:clear_all()">clear selected tracks</a>';
    //$('selection_count').innerHTML  += ' [<a href="javascript:show_track_names()">show selected track names</a>]';
}
function selected_tracks_text_shown (selected) {
    //$('selection_count').innerHTML   = selected.size()+' tracks selected';
    $('selection_count').innerHTML  = ' <a href="javascript:clear_all()">clear selected tracks</a>';
    //$('selection_count').innerHTML  += ' [<a href="javascript:hide_track_names()">hide selected track names</a>]';
    //$('selection_count').innerHTML  += '<br/> Selected tracks: '+ selected.join(", ");
}

function hide_track_names() {
    var selected = SelectedItems.keys();
    if (selected.size() > 0) {
        selected_tracks_text_hidden(selected);
    } else {
        selected_tracks_text_none();
    }
    selected_tracks_shown = false;
}

function show_track_names() {
    var selected = SelectedItems.keys();
    if (selected.size() > 0) {
        selected_tracks_text_shown(selected);
    } else {
        selected_tracks_text_none();
    }
    selected_tracks_shown = true;
}

function clear_all () {
    SelectedItems = new Hash();
    var divs = $$('.submission');
    divs.each (function (d) {
        var id = d.getAttribute('ex:itemid');
        if (SelectedItems.get(id)) {
            d.addClassName('selected');
            d.select('input')[0].checked=1;
        } else {
            d.removeClassName('selected');
            d.select('input')[0].checked=0;
        }
    });
    $('selection_count').innerHTML = 'no tracks selected';
    parent.b.removeAllTracks();
}

function load_tracks () {
    var selected = SelectedItems.keys();
    parent.b.removeAllTracks();
    parent.b.showTracks(selected.join(","));

    /*if (selected.size() > 0) {
        b.hideAllTrackList();
        for(var i = 0; i < selected.size(); i++) {
            b.showTrackListNode(selected[i]);
        }
    } else {
      b.showAllTrackList();
    }*/
}
     
function hilight_items (d) {
    var divs = $$('.submission');
    if(d) {
    var id = d.getAttribute('ex:itemid');
        if (SelectedItems.get(id)) {
            d.addClassName('selected');
            d.select('input')[0].checked=1;
        } else {
            d.removeClassName('selected');
            d.select('input')[0].checked=0;
        }
    }
}

function toggle_track (container) {
    var id = container.getAttribute('ex:itemid');
        
    turn_on = !container.hasClassName('selected');

    if (turn_on) {
        container.addClassName('selected');
        SelectedItems.set(id,1);
        container.select('input')[0].checked=1;
        parent.b.showTracks(id);
    } else {
        container.removeClassName('selected');
        container.select('input')[0].checked=0;
        SelectedItems.unset(id);
        parent.dijit.getEnclosingWidget(parent.dojo.byId("label_"+id).firstChild).onClick();
    }
    var selected = SelectedItems.keys();
    if (selected.size() > 0) {
        if(selected_tracks_shown) {
            selected_tracks_text_shown(selected);
        } else {
            selected_tracks_text_hidden(selected);
        }
    } else {
        selected_tracks_text_none();
    }
}

