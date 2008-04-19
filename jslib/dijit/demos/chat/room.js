if(!dojo._hasResource["dijit.demos.chat.room"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.demos.chat.room"] = true;
dojo.provide("dijit.demos.chat.room"); 

dojo.require("dojox.cometd");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.declare("dijit.demos.chat.Room",
	[dijit._Widget,dijit._Templated],
	{

	_last: "",
	_username: null,
	roomId: "public",
	isPrivate: false,
	prompt: "Name:",

	templateString: '<div id="${id}" class="chatroom">'
				+'<div dojoAttachPoint="chatNode" class="chat"></div>'
				+'<div dojoAttachPoint="input" class="input">'
					+'<div dojoAttachPoint="joining">'
						+'<span>${prompt}</span><input class="username" dojoAttachPoint="username" type="text" dojoAttachEvent="onkeyup: _join"> <input dojoAttachPoint="joinB" class="button" type="submit" name="join" value="Contact" dojoAttachEvent="onclick: _join"/>'
					+'</div>'
					+'<div dojoAttachPoint="joined" class="hidden">'
						+'<input type="text" class="phrase" dojoAttachPoint="phrase" dojoAttachEvent="onkeyup: _cleanInput" />'
						+'<input type="submit" class="button" value="Send" dojoAttachPoint="sendB" dojoAttachEvent="onclick: _sendPhrase"/>'
					+'</div>'
				+'</div>'
			+'</div>',

	join: function(name){
		if(name == null || name.length==0){
			alert('Please enter a username!');
		}else{
			if(this.isPrivate){ this.roomId = name; } 
			this._username=name;
			this.joining.className='hidden';
			this.joined.className='';
			this.phrase.focus();
			console.log(this.roomId); 
			dojox.cometd.subscribe("/chat/demo/" + this.roomId, this, "_chat");
			dojox.cometd.publish("/chat/demo/" + this.roomId, { user: this._username, join: true, chat : this._username+" has joined the room."});
			dojox.cometd.publish("/chat/demo", { user: this._username, joined: this.roomId });
		}
	},

	_join: function(/* Event */e){
		var key = (e.charCode == dojo.keys.SPACE ? dojo.keys.SPACE : e.keyCode);
		if (key == dojo.keys.ENTER || e.type=="click"){
			this.join(this.username.value); 
		}
	},

	leave: function(){ 
		dojox.cometd.unsubscribe("/chat/demo/" + this.roomId, this, "_chat");
		dojox.cometd.publish("/chat/demo/" + this.roomId, { user: this._username, leave: true, chat : this._username+" has left the chat."});

		// switch the input form back to login mode
		this.joining.className='';
		this.joined.className='hidden';
		this.username.focus();
		this._username=null;
	},
	
	chat: function(text){
		// summary: publish a text message to the room
		if(text != null && text.length>0){
			// lame attempt to prevent markup
			text=text.replace(/</g,'&lt;');
			text=text.replace(/>/g,'&gt;');
			dojox.cometd.publish("/chat/demo/" + this.roomId, { user: this._username, chat: text});
		}
	},

	_chat: function(message){
		// summary: process an incoming message
		if (!message.data){
			console.warn("bad message format "+message);
			return;
		}
		var from=message.data.user;
		var special=message.data.join || message.data.leave;
		var text=message.data.chat;
		if(text!=null){
			if(!special && from == this._last ){ from="...";
			}else{
				this._last=from;
				from+=":";
			}

			if(special){
				this.chatNode.innerHTML += "<span class=\"alert\"><span class=\"from\">"+from+"&nbsp;</span><span class=\"text\">"+text+"</span></span><br/>";	
				this._last="";
			}else{
				this.chatNode.innerHTML += "<span class=\"from\">"+from+"&nbsp;</span><span class=\"text\">"+text+"</span><br/>";
				this.chatNode.scrollTop = this.chatNode.scrollHeight - this.chatNode.clientHeight;    
			}
		}
	},

	startup: function(){ 
		this.joining.className='';
		this.joined.className='hidden';
		//this.username.focus();
		this.username.setAttribute("autocomplete","OFF");
		if (this.registeredAs) { this.join(this.registeredAs); } 
		this.inherited("startup",arguments); 
	},

	_cleanInput: function(/* Event */e){
		var key = (e.charCode == dojo.keys.SPACE ? dojo.keys.SPACE : e.keyCode);
		if(key == dojo.keys.ENTER || key == 13){
			this.chat(this.phrase.value);
          		this.phrase.value='';
		}
	},

	_sendPhrase: function(/* Event */e){
		if (this.phrase.value){
			this.chat(this.phrase.value);
			this.phrase.value='';
		}
	}
});

}
