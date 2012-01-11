var message="Copyright 1997 by Topher's Castle. WARNING! All content contained within this site is protected by copyright laws. Unauthorized use of our material is strictly prohibited. Yada Yada.  Thank you for your understanding.";
function click(e) { 
    if (document.all) { 
        if (event.button==2||event.button==3) {
            alert(message); 
            return false; 
        } 
    } 
    if (document.layers) {
        if (e.which == 3) {
            alert(message); 
            return false; 
        } 
    }
    return true;
}
if (document.layers) {
    document.captureEvents(Event.MOUSEDOWN); 
}
document.onmousedown = click; 
