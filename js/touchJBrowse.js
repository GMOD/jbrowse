


function CompareObjPos(nodes, touch) {
   var samePos = 0,
       j= 0,
       top = touch.pageY;
   
   for (var i=0; i < nodes.length; i++) {
      samePos = j++;
      var position = findPos(nodes[i]);
      if(position.top > top) {
         break;
      }
   }
   return samePos;
}

function checkAvatarPosition(first) {
      var leftPane = document.getElementById("tracksAvail"),
          rigthPane = document.getElementById("container");
     
       if (first.pageX < (leftPane.offsetLeft + leftPane.offsetWidth)) 
        {
         return leftPane;
         }
      else {
        return rigthPane;
        }
}  

var startX;

function removeTouchEvents() {

startX = null;

}


function touchSimulated(event)
{
    if(event.touches.length <= 1) {
   
        var touches = event.changedTouches,
            first = touches[0],
            type1 = "",
            type2 = "mouseover",
            objAvatar = document.getElementsByClassName("dojoDndAvatar"),
            obj = {},
            pane = checkAvatarPosition(first),
            nodes = pane.getElementsByClassName("dojoDndItem"),
            element = {},  
            simulatedEvent_1 = document.createEvent("MouseEvent"),
            simulatedEvent_2 = document.createEvent("MouseEvent");
            

               switch (event.type) {
            
                case "touchstart": 
                    startX = first.pageX;
                    type1 = "mousedown";
                    break;
        
                case "touchmove": 
                    event.preventDefault();
                    type1 = "mousemove";
                    break;
            
                default:
                return;
              }
            

            
            
        
    
    simulatedEvent_1.initMouseEvent(type1, true, true, window, 1, first.pageX, first.pageY, first.clientX,              first.clientY,
                                  false, false, false, false, 0, null);
                                                                            

simulatedEvent_2.initMouseEvent(type2, true, true, window, 1, first.pageX, first.pageY, first.clientX, first.clientY,
                               false, false, false, false, 0, null);
     
                        
                     
    
    switch (event.type) {
            
                case "touchstart": 
                    first.target.dispatchEvent(simulatedEvent_1);
                    first.target.dispatchEvent(simulatedEvent_2);
                    initialPane = pane;
                    break;
                case "touchmove": 
                    
                    if(objAvatar.length > 0) {
                        if (nodes.length > 0) {
                            element = CompareObjPos(nodes,first);
                            obj = nodes[element];
                        }
     
                        try {
                            
                            if (initialPane != pane) {
                                var simulatedEvent_3 = document.createEvent("MouseEvent");
                                var type3 = "mouseout";
                                simulatedEvent_3.initMouseEvent(type3, true, true, window, 1, 
                                first.pageX, first.pageY, first.clientX, first.clientY,
                                false, false, false, false, 0, null);
                                initialPane.dispatchEvent(simulatedEvent_3);
                            }
                           obj.dispatchEvent(simulatedEvent_2);
                             obj.dispatchEvent(simulatedEvent_1);
                        
                        }
                        catch(err) 
                        {
                            //No Elements in the pane
                            pane.dispatchEvent(simulatedEvent_2);
                            pane.dispatchEvent(simulatedEvent_1);
                        }
                    }
                    break;
                            
                default:
                return;
            }
       
  }
  else {
   removeTouchEvents();
   } 
}

function touchEnd(event) {
         
        
         
        var touches = event.changedTouches,
            first = touches[0],
            type1 = "mouseup",
            type2 = "mouseover",
            objAvatar = document.getElementsByClassName("dojoDndAvatar"),
            obj = {},
            pane = checkAvatarPosition(first),
            nodes = pane.getElementsByClassName("dojoDndItem"),
            element = {},  
            simulatedEvent_1 = document.createEvent("MouseEvent"),
            simulatedEvent_2 = document.createEvent("MouseEvent");
            
            
             if (startX !==  first.pageX) {
             //slide ocurrs
             event.preventDefault();
             }
            
            var test = findPos(first.target);
            
simulatedEvent_1.initMouseEvent(type1, true, true, window, 1, first.pageX, first.pageY, first.clientX,              first.clientY,
                                  false, false, false, false, 0, null);
                                                                            

simulatedEvent_2.initMouseEvent(type2, true, true, window, 1, first.pageX, first.pageY, first.clientX, first.clientY,
                               false, false, false, false, 0, null);




                    if(objAvatar.length > 0) {   
                        if (nodes.length > 0) {
                           element = CompareObjPos(nodes,first);
                            obj = nodes[element];
                         }
                                                                                   
                        try {
                            obj.dispatchEvent(simulatedEvent_2);
                            obj.dispatchEvent(simulatedEvent_1);
                            }
                        catch(error) 
                            {
                            first.target.dispatchEvent(simulatedEvent_2);
                            pane.dispatchEvent(simulatedEvent_2);
                            }    
                        }
                    else {
                            first.target.dispatchEvent(simulatedEvent_1);
                            first.target.dispatchEvent(simulatedEvent_2);
                        }



   removeTouchEvents();
}

function touchHandle(event)
{
 
    dojo.query(".dojoDndItemAnchor").connect("touchstart", touchSimulated);
    dojo.query(".dojoDndItemAnchor").connect("touchmove", touchSimulated);
    dojo.query(".dojoDndItemAnchor").connect("touchend", touchEnd); 
    dojo.query(".dojoDndItemAnchor").connect("click" , function(){void(0);});
   
     if(event.touches.length <= 1) {
   
     
		 var touches = event.changedTouches,
		 first = touches[0],
		 type = "";
		 
		 
		 
		 switch(event.type)
		 {
			 case "touchstart": 
				 startX = first.pageX;
				 type = "mousedown";
				 break;
				 
			 case "touchmove": 
				 event.preventDefault();
				 type = "mousemove";
				 break;
				 
			 case "touchend": 
				 if (startX !==  first.pageX) {
					 //slide ocurrs
					 event.preventDefault();
				 }
				 type = "mouseup";
				 break;
				 
				 
			 default:
				 return;
		 }
		 
		 
		 var simulatedEvent = document.createEvent("MouseEvent");
		 
		 simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY,
									   false, false, false, false, 0/*left*/, null);
		 
		 first.target.dispatchEvent(simulatedEvent);
		 
	 }
	 else {
   removeTouchEvents();
   }
}




function touchinit() 
{
    dojo.query(".dojoDndItem").connect("touchstart", touchSimulated);
    dojo.query(".dojoDndItem").connect("touchmove", touchSimulated);
    dojo.query(".dojoDndItem").connect("touchend", touchEnd);
    
    dojo.query(".locationThumb").connect("touchstart", touchHandle);
    dojo.query(".locationThumb").connect("touchmove", touchHandle);
    dojo.query(".locationThumb").connect("touchend", touchHandle);
    
    dojo.query(".dojoDndItem").connect("click" , function(){void(0);});
    
    dojo.query(".dojoDndTarget").connect("touchstart", touchHandle);
    dojo.query(".dojoDndTarget").connect("touchmove", touchHandle);
    dojo.query(".dojoDndTarget").connect("touchend", touchHandle);
    
    dojo.query(".dijitSplitter").connect("touchstart", touchHandle);
    dojo.query(".dijitSplitter").connect("touchmove", touchHandle);
    dojo.query(".dijitSplitter").connect("touchend", touchHandle);
    
 }


function load()
{
  
    touchinit();
    document.documentElement.style.webkitTouchCallout = "none";
}

function findPos(obj) {
    var curtop = 0,
        objP = {};
	
    if (obj.offsetParent) {
	do {
			curtop += obj.offsetTop;
        } while ((obj = obj.offsetParent));
}

objP.top = curtop;

return objP;
}
