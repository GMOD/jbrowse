var SelectedItems = new Hash();
var selected_tracks_shown = false;

/**
 * sets the displayed tracks as selected tracks in the faceted browsing
 */
function start_faceted_browsing (currentSelection) {
    SelectedItems = new Hash();
    if(currentSelection) {
        console.log(currentSelection);
        currentSelection = String(currentSelection).split(",");
        for( var i = 0; i < currentSelection.length; i++) {
            SelectedItems.set(currentSelection[i],1);
            console.log(currentSelection[i]);
        }
        var selected = SelectedItems.keys();
    }
    else {
        var selected = [];
    }
    console.log(selected);
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
        console.log(id);
        console.log(SelectedItems.get(id));
        if (SelectedItems.get(id)) {
            d.addClassName('selected');
        } else {
            d.removeClassName('selected');
        }
    });

    // For IE
    var divs2 = document.getElementById('middle_column').children[1].children[0].children[1].children[1].children[0].children;
    for(var i = 0; i < divs2.length; i++) {
        var d = divs2[i].children[0];
        var id = d.getAttribute('ex:itemid');
        if (SelectedItems.get(id)) {
            d.addClassName('selected');
        } else {
            d.removeClassName('selected');
        }
    }
}

/**
 * sets the text at the top of the faceted browsing page
 */
function selected_tracks_text_none (){
    $('selection_count').innerHTML='no tracks selected. <br/><br/>Click on the track name below to display/hide the track.';
}
function selected_tracks_text_hidden (selected){
    $('selection_count').innerHTML  = ' <a href="javascript:clear_all()">clear selected tracks</a><br/><br/>Click on the track name below to display/hide the track.';
}
function selected_tracks_text_shown (selected) {
    $('selection_count').innerHTML  = ' <a href="javascript:clear_all()">clear selected tracks</a><br/><br/>Click on the track name below to display/hide the track.';
}

/**
 * Unselects all tracks/ removes all tracks from the display
 */
function clear_all () {
    SelectedItems = new Hash();
    var divs = $$('.submission');
    divs.each (function (d) {
        var id = d.getAttribute('ex:itemid');
        if (SelectedItems.get(id)) {
            d.addClassName('selected');
        } else {
            d.removeClassName('selected');
        }
    });
    selected_tracks_text_none();
    //$('selection_count').innerHTML = 'no tracks selected';
    parent.b.removeAllTracks();
}

/**
 * add the selected tracks to the displayed tracks 
 */
function load_tracks () {
    var selected = SelectedItems.keys();
    parent.b.removeAllTracks();
    parent.b.showTracks(selected.join(","));
}

/**
 * sets the color of the track in faceted browsing based 
 * on whether it is selected when it appears
 */   
function hilight_items (d) {
    //var divs = $$('.submission');
    if(d) {
        var id = d.getAttribute('ex:itemid');
        if (SelectedItems.get(id)) {
            d.addClassName('selected');
        } else {
            d.removeClassName('selected');
        }
    }
}

/**
 * expands the track node to show information about the track
 */
function show_more_info (arrow) {
    var container = arrow.ancestors().find(
    function(el) { return el.hasClassName('submission')});

    var id = container.getAttribute('ex:itemid');
    var children = container.children;
    arrow.style.display = "none";
    for(var i = 3; i < children.length; i++) {
        children[i].style.display = "block";
    }
}

/**
 * collapses the track node to hide the information about the track
 */
function hide_more_info (arrow) {
    var container = arrow.ancestors().find(
    function(el) { return el.hasClassName('submission')});

    var id = container.getAttribute('ex:itemid');
    var children = container.children;
    children[2].style.display = "";
    for(var i = 3; i < children.length; i++) {
        children[i].style.display = "none";
    }
}

/**
 * select/ unselect the track
 */
function toggle_track (container) {

    var id = container.getAttribute('ex:itemid');

    var turn_on = !container.hasClassName('selected');

    if (turn_on) {
        container.addClassName('selected');
        SelectedItems.set(id,1);
        parent.b.showTracks(id);
    } else {
        container.removeClassName('selected');
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
