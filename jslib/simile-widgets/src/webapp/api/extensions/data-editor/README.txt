USING THE EVENT LIFECYCLE
- 10th Oct 2011 - 

So you want to write some code to integrate into the editor extension,
probably to save Exhibit's data into some exotic format like an SQL database
or a triplestore?  This guide is for you...


-----------------------------------------------------------------------
1. Events
-----------------------------------------------------------------------

The Data Editor Extension provides an event lifecycle for JavaScript 
programmers, primarily to permit persistence extensions to work with the
editor extension.  In order to work with the event lifecycle it is useful 
to know the lifecycle of the editor extension itself:
 - when a page loads featuring the editor extension, 'initialisation' scans 
   the markup looking for editor tags.
 - An editor toggle button (either added explicitly via 
   ex:role="editorActivateButton" attributes, or placed by default during 
   initialisation) switches between the normal Exhibit display mode and the 
   editor mode.  When in the editor mode, item lens can be clicked on to be 
   edited.
 - When an item is clicked, it's HTML is translated into an edit lens.  If 
   the page did not define an edit lens, one is created from the display 
   lens markup.
 - If a ex:role="editorSaveButton" element is defined inside an edit lens, 
   the editor extension saves the whole item in one go when said 'save' 
   element is clicked; otherwise the item is saved field by field as the
   input focus leave each UI element.

Each event fires *after* the action it describes has happened.  So, onInit()
is fired after initialisation.  A parallel set of events, onBeforeX, fire 
before the action, and permit the action to be aborted.

boolean  onBeforeInit()
void     onInit()
  Runs at start/end of the initialisation phase, before and after the HTML
  is scanned for editor markup.  Return false from onBeforeInit() to cancel 
  initalisation (page will not be editable).

boolean   onBeforeActivate()
void      onActivate()
  Runs at start/end of switching from display mode to edit mode.  Return 
  false from onBeforeActivate() to cancel activation (edit mode will not 
  be entered).

boolean   onBeforeActivateClose()
void      onActivateClose()
  Runs at start/end of switching from edit mode to display mode.  Return 
  false from onActivateClose() to cancel close (edit mode will not be 
  exited).
  
boolean   onBeforeEdit(itemId)
void      onEdit(itemId)
  Runs at start/end of showing an edit lens (when in edit mode).  Param 
  'itemId' is the id of the selected item.  Return false from onBeforeEdit() 
  to cancel edit lens display for that item (editor UI will not be displayed).

boolean   onBeforeDelete(itemId)
void      onDelete(itemId)
  Runs at start/end of deleting an item (when in edit mode).  Param 
  'itemId' is the id of the selected item.  Return false from onBeforeDelete() 
  to cancel deletion.

boolean   onBeforeClone(src_itemId)
item      onCloning(src_itemId,new_itemId,item)
void      onClone(src_itemId)
  Runs during item cloning (when in edit mode).  Param 'src_itemId' is the 
  source item id.  Return false from onBeforeClone() to cancel the clone.
  The onCloning() event gives access to the item object before it is
  saved into the Exhibit database.  The item will have been assigned a 
  unique id or label (new_itemId) based on the source item id or label.
  
boolean   onBeforeSave(itemId,item)
boolean   onSave(itemId,item)
  Runs at start/end of a save operation, when: (a) the editor has no [SAVE] 
  button and the focus of a field changes, or (b) the editor has a [SAVE] 
  button and the button is clicked.  Param 'itemId' is the id of the selected 
  item, and 'item' is the data being saved.  In the case of '(a)', item has 
  one property.  Return false from onBeforeSave() to cancel the save (data will 
  not be saved into Exhibit database).  Return false from onSave() to indicate
  a failure to save data, otherwise true if persistence was successful.
  (See Exhibit.DataEdit.onSaveFailed() later).

boolean   onBeforeCancel()
void      onCancel()
  Runs at start/end if [CANCEL] button being clicked (if edit lens containts
  [CANCEL] button.  This event isn't all that useful at them moment, as the
  editor extension only allows one item to be edited per activation, so the 
  [CANCEL] button just switches back to display mode (causing the
  onBeforeActivateClose()/onActivateClose() to run anyway).
  

-----------------------------------------------------------------------
2. Creating an event handler
-----------------------------------------------------------------------
  
More than one handler can be assigned to each event.  To add handlers, create a
JavaScript object with functions assigned to appropriate properties, passing it
to Exhibit.DataEdit.addEventHandler(), like so:

<script type="text/javascript">
  if(window['console']) {
    var t = 'Event';
    Exhibit.DataEdit.addEventHandler({
      onBeforeInit :          function() { console.log(t,'onBeforeInit'); return true; } ,
      onInit :                function() { console.log(t,'onInit'); } ,
      onBeforeActivate :      function() { console.log(t,'onBeforeActivate'); return true; } ,
      onActivate :            function() { console.log(t,'onActivate'); } ,
      onBeforeActivateClose : function() { console.log(t,'onBeforeActivateClose'); return true; } ,
      onActivateClose :       function() { console.log(t,'onActivateClose'); } ,
      onBeforeEdit :          function(id) { console.log(t,'onBeforeEdit',id); return true; } ,
      onEdit :                function(id) { console.log(t,'onEdit',id); } ,
      onBeforeSave :          function(id,item) { console.log(t,'onBeforeSave',id,item); return true; } ,
      onSave :                function(id,item) { 
        console.log(t,'onSave',id,item);
        Exhibit.DataEdit.addOnSaveFailedMessage("Something bad happened!");
        return false;  // Failure!
      } ,
      onBeforeCancel :        function() { console.log(t,'onBeforeCancel'); return true; } ,
      onCancel :              function() { console.log(t,'onCancel'); } 
    });
    Exhibit.DataEdit.onSaveFailed = function(msgs) { 
      for(var i=0;i<msgs.length;i++) { console.log("ERROR: "+msgs[i]); } 
    }
  }
</script>

The above code registers a handler for every event type, logging each call to 
console.log().  The onSave() function returns false -- simulating a failure 
to persist data.


-----------------------------------------------------------------------
3. Handling onSave() failures.
-----------------------------------------------------------------------

When an event handler onSave() action fails, one problem is to know how to 
signal that failure to the user.  For example, suppose someone wrote an
extension to save Exhibit data to an SQL database: the page author merely
includes a JavaScript reference; the necessary code is loaded and promptly 
registers itself for the editor's onSave() action so to persist items to the
database.  If the database operation fails, for whatever reason, this needs 
to be relayed to the end user -- but this involves the SQL extension 
concerning itself with the user interface and 'user experience', which is 
messy.

I much cleaner solution is for the editor extension to provide a formal means
of allowing onSave() failures to be reported, and to provide an API for the
page author to display those errors.  This means the UI is entirely the domain
of the editor extension, and any persistence extensions don't need to worry
error reporting.

The editor extension does indeed maintain a formal mechanism to log errors, 
and for page authors to 'collect' them.  If a persistence extension wishes to
pass an error message back to the user (rather than just return false to
indicate failure), it can use Exhibit.DataEdit.addOnSaveFailedMessage() to 
record an error.  To 'collect' these errors the page author can implement a 
function at Exhibit.DataEdit.onSaveFailed, with an array as its parameter.

Note: if Exhibit.DataEdit.onSaveFailed is not assigned, by default the editor 
extension displays any onSave() messages using the JavaScript alert() dialog.
(In future, the editor extension may come bundled with more sophisticated 
options for error display, without authors requiring JavaScript knowledge.)