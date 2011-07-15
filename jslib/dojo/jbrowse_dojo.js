/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is an optimized version of Dojo, built for deployment and not for
	development. To get sources and documentation, please visit:

		http://dojotoolkit.org
*/

if(!dojo._hasResource["dojo.dnd.common"]){
dojo._hasResource["dojo.dnd.common"]=true;
dojo.provide("dojo.dnd.common");
dojo.getObject("dnd",true,dojo);
dojo.dnd.getCopyKeyState=dojo.isCopyKey;
dojo.dnd._uniqueId=0;
dojo.dnd.getUniqueId=function(){
var id;
do{
id=dojo._scopeName+"Unique"+(++dojo.dnd._uniqueId);
}while(dojo.byId(id));
return id;
};
dojo.dnd._empty={};
dojo.dnd.isFormElement=function(e){
var t=e.target;
if(t.nodeType==3){
t=t.parentNode;
}
return " button textarea input select option ".indexOf(" "+t.tagName.toLowerCase()+" ")>=0;
};
}
if(!dojo._hasResource["dojo.date.stamp"]){
dojo._hasResource["dojo.date.stamp"]=true;
dojo.provide("dojo.date.stamp");
dojo.getObject("date.stamp",true,dojo);
dojo.date.stamp.fromISOString=function(_1,_2){
if(!dojo.date.stamp._isoRegExp){
dojo.date.stamp._isoRegExp=/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
}
var _3=dojo.date.stamp._isoRegExp.exec(_1),_4=null;
if(_3){
_3.shift();
if(_3[1]){
_3[1]--;
}
if(_3[6]){
_3[6]*=1000;
}
if(_2){
_2=new Date(_2);
dojo.forEach(dojo.map(["FullYear","Month","Date","Hours","Minutes","Seconds","Milliseconds"],function(_5){
return _2["get"+_5]();
}),function(_6,_7){
_3[_7]=_3[_7]||_6;
});
}
_4=new Date(_3[0]||1970,_3[1]||0,_3[2]||1,_3[3]||0,_3[4]||0,_3[5]||0,_3[6]||0);
if(_3[0]<100){
_4.setFullYear(_3[0]||1970);
}
var _8=0,_9=_3[7]&&_3[7].charAt(0);
if(_9!="Z"){
_8=((_3[8]||0)*60)+(Number(_3[9])||0);
if(_9!="-"){
_8*=-1;
}
}
if(_9){
_8-=_4.getTimezoneOffset();
}
if(_8){
_4.setTime(_4.getTime()+_8*60000);
}
}
return _4;
};
dojo.date.stamp.toISOString=function(_a,_b){
var _c=function(n){
return (n<10)?"0"+n:n;
};
_b=_b||{};
var _d=[],_e=_b.zulu?"getUTC":"get",_f="";
if(_b.selector!="time"){
var _10=_a[_e+"FullYear"]();
_f=["0000".substr((_10+"").length)+_10,_c(_a[_e+"Month"]()+1),_c(_a[_e+"Date"]())].join("-");
}
_d.push(_f);
if(_b.selector!="date"){
var _11=[_c(_a[_e+"Hours"]()),_c(_a[_e+"Minutes"]()),_c(_a[_e+"Seconds"]())].join(":");
var _12=_a[_e+"Milliseconds"]();
if(_b.milliseconds){
_11+="."+(_12<100?"0":"")+_c(_12);
}
if(_b.zulu){
_11+="Z";
}else{
if(_b.selector!="time"){
var _13=_a.getTimezoneOffset();
var _14=Math.abs(_13);
_11+=(_13>0?"-":"+")+_c(Math.floor(_14/60))+":"+_c(_14%60);
}
}
_d.push(_11);
}
return _d.join("T");
};
}
if(!dojo._hasResource["dojo.parser"]){
dojo._hasResource["dojo.parser"]=true;
dojo.provide("dojo.parser");
new Date("X");
dojo.parser=new function(){
var d=dojo;
function _15(_16){
if(d.isString(_16)){
return "string";
}
if(typeof _16=="number"){
return "number";
}
if(typeof _16=="boolean"){
return "boolean";
}
if(d.isFunction(_16)){
return "function";
}
if(d.isArray(_16)){
return "array";
}
if(_16 instanceof Date){
return "date";
}
if(_16 instanceof d._Url){
return "url";
}
return "object";
};
function _17(_18,_19){
switch(_19){
case "string":
return _18;
case "number":
return _18.length?Number(_18):NaN;
case "boolean":
return typeof _18=="boolean"?_18:!(_18.toLowerCase()=="false");
case "function":
if(d.isFunction(_18)){
_18=_18.toString();
_18=d.trim(_18.substring(_18.indexOf("{")+1,_18.length-1));
}
try{
if(_18===""||_18.search(/[^\w\.]+/i)!=-1){
return new Function(_18);
}else{
return d.getObject(_18,false)||new Function(_18);
}
}
catch(e){
return new Function();
}
case "array":
return _18?_18.split(/\s*,\s*/):[];
case "date":
switch(_18){
case "":
return new Date("");
case "now":
return new Date();
default:
return d.date.stamp.fromISOString(_18);
}
case "url":
return d.baseUrl+_18;
default:
return d.fromJson(_18);
}
};
var _1a={},_1b={};
d.connect(d,"extend",function(){
_1b={};
});
function _1c(cls,_1d){
for(var _1e in cls){
if(_1e.charAt(0)=="_"){
continue;
}
if(_1e in _1a){
continue;
}
_1d[_1e]=_15(cls[_1e]);
}
return _1d;
};
function _1f(_20,_21){
var c=_1b[_20];
if(!c){
var cls=d.getObject(_20),_22=null;
if(!cls){
return null;
}
if(!_21){
_22=_1c(cls.prototype,{});
}
c={cls:cls,params:_22};
}else{
if(!_21&&!c.params){
c.params=_1c(c.cls.prototype,{});
}
}
return c;
};
this._functionFromScript=function(_23,_24){
var _25="";
var _26="";
var _27=(_23.getAttribute(_24+"args")||_23.getAttribute("args"));
if(_27){
d.forEach(_27.split(/\s*,\s*/),function(_28,idx){
_25+="var "+_28+" = arguments["+idx+"]; ";
});
}
var _29=_23.getAttribute("with");
if(_29&&_29.length){
d.forEach(_29.split(/\s*,\s*/),function(_2a){
_25+="with("+_2a+"){";
_26+="}";
});
}
return new Function(_25+_23.innerHTML+_26);
};
this.instantiate=function(_2b,_2c,_2d){
var _2e=[],_2c=_2c||{};
_2d=_2d||{};
var _2f=(_2d.scope||d._scopeName)+"Type",_30="data-"+(_2d.scope||d._scopeName)+"-";
d.forEach(_2b,function(obj){
if(!obj){
return;
}
var _31,_32,_33,_34,_35,_36;
if(obj.node){
_31=obj.node;
_32=obj.type;
_36=obj.fastpath;
_33=obj.clsInfo||(_32&&_1f(_32,_36));
_34=_33&&_33.cls;
_35=obj.scripts;
}else{
_31=obj;
_32=_2f in _2c?_2c[_2f]:_31.getAttribute(_2f);
_33=_32&&_1f(_32);
_34=_33&&_33.cls;
_35=(_34&&(_34._noScript||_34.prototype._noScript)?[]:d.query("> script[type^='dojo/']",_31));
}
if(!_33){
throw new Error("Could not load class '"+_32);
}
var _37={};
if(_2d.defaults){
d._mixin(_37,_2d.defaults);
}
if(obj.inherited){
d._mixin(_37,obj.inherited);
}
if(_36){
var _38=_31.getAttribute(_30+"props");
if(_38&&_38.length){
try{
_38=d.fromJson.call(_2d.propsThis,"{"+_38+"}");
d._mixin(_37,_38);
}
catch(e){
throw new Error(e.toString()+" in data-dojo-props='"+_38+"'");
}
}
var _39=_31.getAttribute(_30+"attach-point");
if(_39){
_37.dojoAttachPoint=_39;
}
var _3a=_31.getAttribute(_30+"attach-event");
if(_3a){
_37.dojoAttachEvent=_3a;
}
dojo.mixin(_37,_2c);
}else{
var _3b=_31.attributes;
for(var _3c in _33.params){
var _3d=_3c in _2c?{value:_2c[_3c],specified:true}:_3b.getNamedItem(_3c);
if(!_3d||(!_3d.specified&&(!dojo.isIE||_3c.toLowerCase()!="value"))){
continue;
}
var _3e=_3d.value;
switch(_3c){
case "class":
_3e="className" in _2c?_2c.className:_31.className;
break;
case "style":
_3e="style" in _2c?_2c.style:(_31.style&&_31.style.cssText);
}
var _3f=_33.params[_3c];
if(typeof _3e=="string"){
_37[_3c]=_17(_3e,_3f);
}else{
_37[_3c]=_3e;
}
}
}
var _40=[],_41=[];
d.forEach(_35,function(_42){
_31.removeChild(_42);
var _43=(_42.getAttribute(_30+"event")||_42.getAttribute("event")),_32=_42.getAttribute("type"),nf=d.parser._functionFromScript(_42,_30);
if(_43){
if(_32=="dojo/connect"){
_40.push({event:_43,func:nf});
}else{
_37[_43]=nf;
}
}else{
_41.push(nf);
}
});
var _44=_34.markupFactory||_34.prototype&&_34.prototype.markupFactory;
var _45=_44?_44(_37,_31,_34):new _34(_37,_31);
_2e.push(_45);
var _46=(_31.getAttribute(_30+"id")||_31.getAttribute("jsId"));
if(_46){
d.setObject(_46,_45);
}
d.forEach(_40,function(_47){
d.connect(_45,_47.event,null,_47.func);
});
d.forEach(_41,function(_48){
_48.call(_45);
});
});
if(!_2c._started){
d.forEach(_2e,function(_49){
if(!_2d.noStart&&_49&&dojo.isFunction(_49.startup)&&!_49._started&&(!_49.getParent||!_49.getParent())){
_49.startup();
}
});
}
return _2e;
};
this.parse=function(_4a,_4b){
var _4c;
if(!_4b&&_4a&&_4a.rootNode){
_4b=_4a;
_4c=_4b.rootNode;
}else{
_4c=_4a;
}
_4c=_4c?dojo.byId(_4c):dojo.body();
_4b=_4b||{};
var _4d=(_4b.scope||d._scopeName)+"Type",_4e="data-"+(_4b.scope||d._scopeName)+"-";
function _4f(_50,_51){
var _52=dojo.clone(_50.inherited);
dojo.forEach(["dir","lang"],function(_53){
var val=_50.node.getAttribute(_53);
if(val){
_52[_53]=val;
}
});
var _54=_50.clsInfo&&!_50.clsInfo.cls.prototype._noScript?_50.scripts:null;
var _55=(!_50.clsInfo||!_50.clsInfo.cls.prototype.stopParser)||(_4b&&_4b.template);
for(var _56=_50.node.firstChild;_56;_56=_56.nextSibling){
if(_56.nodeType==1){
var _57,_58=_55&&_56.getAttribute(_4e+"type");
if(_58){
_57=_58;
}else{
_57=_55&&_56.getAttribute(_4d);
}
var _59=_58==_57;
if(_57){
var _5a={"type":_57,fastpath:_59,clsInfo:_1f(_57,_59),node:_56,scripts:[],inherited:_52};
_51.push(_5a);
_4f(_5a,_51);
}else{
if(_54&&_56.nodeName.toLowerCase()=="script"){
_57=_56.getAttribute("type");
if(_57&&/^dojo\/\w/i.test(_57)){
_54.push(_56);
}
}else{
if(_55){
_4f({node:_56,inherited:_52},_51);
}
}
}
}
}
};
var _5b={};
if(_4b&&_4b.inherited){
for(var key in _4b.inherited){
if(_4b.inherited[key]){
_5b[key]=_4b.inherited[key];
}
}
}
var _5c=[];
_4f({node:_4c,inherited:_5b},_5c);
var _5d=_4b&&_4b.template?{template:true}:null;
return this.instantiate(_5c,_5d,_4b);
};
}();
(function(){
var _5e=function(){
if(dojo.config.parseOnLoad){
dojo.parser.parse();
}
};
if(dojo.getObject("dijit.wai.onload")===dojo._loaders[0]){
dojo._loaders.splice(1,0,_5e);
}else{
dojo._loaders.unshift(_5e);
}
})();
}
if(!dojo._hasResource["dojo.dnd.Container"]){
dojo._hasResource["dojo.dnd.Container"]=true;
dojo.provide("dojo.dnd.Container");
dojo.declare("dojo.dnd.Container",null,{skipForm:false,constructor:function(_5f,_60){
this.node=dojo.byId(_5f);
if(!_60){
_60={};
}
this.creator=_60.creator||null;
this.skipForm=_60.skipForm;
this.parent=_60.dropParent&&dojo.byId(_60.dropParent);
this.map={};
this.current=null;
this.containerState="";
dojo.addClass(this.node,"dojoDndContainer");
if(!(_60&&_60._skipStartup)){
this.startup();
}
this.events=[dojo.connect(this.node,"onmouseover",this,"onMouseOver"),dojo.connect(this.node,"onmouseout",this,"onMouseOut"),dojo.connect(this.node,"ondragstart",this,"onSelectStart"),dojo.connect(this.node,"onselectstart",this,"onSelectStart")];
},creator:function(){
},getItem:function(key){
return this.map[key];
},setItem:function(key,_61){
this.map[key]=_61;
},delItem:function(key){
delete this.map[key];
},forInItems:function(f,o){
o=o||dojo.global;
var m=this.map,e=dojo.dnd._empty;
for(var i in m){
if(i in e){
continue;
}
f.call(o,m[i],i,this);
}
return o;
},clearItems:function(){
this.map={};
},getAllNodes:function(){
return dojo.query("> .dojoDndItem",this.parent);
},sync:function(){
var map={};
this.getAllNodes().forEach(function(_62){
if(_62.id){
var _63=this.getItem(_62.id);
if(_63){
map[_62.id]=_63;
return;
}
}else{
_62.id=dojo.dnd.getUniqueId();
}
var _64=_62.getAttribute("dndType"),_65=_62.getAttribute("dndData");
map[_62.id]={data:_65||_62.innerHTML,type:_64?_64.split(/\s*,\s*/):["text"]};
},this);
this.map=map;
return this;
},insertNodes:function(_66,_67,_68){
if(!this.parent.firstChild){
_68=null;
}else{
if(_67){
if(!_68){
_68=this.parent.firstChild;
}
}else{
if(_68){
_68=_68.nextSibling;
}
}
}
if(_68){
for(var i=0;i<_66.length;++i){
var t=this._normalizedCreator(_66[i]);
this.setItem(t.node.id,{data:t.data,type:t.type});
this.parent.insertBefore(t.node,_68);
}
}else{
for(var i=0;i<_66.length;++i){
var t=this._normalizedCreator(_66[i]);
this.setItem(t.node.id,{data:t.data,type:t.type});
this.parent.appendChild(t.node);
}
}
return this;
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
this.clearItems();
this.node=this.parent=this.current=null;
},markupFactory:function(_69,_6a){
_69._skipStartup=true;
return new dojo.dnd.Container(_6a,_69);
},startup:function(){
if(!this.parent){
this.parent=this.node;
if(this.parent.tagName.toLowerCase()=="table"){
var c=this.parent.getElementsByTagName("tbody");
if(c&&c.length){
this.parent=c[0];
}
}
}
this.defaultCreator=dojo.dnd._defaultCreator(this.parent);
this.sync();
},onMouseOver:function(e){
var n=e.relatedTarget;
while(n){
if(n==this.node){
break;
}
try{
n=n.parentNode;
}
catch(x){
n=null;
}
}
if(!n){
this._changeState("Container","Over");
this.onOverEvent();
}
n=this._getChildByEvent(e);
if(this.current==n){
return;
}
if(this.current){
this._removeItemClass(this.current,"Over");
}
if(n){
this._addItemClass(n,"Over");
}
this.current=n;
},onMouseOut:function(e){
for(var n=e.relatedTarget;n;){
if(n==this.node){
return;
}
try{
n=n.parentNode;
}
catch(x){
n=null;
}
}
if(this.current){
this._removeItemClass(this.current,"Over");
this.current=null;
}
this._changeState("Container","");
this.onOutEvent();
},onSelectStart:function(e){
if(!this.skipForm||!dojo.dnd.isFormElement(e)){
dojo.stopEvent(e);
}
},onOverEvent:function(){
},onOutEvent:function(){
},_changeState:function(_6b,_6c){
var _6d="dojoDnd"+_6b;
var _6e=_6b.toLowerCase()+"State";
dojo.replaceClass(this.node,_6d+_6c,_6d+this[_6e]);
this[_6e]=_6c;
},_addItemClass:function(_6f,_70){
dojo.addClass(_6f,"dojoDndItem"+_70);
},_removeItemClass:function(_71,_72){
dojo.removeClass(_71,"dojoDndItem"+_72);
},_getChildByEvent:function(e){
var _73=e.target;
if(_73){
for(var _74=_73.parentNode;_74;_73=_74,_74=_73.parentNode){
if(_74==this.parent&&dojo.hasClass(_73,"dojoDndItem")){
return _73;
}
}
}
return null;
},_normalizedCreator:function(_75,_76){
var t=(this.creator||this.defaultCreator).call(this,_75,_76);
if(!dojo.isArray(t.type)){
t.type=["text"];
}
if(!t.node.id){
t.node.id=dojo.dnd.getUniqueId();
}
dojo.addClass(t.node,"dojoDndItem");
return t;
}});
dojo.dnd._createNode=function(tag){
if(!tag){
return dojo.dnd._createSpan;
}
return function(_77){
return dojo.create(tag,{innerHTML:_77});
};
};
dojo.dnd._createTrTd=function(_78){
var tr=dojo.create("tr");
dojo.create("td",{innerHTML:_78},tr);
return tr;
};
dojo.dnd._createSpan=function(_79){
return dojo.create("span",{innerHTML:_79});
};
dojo.dnd._defaultCreatorNodes={ul:"li",ol:"li",div:"div",p:"div"};
dojo.dnd._defaultCreator=function(_7a){
var tag=_7a.tagName.toLowerCase();
var c=tag=="tbody"||tag=="thead"?dojo.dnd._createTrTd:dojo.dnd._createNode(dojo.dnd._defaultCreatorNodes[tag]);
return function(_7b,_7c){
var _7d=_7b&&dojo.isObject(_7b),_7e,_7f,n;
if(_7d&&_7b.tagName&&_7b.nodeType&&_7b.getAttribute){
_7e=_7b.getAttribute("dndData")||_7b.innerHTML;
_7f=_7b.getAttribute("dndType");
_7f=_7f?_7f.split(/\s*,\s*/):["text"];
n=_7b;
}else{
_7e=(_7d&&_7b.data)?_7b.data:_7b;
_7f=(_7d&&_7b.type)?_7b.type:["text"];
n=(_7c=="avatar"?dojo.dnd._createSpan:c)(String(_7e));
}
if(!n.id){
n.id=dojo.dnd.getUniqueId();
}
return {node:n,data:_7e,type:_7f};
};
};
}
if(!dojo._hasResource["dojo.dnd.Selector"]){
dojo._hasResource["dojo.dnd.Selector"]=true;
dojo.provide("dojo.dnd.Selector");
dojo.declare("dojo.dnd.Selector",dojo.dnd.Container,{constructor:function(_80,_81){
if(!_81){
_81={};
}
this.singular=_81.singular;
this.autoSync=_81.autoSync;
this.selection={};
this.anchor=null;
this.simpleSelection=false;
this.events.push(dojo.connect(this.node,"onmousedown",this,"onMouseDown"),dojo.connect(this.node,"onmouseup",this,"onMouseUp"));
},singular:false,getSelectedNodes:function(){
var t=new dojo.NodeList();
var e=dojo.dnd._empty;
for(var i in this.selection){
if(i in e){
continue;
}
t.push(dojo.byId(i));
}
return t;
},selectNone:function(){
return this._removeSelection()._removeAnchor();
},selectAll:function(){
this.forInItems(function(_82,id){
this._addItemClass(dojo.byId(id),"Selected");
this.selection[id]=1;
},this);
return this._removeAnchor();
},deleteSelectedNodes:function(){
var e=dojo.dnd._empty;
for(var i in this.selection){
if(i in e){
continue;
}
var n=dojo.byId(i);
this.delItem(i);
dojo.destroy(n);
}
this.anchor=null;
this.selection={};
return this;
},forInSelectedItems:function(f,o){
o=o||dojo.global;
var s=this.selection,e=dojo.dnd._empty;
for(var i in s){
if(i in e){
continue;
}
f.call(o,this.getItem(i),i,this);
}
},sync:function(){
dojo.dnd.Selector.superclass.sync.call(this);
if(this.anchor){
if(!this.getItem(this.anchor.id)){
this.anchor=null;
}
}
var t=[],e=dojo.dnd._empty;
for(var i in this.selection){
if(i in e){
continue;
}
if(!this.getItem(i)){
t.push(i);
}
}
dojo.forEach(t,function(i){
delete this.selection[i];
},this);
return this;
},insertNodes:function(_83,_84,_85,_86){
var _87=this._normalizedCreator;
this._normalizedCreator=function(_88,_89){
var t=_87.call(this,_88,_89);
if(_83){
if(!this.anchor){
this.anchor=t.node;
this._removeItemClass(t.node,"Selected");
this._addItemClass(this.anchor,"Anchor");
}else{
if(this.anchor!=t.node){
this._removeItemClass(t.node,"Anchor");
this._addItemClass(t.node,"Selected");
}
}
this.selection[t.node.id]=1;
}else{
this._removeItemClass(t.node,"Selected");
this._removeItemClass(t.node,"Anchor");
}
return t;
};
dojo.dnd.Selector.superclass.insertNodes.call(this,_84,_85,_86);
this._normalizedCreator=_87;
return this;
},destroy:function(){
dojo.dnd.Selector.superclass.destroy.call(this);
this.selection=this.anchor=null;
},markupFactory:function(_8a,_8b){
_8a._skipStartup=true;
return new dojo.dnd.Selector(_8b,_8a);
},onMouseDown:function(e){
if(this.autoSync){
this.sync();
}
if(!this.current){
return;
}
if(!this.singular&&!dojo.isCopyKey(e)&&!e.shiftKey&&(this.current.id in this.selection)){
this.simpleSelection=true;
if(e.button===dojo.mouseButtons.LEFT){
dojo.stopEvent(e);
}
return;
}
if(!this.singular&&e.shiftKey){
if(!dojo.isCopyKey(e)){
this._removeSelection();
}
var c=this.getAllNodes();
if(c.length){
if(!this.anchor){
this.anchor=c[0];
this._addItemClass(this.anchor,"Anchor");
}
this.selection[this.anchor.id]=1;
if(this.anchor!=this.current){
var i=0;
for(;i<c.length;++i){
var _8c=c[i];
if(_8c==this.anchor||_8c==this.current){
break;
}
}
for(++i;i<c.length;++i){
var _8c=c[i];
if(_8c==this.anchor||_8c==this.current){
break;
}
this._addItemClass(_8c,"Selected");
this.selection[_8c.id]=1;
}
this._addItemClass(this.current,"Selected");
this.selection[this.current.id]=1;
}
}
}else{
if(this.singular){
if(this.anchor==this.current){
if(dojo.isCopyKey(e)){
this.selectNone();
}
}else{
this.selectNone();
this.anchor=this.current;
this._addItemClass(this.anchor,"Anchor");
this.selection[this.current.id]=1;
}
}else{
if(dojo.isCopyKey(e)){
if(this.anchor==this.current){
delete this.selection[this.anchor.id];
this._removeAnchor();
}else{
if(this.current.id in this.selection){
this._removeItemClass(this.current,"Selected");
delete this.selection[this.current.id];
}else{
if(this.anchor){
this._removeItemClass(this.anchor,"Anchor");
this._addItemClass(this.anchor,"Selected");
}
this.anchor=this.current;
this._addItemClass(this.current,"Anchor");
this.selection[this.current.id]=1;
}
}
}else{
if(!(this.current.id in this.selection)){
this.selectNone();
this.anchor=this.current;
this._addItemClass(this.current,"Anchor");
this.selection[this.current.id]=1;
}
}
}
}
dojo.stopEvent(e);
},onMouseUp:function(e){
if(!this.simpleSelection){
return;
}
this.simpleSelection=false;
this.selectNone();
if(this.current){
this.anchor=this.current;
this._addItemClass(this.anchor,"Anchor");
this.selection[this.current.id]=1;
}
},onMouseMove:function(e){
this.simpleSelection=false;
},onOverEvent:function(){
this.onmousemoveEvent=dojo.connect(this.node,"onmousemove",this,"onMouseMove");
},onOutEvent:function(){
dojo.disconnect(this.onmousemoveEvent);
delete this.onmousemoveEvent;
},_removeSelection:function(){
var e=dojo.dnd._empty;
for(var i in this.selection){
if(i in e){
continue;
}
var _8d=dojo.byId(i);
if(_8d){
this._removeItemClass(_8d,"Selected");
}
}
this.selection={};
return this;
},_removeAnchor:function(){
if(this.anchor){
this._removeItemClass(this.anchor,"Anchor");
this.anchor=null;
}
return this;
}});
}
if(!dojo._hasResource["dojo.window"]){
dojo._hasResource["dojo.window"]=true;
dojo.provide("dojo.window");
dojo.getObject("window",true,dojo);
dojo.window.getBox=function(){
var _8e=(dojo.doc.compatMode=="BackCompat")?dojo.body():dojo.doc.documentElement;
var _8f=dojo._docScroll();
return {w:_8e.clientWidth,h:_8e.clientHeight,l:_8f.x,t:_8f.y};
};
dojo.window.get=function(doc){
if(dojo.isIE&&window!==document.parentWindow){
doc.parentWindow.execScript("document._parentWindow = window;","Javascript");
var win=doc._parentWindow;
doc._parentWindow=null;
return win;
}
return doc.parentWindow||doc.defaultView;
};
dojo.window.scrollIntoView=function(_90,pos){
try{
_90=dojo.byId(_90);
var doc=_90.ownerDocument||dojo.doc,_91=doc.body||dojo.body(),_92=doc.documentElement||_91.parentNode,_93=dojo.isIE,_94=dojo.isWebKit;
if((!(dojo.isMoz||_93||_94||dojo.isOpera)||_90==_91||_90==_92)&&(typeof _90.scrollIntoView!="undefined")){
_90.scrollIntoView(false);
return;
}
var _95=doc.compatMode=="BackCompat",_96=(_93>=9&&_90.ownerDocument.parentWindow.frameElement)?((_92.clientHeight>0&&_92.clientWidth>0&&(_91.clientHeight==0||_91.clientWidth==0||_91.clientHeight>_92.clientHeight||_91.clientWidth>_92.clientWidth))?_92:_91):(_95?_91:_92),_97=_94?_91:_96,_98=_96.clientWidth,_99=_96.clientHeight,rtl=!dojo._isBodyLtr(),_9a=pos||dojo.position(_90),el=_90.parentNode,_9b=function(el){
return ((_93<=6||(_93&&_95))?false:(dojo.style(el,"position").toLowerCase()=="fixed"));
};
if(_9b(_90)){
return;
}
while(el){
if(el==_91){
el=_97;
}
var _9c=dojo.position(el),_9d=_9b(el);
if(el==_97){
_9c.w=_98;
_9c.h=_99;
if(_97==_92&&_93&&rtl){
_9c.x+=_97.offsetWidth-_9c.w;
}
if(_9c.x<0||!_93){
_9c.x=0;
}
if(_9c.y<0||!_93){
_9c.y=0;
}
}else{
var pb=dojo._getPadBorderExtents(el);
_9c.w-=pb.w;
_9c.h-=pb.h;
_9c.x+=pb.l;
_9c.y+=pb.t;
var _9e=el.clientWidth,_9f=_9c.w-_9e;
if(_9e>0&&_9f>0){
_9c.w=_9e;
_9c.x+=(rtl&&(_93||el.clientLeft>pb.l))?_9f:0;
}
_9e=el.clientHeight;
_9f=_9c.h-_9e;
if(_9e>0&&_9f>0){
_9c.h=_9e;
}
}
if(_9d){
if(_9c.y<0){
_9c.h+=_9c.y;
_9c.y=0;
}
if(_9c.x<0){
_9c.w+=_9c.x;
_9c.x=0;
}
if(_9c.y+_9c.h>_99){
_9c.h=_99-_9c.y;
}
if(_9c.x+_9c.w>_98){
_9c.w=_98-_9c.x;
}
}
var l=_9a.x-_9c.x,t=_9a.y-Math.max(_9c.y,0),r=l+_9a.w-_9c.w,bot=t+_9a.h-_9c.h;
if(r*l>0){
var s=Math[l<0?"max":"min"](l,r);
if(rtl&&((_93==8&&!_95)||_93>=9)){
s=-s;
}
_9a.x+=el.scrollLeft;
el.scrollLeft+=s;
_9a.x-=el.scrollLeft;
}
if(bot*t>0){
_9a.y+=el.scrollTop;
el.scrollTop+=Math[t<0?"max":"min"](t,bot);
_9a.y-=el.scrollTop;
}
el=(el!=_97)&&!_9d&&el.parentNode;
}
}
catch(error){
console.error("scrollIntoView: "+error);
_90.scrollIntoView(false);
}
};
}
if(!dojo._hasResource["dojo.dnd.autoscroll"]){
dojo._hasResource["dojo.dnd.autoscroll"]=true;
dojo.provide("dojo.dnd.autoscroll");
dojo.getObject("dnd",true,dojo);
dojo.dnd.getViewport=dojo.window.getBox;
dojo.dnd.V_TRIGGER_AUTOSCROLL=32;
dojo.dnd.H_TRIGGER_AUTOSCROLL=32;
dojo.dnd.V_AUTOSCROLL_VALUE=16;
dojo.dnd.H_AUTOSCROLL_VALUE=16;
dojo.dnd.autoScroll=function(e){
var v=dojo.window.getBox(),dx=0,dy=0;
if(e.clientX<dojo.dnd.H_TRIGGER_AUTOSCROLL){
dx=-dojo.dnd.H_AUTOSCROLL_VALUE;
}else{
if(e.clientX>v.w-dojo.dnd.H_TRIGGER_AUTOSCROLL){
dx=dojo.dnd.H_AUTOSCROLL_VALUE;
}
}
if(e.clientY<dojo.dnd.V_TRIGGER_AUTOSCROLL){
dy=-dojo.dnd.V_AUTOSCROLL_VALUE;
}else{
if(e.clientY>v.h-dojo.dnd.V_TRIGGER_AUTOSCROLL){
dy=dojo.dnd.V_AUTOSCROLL_VALUE;
}
}
window.scrollBy(dx,dy);
};
dojo.dnd._validNodes={"div":1,"p":1,"td":1};
dojo.dnd._validOverflow={"auto":1,"scroll":1};
dojo.dnd.autoScrollNodes=function(e){
for(var n=e.target;n;){
if(n.nodeType==1&&(n.tagName.toLowerCase() in dojo.dnd._validNodes)){
var s=dojo.getComputedStyle(n);
if(s.overflow.toLowerCase() in dojo.dnd._validOverflow){
var b=dojo._getContentBox(n,s),t=dojo.position(n,true);
var w=Math.min(dojo.dnd.H_TRIGGER_AUTOSCROLL,b.w/2),h=Math.min(dojo.dnd.V_TRIGGER_AUTOSCROLL,b.h/2),rx=e.pageX-t.x,ry=e.pageY-t.y,dx=0,dy=0;
if(dojo.isWebKit||dojo.isOpera){
rx+=dojo.body().scrollLeft;
ry+=dojo.body().scrollTop;
}
if(rx>0&&rx<b.w){
if(rx<w){
dx=-w;
}else{
if(rx>b.w-w){
dx=w;
}
}
}
if(ry>0&&ry<b.h){
if(ry<h){
dy=-h;
}else{
if(ry>b.h-h){
dy=h;
}
}
}
var _a0=n.scrollLeft,_a1=n.scrollTop;
n.scrollLeft=n.scrollLeft+dx;
n.scrollTop=n.scrollTop+dy;
if(_a0!=n.scrollLeft||_a1!=n.scrollTop){
return;
}
}
}
try{
n=n.parentNode;
}
catch(x){
n=null;
}
}
dojo.dnd.autoScroll(e);
};
}
if(!dojo._hasResource["dojo.dnd.Avatar"]){
dojo._hasResource["dojo.dnd.Avatar"]=true;
dojo.provide("dojo.dnd.Avatar");
dojo.declare("dojo.dnd.Avatar",null,{constructor:function(_a2){
this.manager=_a2;
this.construct();
},construct:function(){
this.isA11y=dojo.hasClass(dojo.body(),"dijit_a11y");
var a=dojo.create("table",{"class":"dojoDndAvatar",style:{position:"absolute",zIndex:"1999",margin:"0px"}}),_a3=this.manager.source,_a4,b=dojo.create("tbody",null,a),tr=dojo.create("tr",null,b),td=dojo.create("td",null,tr),_a5=this.isA11y?dojo.create("span",{id:"a11yIcon",innerHTML:this.manager.copy?"+":"<"},td):null,_a6=dojo.create("span",{innerHTML:_a3.generateText?this._generateText():""},td),k=Math.min(5,this.manager.nodes.length),i=0;
dojo.attr(tr,{"class":"dojoDndAvatarHeader",style:{opacity:0.9}});
for(;i<k;++i){
if(_a3.creator){
_a4=_a3._normalizedCreator(_a3.getItem(this.manager.nodes[i].id).data,"avatar").node;
}else{
_a4=this.manager.nodes[i].cloneNode(true);
if(_a4.tagName.toLowerCase()=="tr"){
var _a7=dojo.create("table"),_a8=dojo.create("tbody",null,_a7);
_a8.appendChild(_a4);
_a4=_a7;
}
}
_a4.id="";
tr=dojo.create("tr",null,b);
td=dojo.create("td",null,tr);
td.appendChild(_a4);
dojo.attr(tr,{"class":"dojoDndAvatarItem",style:{opacity:(9-i)/10}});
}
this.node=a;
},destroy:function(){
dojo.destroy(this.node);
this.node=false;
},update:function(){
dojo[(this.manager.canDropFlag?"add":"remove")+"Class"](this.node,"dojoDndAvatarCanDrop");
if(this.isA11y){
var _a9=dojo.byId("a11yIcon");
var _aa="+";
if(this.manager.canDropFlag&&!this.manager.copy){
_aa="< ";
}else{
if(!this.manager.canDropFlag&&!this.manager.copy){
_aa="o";
}else{
if(!this.manager.canDropFlag){
_aa="x";
}
}
}
_a9.innerHTML=_aa;
}
dojo.query(("tr.dojoDndAvatarHeader td span"+(this.isA11y?" span":"")),this.node).forEach(function(_ab){
_ab.innerHTML=this._generateText();
},this);
},_generateText:function(){
return this.manager.nodes.length.toString();
}});
}
if(!dojo._hasResource["dojo.dnd.Manager"]){
dojo._hasResource["dojo.dnd.Manager"]=true;
dojo.provide("dojo.dnd.Manager");
dojo.declare("dojo.dnd.Manager",null,{constructor:function(){
this.avatar=null;
this.source=null;
this.nodes=[];
this.copy=true;
this.target=null;
this.canDropFlag=false;
this.events=[];
},OFFSET_X:16,OFFSET_Y:16,overSource:function(_ac){
if(this.avatar){
this.target=(_ac&&_ac.targetState!="Disabled")?_ac:null;
this.canDropFlag=Boolean(this.target);
this.avatar.update();
}
dojo.publish("/dnd/source/over",[_ac]);
},outSource:function(_ad){
if(this.avatar){
if(this.target==_ad){
this.target=null;
this.canDropFlag=false;
this.avatar.update();
dojo.publish("/dnd/source/over",[null]);
}
}else{
dojo.publish("/dnd/source/over",[null]);
}
},startDrag:function(_ae,_af,_b0){
this.source=_ae;
this.nodes=_af;
this.copy=Boolean(_b0);
this.avatar=this.makeAvatar();
dojo.body().appendChild(this.avatar.node);
dojo.publish("/dnd/start",[_ae,_af,this.copy]);
this.events=[dojo.connect(dojo.doc,"onmousemove",this,"onMouseMove"),dojo.connect(dojo.doc,"onmouseup",this,"onMouseUp"),dojo.connect(dojo.doc,"onkeydown",this,"onKeyDown"),dojo.connect(dojo.doc,"onkeyup",this,"onKeyUp"),dojo.connect(dojo.doc,"ondragstart",dojo.stopEvent),dojo.connect(dojo.body(),"onselectstart",dojo.stopEvent)];
var c="dojoDnd"+(_b0?"Copy":"Move");
dojo.addClass(dojo.body(),c);
},canDrop:function(_b1){
var _b2=Boolean(this.target&&_b1);
if(this.canDropFlag!=_b2){
this.canDropFlag=_b2;
this.avatar.update();
}
},stopDrag:function(){
dojo.removeClass(dojo.body(),["dojoDndCopy","dojoDndMove"]);
dojo.forEach(this.events,dojo.disconnect);
this.events=[];
this.avatar.destroy();
this.avatar=null;
this.source=this.target=null;
this.nodes=[];
},makeAvatar:function(){
return new dojo.dnd.Avatar(this);
},updateAvatar:function(){
this.avatar.update();
},onMouseMove:function(e){
var a=this.avatar;
if(a){
dojo.dnd.autoScrollNodes(e);
var s=a.node.style;
s.left=(e.pageX+this.OFFSET_X)+"px";
s.top=(e.pageY+this.OFFSET_Y)+"px";
var _b3=Boolean(this.source.copyState(dojo.isCopyKey(e)));
if(this.copy!=_b3){
this._setCopyStatus(_b3);
}
}
},onMouseUp:function(e){
if(this.avatar){
if(this.target&&this.canDropFlag){
var _b4=Boolean(this.source.copyState(dojo.isCopyKey(e))),_b5=[this.source,this.nodes,_b4,this.target,e];
dojo.publish("/dnd/drop/before",_b5);
dojo.publish("/dnd/drop",_b5);
}else{
dojo.publish("/dnd/cancel");
}
this.stopDrag();
}
},onKeyDown:function(e){
if(this.avatar){
switch(e.keyCode){
case dojo.keys.CTRL:
var _b6=Boolean(this.source.copyState(true));
if(this.copy!=_b6){
this._setCopyStatus(_b6);
}
break;
case dojo.keys.ESCAPE:
dojo.publish("/dnd/cancel");
this.stopDrag();
break;
}
}
},onKeyUp:function(e){
if(this.avatar&&e.keyCode==dojo.keys.CTRL){
var _b7=Boolean(this.source.copyState(false));
if(this.copy!=_b7){
this._setCopyStatus(_b7);
}
}
},_setCopyStatus:function(_b8){
this.copy=_b8;
this.source._markDndStatus(this.copy);
this.updateAvatar();
dojo.replaceClass(dojo.body(),"dojoDnd"+(this.copy?"Copy":"Move"),"dojoDnd"+(this.copy?"Move":"Copy"));
}});
dojo.dnd._manager=null;
dojo.dnd.manager=function(){
if(!dojo.dnd._manager){
dojo.dnd._manager=new dojo.dnd.Manager();
}
return dojo.dnd._manager;
};
}
if(!dojo._hasResource["dojo.dnd.Source"]){
dojo._hasResource["dojo.dnd.Source"]=true;
dojo.provide("dojo.dnd.Source");
dojo.declare("dojo.dnd.Source",dojo.dnd.Selector,{isSource:true,horizontal:false,copyOnly:false,selfCopy:false,selfAccept:true,skipForm:false,withHandles:false,autoSync:false,delay:0,accept:["text"],generateText:true,constructor:function(_b9,_ba){
dojo.mixin(this,dojo.mixin({},_ba));
var _bb=this.accept;
if(_bb.length){
this.accept={};
for(var i=0;i<_bb.length;++i){
this.accept[_bb[i]]=1;
}
}
this.isDragging=false;
this.mouseDown=false;
this.targetAnchor=null;
this.targetBox=null;
this.before=true;
this._lastX=0;
this._lastY=0;
this.sourceState="";
if(this.isSource){
dojo.addClass(this.node,"dojoDndSource");
}
this.targetState="";
if(this.accept){
dojo.addClass(this.node,"dojoDndTarget");
}
if(this.horizontal){
dojo.addClass(this.node,"dojoDndHorizontal");
}
this.topics=[dojo.subscribe("/dnd/source/over",this,"onDndSourceOver"),dojo.subscribe("/dnd/start",this,"onDndStart"),dojo.subscribe("/dnd/drop",this,"onDndDrop"),dojo.subscribe("/dnd/cancel",this,"onDndCancel")];
},checkAcceptance:function(_bc,_bd){
if(this==_bc){
return !this.copyOnly||this.selfAccept;
}
for(var i=0;i<_bd.length;++i){
var _be=_bc.getItem(_bd[i].id).type;
var _bf=false;
for(var j=0;j<_be.length;++j){
if(_be[j] in this.accept){
_bf=true;
break;
}
}
if(!_bf){
return false;
}
}
return true;
},copyState:function(_c0,_c1){
if(_c0){
return true;
}
if(arguments.length<2){
_c1=this==dojo.dnd.manager().target;
}
if(_c1){
if(this.copyOnly){
return this.selfCopy;
}
}else{
return this.copyOnly;
}
return false;
},destroy:function(){
dojo.dnd.Source.superclass.destroy.call(this);
dojo.forEach(this.topics,dojo.unsubscribe);
this.targetAnchor=null;
},markupFactory:function(_c2,_c3){
_c2._skipStartup=true;
return new dojo.dnd.Source(_c3,_c2);
},onMouseMove:function(e){
if(this.isDragging&&this.targetState=="Disabled"){
return;
}
dojo.dnd.Source.superclass.onMouseMove.call(this,e);
var m=dojo.dnd.manager();
if(!this.isDragging){
if(this.mouseDown&&this.isSource&&(Math.abs(e.pageX-this._lastX)>this.delay||Math.abs(e.pageY-this._lastY)>this.delay)){
var _c4=this.getSelectedNodes();
if(_c4.length){
m.startDrag(this,_c4,this.copyState(dojo.isCopyKey(e),true));
}
}
}
if(this.isDragging){
var _c5=false;
if(this.current){
if(!this.targetBox||this.targetAnchor!=this.current){
this.targetBox=dojo.position(this.current,true);
}
if(this.horizontal){
_c5=(e.pageX-this.targetBox.x)<(this.targetBox.w/2);
}else{
_c5=(e.pageY-this.targetBox.y)<(this.targetBox.h/2);
}
}
if(this.current!=this.targetAnchor||_c5!=this.before){
this._markTargetAnchor(_c5);
m.canDrop(!this.current||m.source!=this||!(this.current.id in this.selection));
}
}
},onMouseDown:function(e){
if(!this.mouseDown&&this._legalMouseDown(e)&&(!this.skipForm||!dojo.dnd.isFormElement(e))){
this.mouseDown=true;
this._lastX=e.pageX;
this._lastY=e.pageY;
dojo.dnd.Source.superclass.onMouseDown.call(this,e);
}
},onMouseUp:function(e){
if(this.mouseDown){
this.mouseDown=false;
dojo.dnd.Source.superclass.onMouseUp.call(this,e);
}
},onDndSourceOver:function(_c6){
if(this!=_c6){
this.mouseDown=false;
if(this.targetAnchor){
this._unmarkTargetAnchor();
}
}else{
if(this.isDragging){
var m=dojo.dnd.manager();
m.canDrop(this.targetState!="Disabled"&&(!this.current||m.source!=this||!(this.current.id in this.selection)));
}
}
},onDndStart:function(_c7,_c8,_c9){
if(this.autoSync){
this.sync();
}
if(this.isSource){
this._changeState("Source",this==_c7?(_c9?"Copied":"Moved"):"");
}
var _ca=this.accept&&this.checkAcceptance(_c7,_c8);
this._changeState("Target",_ca?"":"Disabled");
if(this==_c7){
dojo.dnd.manager().overSource(this);
}
this.isDragging=true;
},onDndDrop:function(_cb,_cc,_cd,_ce){
if(this==_ce){
this.onDrop(_cb,_cc,_cd);
}
this.onDndCancel();
},onDndCancel:function(){
if(this.targetAnchor){
this._unmarkTargetAnchor();
this.targetAnchor=null;
}
this.before=true;
this.isDragging=false;
this.mouseDown=false;
this._changeState("Source","");
this._changeState("Target","");
},onDrop:function(_cf,_d0,_d1){
if(this!=_cf){
this.onDropExternal(_cf,_d0,_d1);
}else{
this.onDropInternal(_d0,_d1);
}
},onDropExternal:function(_d2,_d3,_d4){
var _d5=this._normalizedCreator;
if(this.creator){
this._normalizedCreator=function(_d6,_d7){
return _d5.call(this,_d2.getItem(_d6.id).data,_d7);
};
}else{
if(_d4){
this._normalizedCreator=function(_d8,_d9){
var t=_d2.getItem(_d8.id);
var n=_d8.cloneNode(true);
n.id=dojo.dnd.getUniqueId();
return {node:n,data:t.data,type:t.type};
};
}else{
this._normalizedCreator=function(_da,_db){
var t=_d2.getItem(_da.id);
_d2.delItem(_da.id);
return {node:_da,data:t.data,type:t.type};
};
}
}
this.selectNone();
if(!_d4&&!this.creator){
_d2.selectNone();
}
this.insertNodes(true,_d3,this.before,this.current);
if(!_d4&&this.creator){
_d2.deleteSelectedNodes();
}
this._normalizedCreator=_d5;
},onDropInternal:function(_dc,_dd){
var _de=this._normalizedCreator;
if(this.current&&this.current.id in this.selection){
return;
}
if(_dd){
if(this.creator){
this._normalizedCreator=function(_df,_e0){
return _de.call(this,this.getItem(_df.id).data,_e0);
};
}else{
this._normalizedCreator=function(_e1,_e2){
var t=this.getItem(_e1.id);
var n=_e1.cloneNode(true);
n.id=dojo.dnd.getUniqueId();
return {node:n,data:t.data,type:t.type};
};
}
}else{
if(!this.current){
return;
}
this._normalizedCreator=function(_e3,_e4){
var t=this.getItem(_e3.id);
return {node:_e3,data:t.data,type:t.type};
};
}
this._removeSelection();
this.insertNodes(true,_dc,this.before,this.current);
this._normalizedCreator=_de;
},onDraggingOver:function(){
},onDraggingOut:function(){
},onOverEvent:function(){
dojo.dnd.Source.superclass.onOverEvent.call(this);
dojo.dnd.manager().overSource(this);
if(this.isDragging&&this.targetState!="Disabled"){
this.onDraggingOver();
}
},onOutEvent:function(){
dojo.dnd.Source.superclass.onOutEvent.call(this);
dojo.dnd.manager().outSource(this);
if(this.isDragging&&this.targetState!="Disabled"){
this.onDraggingOut();
}
},_markTargetAnchor:function(_e5){
if(this.current==this.targetAnchor&&this.before==_e5){
return;
}
if(this.targetAnchor){
this._removeItemClass(this.targetAnchor,this.before?"Before":"After");
}
this.targetAnchor=this.current;
this.targetBox=null;
this.before=_e5;
if(this.targetAnchor){
this._addItemClass(this.targetAnchor,this.before?"Before":"After");
}
},_unmarkTargetAnchor:function(){
if(!this.targetAnchor){
return;
}
this._removeItemClass(this.targetAnchor,this.before?"Before":"After");
this.targetAnchor=null;
this.targetBox=null;
this.before=true;
},_markDndStatus:function(_e6){
this._changeState("Source",_e6?"Copied":"Moved");
},_legalMouseDown:function(e){
if(!dojo.mouseButtons.isLeft(e)){
return false;
}
if(!this.withHandles){
return true;
}
for(var _e7=e.target;_e7&&_e7!==this.node;_e7=_e7.parentNode){
if(dojo.hasClass(_e7,"dojoDndHandle")){
return true;
}
if(dojo.hasClass(_e7,"dojoDndItem")||dojo.hasClass(_e7,"dojoDndIgnore")){
break;
}
}
return false;
}});
dojo.declare("dojo.dnd.Target",dojo.dnd.Source,{constructor:function(_e8,_e9){
this.isSource=false;
dojo.removeClass(this.node,"dojoDndSource");
},markupFactory:function(_ea,_eb){
_ea._skipStartup=true;
return new dojo.dnd.Target(_eb,_ea);
}});
dojo.declare("dojo.dnd.AutoSource",dojo.dnd.Source,{constructor:function(_ec,_ed){
this.autoSync=true;
},markupFactory:function(_ee,_ef){
_ee._skipStartup=true;
return new dojo.dnd.AutoSource(_ef,_ee);
}});
}
if(!dojo._hasResource["dojo.dnd.Mover"]){
dojo._hasResource["dojo.dnd.Mover"]=true;
dojo.provide("dojo.dnd.Mover");
dojo.declare("dojo.dnd.Mover",null,{constructor:function(_f0,e,_f1){
this.node=dojo.byId(_f0);
var pos=e.touches?e.touches[0]:e;
this.marginBox={l:pos.pageX,t:pos.pageY};
this.mouseButton=e.button;
var h=(this.host=_f1),d=_f0.ownerDocument;
this.events=[dojo.connect(d,"onmousemove",this,"onFirstMove"),dojo.connect(d,"ontouchmove",this,"onFirstMove"),dojo.connect(d,"onmousemove",this,"onMouseMove"),dojo.connect(d,"ontouchmove",this,"onMouseMove"),dojo.connect(d,"onmouseup",this,"onMouseUp"),dojo.connect(d,"ontouchend",this,"onMouseUp"),dojo.connect(d,"ondragstart",dojo.stopEvent),dojo.connect(d.body,"onselectstart",dojo.stopEvent)];
if(h&&h.onMoveStart){
h.onMoveStart(this);
}
},onMouseMove:function(e){
dojo.dnd.autoScroll(e);
var m=this.marginBox,pos=e.touches?e.touches[0]:e;
this.host.onMove(this,{l:m.l+pos.pageX,t:m.t+pos.pageY},e);
dojo.stopEvent(e);
},onMouseUp:function(e){
if(dojo.isWebKit&&dojo.isMac&&this.mouseButton==2?e.button==0:this.mouseButton==e.button){
this.destroy();
}
dojo.stopEvent(e);
},onFirstMove:function(e){
var s=this.node.style,l,t,h=this.host;
switch(s.position){
case "relative":
case "absolute":
l=Math.round(parseFloat(s.left))||0;
t=Math.round(parseFloat(s.top))||0;
break;
default:
s.position="absolute";
var m=dojo.marginBox(this.node);
var b=dojo.doc.body;
var bs=dojo.getComputedStyle(b);
var bm=dojo._getMarginBox(b,bs);
var bc=dojo._getContentBox(b,bs);
l=m.l-(bc.l-bm.l);
t=m.t-(bc.t-bm.t);
break;
}
this.marginBox.l=l-this.marginBox.l;
this.marginBox.t=t-this.marginBox.t;
if(h&&h.onFirstMove){
h.onFirstMove(this,e);
}
dojo.disconnect(this.events.shift());
dojo.disconnect(this.events.shift());
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
var h=this.host;
if(h&&h.onMoveStop){
h.onMoveStop(this);
}
this.events=this.node=this.host=null;
}});
}
if(!dojo._hasResource["dojo.dnd.Moveable"]){
dojo._hasResource["dojo.dnd.Moveable"]=true;
dojo.provide("dojo.dnd.Moveable");
dojo.declare("dojo.dnd.Moveable",null,{handle:"",delay:0,skip:false,constructor:function(_f2,_f3){
this.node=dojo.byId(_f2);
if(!_f3){
_f3={};
}
this.handle=_f3.handle?dojo.byId(_f3.handle):null;
if(!this.handle){
this.handle=this.node;
}
this.delay=_f3.delay>0?_f3.delay:0;
this.skip=_f3.skip;
this.mover=_f3.mover?_f3.mover:dojo.dnd.Mover;
this.events=[dojo.connect(this.handle,"onmousedown",this,"onMouseDown"),dojo.connect(this.handle,"ontouchstart",this,"onMouseDown"),dojo.connect(this.handle,"ondragstart",this,"onSelectStart"),dojo.connect(this.handle,"onselectstart",this,"onSelectStart")];
},markupFactory:function(_f4,_f5){
return new dojo.dnd.Moveable(_f5,_f4);
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
this.events=this.node=this.handle=null;
},onMouseDown:function(e){
if(this.skip&&dojo.dnd.isFormElement(e)){
return;
}
if(this.delay){
this.events.push(dojo.connect(this.handle,"onmousemove",this,"onMouseMove"),dojo.connect(this.handle,"ontouchmove",this,"onMouseMove"),dojo.connect(this.handle,"onmouseup",this,"onMouseUp"),dojo.connect(this.handle,"ontouchend",this,"onMouseUp"));
var pos=e.touches?e.touches[0]:e;
this._lastX=pos.pageX;
this._lastY=pos.pageY;
}else{
this.onDragDetected(e);
}
dojo.stopEvent(e);
},onMouseMove:function(e){
var pos=e.touches?e.touches[0]:e;
if(Math.abs(pos.pageX-this._lastX)>this.delay||Math.abs(pos.pageY-this._lastY)>this.delay){
this.onMouseUp(e);
this.onDragDetected(e);
}
dojo.stopEvent(e);
},onMouseUp:function(e){
for(var i=0;i<2;++i){
dojo.disconnect(this.events.pop());
}
dojo.stopEvent(e);
},onSelectStart:function(e){
if(!this.skip||!dojo.dnd.isFormElement(e)){
dojo.stopEvent(e);
}
},onDragDetected:function(e){
new this.mover(this.node,e,this);
},onMoveStart:function(_f6){
dojo.publish("/dnd/move/start",[_f6]);
dojo.addClass(dojo.body(),"dojoMove");
dojo.addClass(this.node,"dojoMoveItem");
},onMoveStop:function(_f7){
dojo.publish("/dnd/move/stop",[_f7]);
dojo.removeClass(dojo.body(),"dojoMove");
dojo.removeClass(this.node,"dojoMoveItem");
},onFirstMove:function(_f8,e){
},onMove:function(_f9,_fa,e){
this.onMoving(_f9,_fa);
var s=_f9.node.style;
s.left=_fa.l+"px";
s.top=_fa.t+"px";
this.onMoved(_f9,_fa);
},onMoving:function(_fb,_fc){
},onMoved:function(_fd,_fe){
}});
}
if(!dojo._hasResource["dojo.dnd.move"]){
dojo._hasResource["dojo.dnd.move"]=true;
dojo.provide("dojo.dnd.move");
dojo.declare("dojo.dnd.move.constrainedMoveable",dojo.dnd.Moveable,{constraints:function(){
},within:false,markupFactory:function(_ff,node){
return new dojo.dnd.move.constrainedMoveable(node,_ff);
},constructor:function(node,_100){
if(!_100){
_100={};
}
this.constraints=_100.constraints;
this.within=_100.within;
},onFirstMove:function(_101){
var c=this.constraintBox=this.constraints.call(this,_101);
c.r=c.l+c.w;
c.b=c.t+c.h;
if(this.within){
var mb=dojo._getMarginSize(_101.node);
c.r-=mb.w;
c.b-=mb.h;
}
},onMove:function(_102,_103){
var c=this.constraintBox,s=_102.node.style;
this.onMoving(_102,_103);
_103.l=_103.l<c.l?c.l:c.r<_103.l?c.r:_103.l;
_103.t=_103.t<c.t?c.t:c.b<_103.t?c.b:_103.t;
s.left=_103.l+"px";
s.top=_103.t+"px";
this.onMoved(_102,_103);
}});
dojo.declare("dojo.dnd.move.boxConstrainedMoveable",dojo.dnd.move.constrainedMoveable,{box:{},markupFactory:function(_104,node){
return new dojo.dnd.move.boxConstrainedMoveable(node,_104);
},constructor:function(node,_105){
var box=_105&&_105.box;
this.constraints=function(){
return box;
};
}});
dojo.declare("dojo.dnd.move.parentConstrainedMoveable",dojo.dnd.move.constrainedMoveable,{area:"content",markupFactory:function(_106,node){
return new dojo.dnd.move.parentConstrainedMoveable(node,_106);
},constructor:function(node,_107){
var area=_107&&_107.area;
this.constraints=function(){
var n=this.node.parentNode,s=dojo.getComputedStyle(n),mb=dojo._getMarginBox(n,s);
if(area=="margin"){
return mb;
}
var t=dojo._getMarginExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
if(area=="border"){
return mb;
}
t=dojo._getBorderExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
if(area=="padding"){
return mb;
}
t=dojo._getPadExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
return mb;
};
}});
dojo.dnd.constrainedMover=dojo.dnd.move.constrainedMover;
dojo.dnd.boxConstrainedMover=dojo.dnd.move.boxConstrainedMover;
dojo.dnd.parentConstrainedMover=dojo.dnd.move.parentConstrainedMover;
}
if(!dojo._hasResource["dijit._base.manager"]){
dojo._hasResource["dijit._base.manager"]=true;
dojo.provide("dijit._base.manager");
dojo.declare("dijit.WidgetSet",null,{constructor:function(){
this._hash={};
this.length=0;
},add:function(_108){
if(this._hash[_108.id]){
throw new Error("Tried to register widget with id=="+_108.id+" but that id is already registered");
}
this._hash[_108.id]=_108;
this.length++;
},remove:function(id){
if(this._hash[id]){
delete this._hash[id];
this.length--;
}
},forEach:function(func,_109){
_109=_109||dojo.global;
var i=0,id;
for(id in this._hash){
func.call(_109,this._hash[id],i++,this._hash);
}
return this;
},filter:function(_10a,_10b){
_10b=_10b||dojo.global;
var res=new dijit.WidgetSet(),i=0,id;
for(id in this._hash){
var w=this._hash[id];
if(_10a.call(_10b,w,i++,this._hash)){
res.add(w);
}
}
return res;
},byId:function(id){
return this._hash[id];
},byClass:function(cls){
var res=new dijit.WidgetSet(),id,_10c;
for(id in this._hash){
_10c=this._hash[id];
if(_10c.declaredClass==cls){
res.add(_10c);
}
}
return res;
},toArray:function(){
var ar=[];
for(var id in this._hash){
ar.push(this._hash[id]);
}
return ar;
},map:function(func,_10d){
return dojo.map(this.toArray(),func,_10d);
},every:function(func,_10e){
_10e=_10e||dojo.global;
var x=0,i;
for(i in this._hash){
if(!func.call(_10e,this._hash[i],x++,this._hash)){
return false;
}
}
return true;
},some:function(func,_10f){
_10f=_10f||dojo.global;
var x=0,i;
for(i in this._hash){
if(func.call(_10f,this._hash[i],x++,this._hash)){
return true;
}
}
return false;
}});
(function(){
dijit.registry=new dijit.WidgetSet();
var hash=dijit.registry._hash,attr=dojo.attr,_110=dojo.hasAttr,_111=dojo.style;
dijit.byId=function(id){
return typeof id=="string"?hash[id]:id;
};
var _112={};
dijit.getUniqueId=function(_113){
var id;
do{
id=_113+"_"+(_113 in _112?++_112[_113]:_112[_113]=0);
}while(hash[id]);
return dijit._scopeName=="dijit"?id:dijit._scopeName+"_"+id;
};
dijit.findWidgets=function(root){
var _114=[];
function _115(root){
for(var node=root.firstChild;node;node=node.nextSibling){
if(node.nodeType==1){
var _116=node.getAttribute("widgetId");
if(_116){
var _117=hash[_116];
if(_117){
_114.push(_117);
}
}else{
_115(node);
}
}
}
};
_115(root);
return _114;
};
dijit._destroyAll=function(){
dijit._curFocus=null;
dijit._prevFocus=null;
dijit._activeStack=[];
dojo.forEach(dijit.findWidgets(dojo.body()),function(_118){
if(!_118._destroyed){
if(_118.destroyRecursive){
_118.destroyRecursive();
}else{
if(_118.destroy){
_118.destroy();
}
}
}
});
};
if(dojo.isIE){
dojo.addOnWindowUnload(function(){
dijit._destroyAll();
});
}
dijit.byNode=function(node){
return hash[node.getAttribute("widgetId")];
};
dijit.getEnclosingWidget=function(node){
while(node){
var id=node.getAttribute&&node.getAttribute("widgetId");
if(id){
return hash[id];
}
node=node.parentNode;
}
return null;
};
var _119=(dijit._isElementShown=function(elem){
var s=_111(elem);
return (s.visibility!="hidden")&&(s.visibility!="collapsed")&&(s.display!="none")&&(attr(elem,"type")!="hidden");
});
dijit.hasDefaultTabStop=function(elem){
switch(elem.nodeName.toLowerCase()){
case "a":
return _110(elem,"href");
case "area":
case "button":
case "input":
case "object":
case "select":
case "textarea":
return true;
case "iframe":
var body;
try{
var _11a=elem.contentDocument;
if("designMode" in _11a&&_11a.designMode=="on"){
return true;
}
body=_11a.body;
}
catch(e1){
try{
body=elem.contentWindow.document.body;
}
catch(e2){
return false;
}
}
return body.contentEditable=="true"||(body.firstChild&&body.firstChild.contentEditable=="true");
default:
return elem.contentEditable=="true";
}
};
var _11b=(dijit.isTabNavigable=function(elem){
if(attr(elem,"disabled")){
return false;
}else{
if(_110(elem,"tabIndex")){
return attr(elem,"tabIndex")>=0;
}else{
return dijit.hasDefaultTabStop(elem);
}
}
});
dijit._getTabNavigable=function(root){
var _11c,last,_11d,_11e,_11f,_120,_121={};
function _122(node){
return node&&node.tagName.toLowerCase()=="input"&&node.type&&node.type.toLowerCase()=="radio"&&node.name&&node.name.toLowerCase();
};
var _123=function(_124){
dojo.query("> *",_124).forEach(function(_125){
if((dojo.isIE&&_125.scopeName!=="HTML")||!_119(_125)){
return;
}
if(_11b(_125)){
var _126=attr(_125,"tabIndex");
if(!_110(_125,"tabIndex")||_126==0){
if(!_11c){
_11c=_125;
}
last=_125;
}else{
if(_126>0){
if(!_11d||_126<_11e){
_11e=_126;
_11d=_125;
}
if(!_11f||_126>=_120){
_120=_126;
_11f=_125;
}
}
}
var rn=_122(_125);
if(dojo.attr(_125,"checked")&&rn){
_121[rn]=_125;
}
}
if(_125.nodeName.toUpperCase()!="SELECT"){
_123(_125);
}
});
};
if(_119(root)){
_123(root);
}
function rs(node){
return _121[_122(node)]||node;
};
return {first:rs(_11c),last:rs(last),lowest:rs(_11d),highest:rs(_11f)};
};
dijit.getFirstInTabbingOrder=function(root){
var _127=dijit._getTabNavigable(dojo.byId(root));
return _127.lowest?_127.lowest:_127.first;
};
dijit.getLastInTabbingOrder=function(root){
var _128=dijit._getTabNavigable(dojo.byId(root));
return _128.last?_128.last:_128.highest;
};
dijit.defaultDuration=dojo.config["defaultDuration"]||200;
})();
}
if(!dojo._hasResource["dojo.Stateful"]){
dojo._hasResource["dojo.Stateful"]=true;
dojo.provide("dojo.Stateful");
dojo.declare("dojo.Stateful",null,{postscript:function(_129){
if(_129){
dojo.mixin(this,_129);
}
},get:function(name){
return this[name];
},set:function(name,_12a){
if(typeof name==="object"){
for(var x in name){
this.set(x,name[x]);
}
return this;
}
var _12b=this[name];
this[name]=_12a;
if(this._watchCallbacks){
this._watchCallbacks(name,_12b,_12a);
}
return this;
},watch:function(name,_12c){
var _12d=this._watchCallbacks;
if(!_12d){
var self=this;
_12d=this._watchCallbacks=function(name,_12e,_12f,_130){
var _131=function(_132){
if(_132){
_132=_132.slice();
for(var i=0,l=_132.length;i<l;i++){
try{
_132[i].call(self,name,_12e,_12f);
}
catch(e){
console.error(e);
}
}
}
};
_131(_12d["_"+name]);
if(!_130){
_131(_12d["*"]);
}
};
}
if(!_12c&&typeof name==="function"){
_12c=name;
name="*";
}else{
name="_"+name;
}
var _133=_12d[name];
if(typeof _133!=="object"){
_133=_12d[name]=[];
}
_133.push(_12c);
return {unwatch:function(){
_133.splice(dojo.indexOf(_133,_12c),1);
}};
}});
}
if(!dojo._hasResource["dijit._WidgetBase"]){
dojo._hasResource["dijit._WidgetBase"]=true;
dojo.provide("dijit._WidgetBase");
(function(){
dojo.declare("dijit._WidgetBase",dojo.Stateful,{id:"",lang:"",dir:"","class":"",style:"",title:"",tooltip:"",baseClass:"",srcNodeRef:null,domNode:null,containerNode:null,attributeMap:{id:"",dir:"",lang:"","class":"",style:"",title:""},_blankGif:(dojo.config.blankGif||dojo.moduleUrl("dojo","resources/blank.gif")).toString(),postscript:function(_134,_135){
this.create(_134,_135);
},create:function(_136,_137){
this.srcNodeRef=dojo.byId(_137);
this._connects=[];
this._subscribes=[];
if(this.srcNodeRef&&(typeof this.srcNodeRef.id=="string")){
this.id=this.srcNodeRef.id;
}
if(_136){
this.params=_136;
dojo._mixin(this,_136);
}
this.postMixInProperties();
if(!this.id){
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
}
dijit.registry.add(this);
this.buildRendering();
if(this.domNode){
this._applyAttributes();
var _138=this.srcNodeRef;
if(_138&&_138.parentNode&&this.domNode!==_138){
_138.parentNode.replaceChild(this.domNode,_138);
}
}
if(this.domNode){
this.domNode.setAttribute("widgetId",this.id);
}
this.postCreate();
if(this.srcNodeRef&&!this.srcNodeRef.parentNode){
delete this.srcNodeRef;
}
this._created=true;
},_applyAttributes:function(){
var _139=function(attr,_13a){
if((_13a.params&&attr in _13a.params)||_13a[attr]){
_13a.set(attr,_13a[attr]);
}
};
for(var attr in this.attributeMap){
_139(attr,this);
}
dojo.forEach(this._getSetterAttributes(),function(a){
if(!(a in this.attributeMap)){
_139(a,this);
}
},this);
},_getSetterAttributes:function(){
var ctor=this.constructor;
if(!ctor._setterAttrs){
var r=(ctor._setterAttrs=[]),_13b,_13c=ctor.prototype;
for(var _13d in _13c){
if(dojo.isFunction(_13c[_13d])&&(_13b=_13d.match(/^_set([a-zA-Z]*)Attr$/))&&_13b[1]){
r.push(_13b[1].charAt(0).toLowerCase()+_13b[1].substr(1));
}
}
}
return ctor._setterAttrs;
},postMixInProperties:function(){
},buildRendering:function(){
if(!this.domNode){
this.domNode=this.srcNodeRef||dojo.create("div");
}
if(this.baseClass){
var _13e=this.baseClass.split(" ");
if(!this.isLeftToRight()){
_13e=_13e.concat(dojo.map(_13e,function(name){
return name+"Rtl";
}));
}
dojo.addClass(this.domNode,_13e);
}
},postCreate:function(){
},startup:function(){
this._started=true;
},destroyRecursive:function(_13f){
this._beingDestroyed=true;
this.destroyDescendants(_13f);
this.destroy(_13f);
},destroy:function(_140){
this._beingDestroyed=true;
this.uninitialize();
var d=dojo,dfe=d.forEach,dun=d.unsubscribe;
dfe(this._connects,function(_141){
dfe(_141,d.disconnect);
});
dfe(this._subscribes,function(_142){
dun(_142);
});
dfe(this._supportingWidgets||[],function(w){
if(w.destroyRecursive){
w.destroyRecursive();
}else{
if(w.destroy){
w.destroy();
}
}
});
this.destroyRendering(_140);
dijit.registry.remove(this.id);
this._destroyed=true;
},destroyRendering:function(_143){
if(this.bgIframe){
this.bgIframe.destroy(_143);
delete this.bgIframe;
}
if(this.domNode){
if(_143){
dojo.removeAttr(this.domNode,"widgetId");
}else{
dojo.destroy(this.domNode);
}
delete this.domNode;
}
if(this.srcNodeRef){
if(!_143){
dojo.destroy(this.srcNodeRef);
}
delete this.srcNodeRef;
}
},destroyDescendants:function(_144){
dojo.forEach(this.getChildren(),function(_145){
if(_145.destroyRecursive){
_145.destroyRecursive(_144);
}
});
},uninitialize:function(){
return false;
},_setClassAttr:function(_146){
var _147=this[this.attributeMap["class"]||"domNode"];
dojo.replaceClass(_147,_146,this["class"]);
this._set("class",_146);
},_setStyleAttr:function(_148){
var _149=this[this.attributeMap.style||"domNode"];
if(dojo.isObject(_148)){
dojo.style(_149,_148);
}else{
if(_149.style.cssText){
_149.style.cssText+="; "+_148;
}else{
_149.style.cssText=_148;
}
}
this._set("style",_148);
},_attrToDom:function(attr,_14a){
var _14b=this.attributeMap[attr];
dojo.forEach(dojo.isArray(_14b)?_14b:[_14b],function(_14c){
var _14d=this[_14c.node||_14c||"domNode"];
var type=_14c.type||"attribute";
switch(type){
case "attribute":
if(dojo.isFunction(_14a)){
_14a=dojo.hitch(this,_14a);
}
var _14e=_14c.attribute?_14c.attribute:(/^on[A-Z][a-zA-Z]*$/.test(attr)?attr.toLowerCase():attr);
dojo.attr(_14d,_14e,_14a);
break;
case "innerText":
_14d.innerHTML="";
_14d.appendChild(dojo.doc.createTextNode(_14a));
break;
case "innerHTML":
_14d.innerHTML=_14a;
break;
case "class":
dojo.replaceClass(_14d,_14a,this[attr]);
break;
}
},this);
},get:function(name){
var _14f=this._getAttrNames(name);
return this[_14f.g]?this[_14f.g]():this[name];
},set:function(name,_150){
if(typeof name==="object"){
for(var x in name){
this.set(x,name[x]);
}
return this;
}
var _151=this._getAttrNames(name);
if(this[_151.s]){
var _152=this[_151.s].apply(this,Array.prototype.slice.call(arguments,1));
}else{
if(name in this.attributeMap){
this._attrToDom(name,_150);
}
this._set(name,_150);
}
return _152||this;
},_attrPairNames:{},_getAttrNames:function(name){
var apn=this._attrPairNames;
if(apn[name]){
return apn[name];
}
var uc=name.charAt(0).toUpperCase()+name.substr(1);
return (apn[name]={n:name+"Node",s:"_set"+uc+"Attr",g:"_get"+uc+"Attr"});
},_set:function(name,_153){
var _154=this[name];
this[name]=_153;
if(this._watchCallbacks&&this._created&&_153!==_154){
this._watchCallbacks(name,_154,_153);
}
},toString:function(){
return "[Widget "+this.declaredClass+", "+(this.id||"NO ID")+"]";
},getDescendants:function(){
return this.containerNode?dojo.query("[widgetId]",this.containerNode).map(dijit.byNode):[];
},getChildren:function(){
return this.containerNode?dijit.findWidgets(this.containerNode):[];
},connect:function(obj,_155,_156){
var _157=[dojo._connect(obj,_155,this,_156)];
this._connects.push(_157);
return _157;
},disconnect:function(_158){
for(var i=0;i<this._connects.length;i++){
if(this._connects[i]==_158){
dojo.forEach(_158,dojo.disconnect);
this._connects.splice(i,1);
return;
}
}
},subscribe:function(_159,_15a){
var _15b=dojo.subscribe(_159,this,_15a);
this._subscribes.push(_15b);
return _15b;
},unsubscribe:function(_15c){
for(var i=0;i<this._subscribes.length;i++){
if(this._subscribes[i]==_15c){
dojo.unsubscribe(_15c);
this._subscribes.splice(i,1);
return;
}
}
},isLeftToRight:function(){
return this.dir?(this.dir=="ltr"):dojo._isBodyLtr();
},placeAt:function(_15d,_15e){
if(_15d.declaredClass&&_15d.addChild){
_15d.addChild(this,_15e);
}else{
dojo.place(this.domNode,_15d,_15e);
}
return this;
}});
})();
}
if(!dojo._hasResource["dijit._base.focus"]){
dojo._hasResource["dijit._base.focus"]=true;
dojo.provide("dijit._base.focus");
dojo.mixin(dijit,{_curFocus:null,_prevFocus:null,isCollapsed:function(){
return dijit.getBookmark().isCollapsed;
},getBookmark:function(){
var bm,rg,tg,sel=dojo.doc.selection,cf=dijit._curFocus;
if(dojo.global.getSelection){
sel=dojo.global.getSelection();
if(sel){
if(sel.isCollapsed){
tg=cf?cf.tagName:"";
if(tg){
tg=tg.toLowerCase();
if(tg=="textarea"||(tg=="input"&&(!cf.type||cf.type.toLowerCase()=="text"))){
sel={start:cf.selectionStart,end:cf.selectionEnd,node:cf,pRange:true};
return {isCollapsed:(sel.end<=sel.start),mark:sel};
}
}
bm={isCollapsed:true};
if(sel.rangeCount){
bm.mark=sel.getRangeAt(0).cloneRange();
}
}else{
rg=sel.getRangeAt(0);
bm={isCollapsed:false,mark:rg.cloneRange()};
}
}
}else{
if(sel){
tg=cf?cf.tagName:"";
tg=tg.toLowerCase();
if(cf&&tg&&(tg=="button"||tg=="textarea"||tg=="input")){
if(sel.type&&sel.type.toLowerCase()=="none"){
return {isCollapsed:true,mark:null};
}else{
rg=sel.createRange();
return {isCollapsed:rg.text&&rg.text.length?false:true,mark:{range:rg,pRange:true}};
}
}
bm={};
try{
rg=sel.createRange();
bm.isCollapsed=!(sel.type=="Text"?rg.htmlText.length:rg.length);
}
catch(e){
bm.isCollapsed=true;
return bm;
}
if(sel.type.toUpperCase()=="CONTROL"){
if(rg.length){
bm.mark=[];
var i=0,len=rg.length;
while(i<len){
bm.mark.push(rg.item(i++));
}
}else{
bm.isCollapsed=true;
bm.mark=null;
}
}else{
bm.mark=rg.getBookmark();
}
}else{
console.warn("No idea how to store the current selection for this browser!");
}
}
return bm;
},moveToBookmark:function(_15f){
var _160=dojo.doc,mark=_15f.mark;
if(mark){
if(dojo.global.getSelection){
var sel=dojo.global.getSelection();
if(sel&&sel.removeAllRanges){
if(mark.pRange){
var r=mark;
var n=r.node;
n.selectionStart=r.start;
n.selectionEnd=r.end;
}else{
sel.removeAllRanges();
sel.addRange(mark);
}
}else{
console.warn("No idea how to restore selection for this browser!");
}
}else{
if(_160.selection&&mark){
var rg;
if(mark.pRange){
rg=mark.range;
}else{
if(dojo.isArray(mark)){
rg=_160.body.createControlRange();
dojo.forEach(mark,function(n){
rg.addElement(n);
});
}else{
rg=_160.body.createTextRange();
rg.moveToBookmark(mark);
}
}
rg.select();
}
}
}
},getFocus:function(menu,_161){
var node=!dijit._curFocus||(menu&&dojo.isDescendant(dijit._curFocus,menu.domNode))?dijit._prevFocus:dijit._curFocus;
return {node:node,bookmark:(node==dijit._curFocus)&&dojo.withGlobal(_161||dojo.global,dijit.getBookmark),openedForWindow:_161};
},focus:function(_162){
if(!_162){
return;
}
var node="node" in _162?_162.node:_162,_163=_162.bookmark,_164=_162.openedForWindow,_165=_163?_163.isCollapsed:false;
if(node){
var _166=(node.tagName.toLowerCase()=="iframe")?node.contentWindow:node;
if(_166&&_166.focus){
try{
_166.focus();
}
catch(e){
}
}
dijit._onFocusNode(node);
}
if(_163&&dojo.withGlobal(_164||dojo.global,dijit.isCollapsed)&&!_165){
if(_164){
_164.focus();
}
try{
dojo.withGlobal(_164||dojo.global,dijit.moveToBookmark,null,[_163]);
}
catch(e2){
}
}
},_activeStack:[],registerIframe:function(_167){
return dijit.registerWin(_167.contentWindow,_167);
},unregisterIframe:function(_168){
dijit.unregisterWin(_168);
},registerWin:function(_169,_16a){
var _16b=function(evt){
dijit._justMouseDowned=true;
setTimeout(function(){
dijit._justMouseDowned=false;
},0);
if(dojo.isIE&&evt&&evt.srcElement&&evt.srcElement.parentNode==null){
return;
}
dijit._onTouchNode(_16a||evt.target||evt.srcElement,"mouse");
};
var doc=dojo.isIE?_169.document.documentElement:_169.document;
if(doc){
if(dojo.isIE){
_169.document.body.attachEvent("onmousedown",_16b);
var _16c=function(evt){
if(evt.srcElement.tagName.toLowerCase()!="#document"&&dijit.isTabNavigable(evt.srcElement)){
dijit._onFocusNode(_16a||evt.srcElement);
}else{
dijit._onTouchNode(_16a||evt.srcElement);
}
};
doc.attachEvent("onactivate",_16c);
var _16d=function(evt){
dijit._onBlurNode(_16a||evt.srcElement);
};
doc.attachEvent("ondeactivate",_16d);
return function(){
_169.document.detachEvent("onmousedown",_16b);
doc.detachEvent("onactivate",_16c);
doc.detachEvent("ondeactivate",_16d);
doc=null;
};
}else{
doc.body.addEventListener("mousedown",_16b,true);
var _16e=function(evt){
dijit._onFocusNode(_16a||evt.target);
};
doc.addEventListener("focus",_16e,true);
var _16f=function(evt){
dijit._onBlurNode(_16a||evt.target);
};
doc.addEventListener("blur",_16f,true);
return function(){
doc.body.removeEventListener("mousedown",_16b,true);
doc.removeEventListener("focus",_16e,true);
doc.removeEventListener("blur",_16f,true);
doc=null;
};
}
}
},unregisterWin:function(_170){
_170&&_170();
},_onBlurNode:function(node){
dijit._prevFocus=dijit._curFocus;
dijit._curFocus=null;
if(dijit._justMouseDowned){
return;
}
if(dijit._clearActiveWidgetsTimer){
clearTimeout(dijit._clearActiveWidgetsTimer);
}
dijit._clearActiveWidgetsTimer=setTimeout(function(){
delete dijit._clearActiveWidgetsTimer;
dijit._setStack([]);
dijit._prevFocus=null;
},100);
},_onTouchNode:function(node,by){
if(dijit._clearActiveWidgetsTimer){
clearTimeout(dijit._clearActiveWidgetsTimer);
delete dijit._clearActiveWidgetsTimer;
}
var _171=[];
try{
while(node){
var _172=dojo.attr(node,"dijitPopupParent");
if(_172){
node=dijit.byId(_172).domNode;
}else{
if(node.tagName&&node.tagName.toLowerCase()=="body"){
if(node===dojo.body()){
break;
}
node=dojo.window.get(node.ownerDocument).frameElement;
}else{
var id=node.getAttribute&&node.getAttribute("widgetId"),_173=id&&dijit.byId(id);
if(_173&&!(by=="mouse"&&_173.get("disabled"))){
_171.unshift(id);
}
node=node.parentNode;
}
}
}
}
catch(e){
}
dijit._setStack(_171,by);
},_onFocusNode:function(node){
if(!node){
return;
}
if(node.nodeType==9){
return;
}
dijit._onTouchNode(node);
if(node==dijit._curFocus){
return;
}
if(dijit._curFocus){
dijit._prevFocus=dijit._curFocus;
}
dijit._curFocus=node;
dojo.publish("focusNode",[node]);
},_setStack:function(_174,by){
var _175=dijit._activeStack;
dijit._activeStack=_174;
for(var _176=0;_176<Math.min(_175.length,_174.length);_176++){
if(_175[_176]!=_174[_176]){
break;
}
}
var _177;
for(var i=_175.length-1;i>=_176;i--){
_177=dijit.byId(_175[i]);
if(_177){
_177._focused=false;
_177.set("focused",false);
_177._hasBeenBlurred=true;
if(_177._onBlur){
_177._onBlur(by);
}
dojo.publish("widgetBlur",[_177,by]);
}
}
for(i=_176;i<_174.length;i++){
_177=dijit.byId(_174[i]);
if(_177){
_177._focused=true;
_177.set("focused",true);
if(_177._onFocus){
_177._onFocus(by);
}
dojo.publish("widgetFocus",[_177,by]);
}
}
}});
dojo.addOnLoad(function(){
var _178=dijit.registerWin(window);
if(dojo.isIE){
dojo.addOnWindowUnload(function(){
dijit.unregisterWin(_178);
_178=null;
});
}
});
}
if(!dojo._hasResource["dojo.AdapterRegistry"]){
dojo._hasResource["dojo.AdapterRegistry"]=true;
dojo.provide("dojo.AdapterRegistry");
dojo.AdapterRegistry=function(_179){
this.pairs=[];
this.returnWrappers=_179||false;
};
dojo.extend(dojo.AdapterRegistry,{register:function(name,_17a,wrap,_17b,_17c){
this.pairs[((_17c)?"unshift":"push")]([name,_17a,wrap,_17b]);
},match:function(){
for(var i=0;i<this.pairs.length;i++){
var pair=this.pairs[i];
if(pair[1].apply(this,arguments)){
if((pair[3])||(this.returnWrappers)){
return pair[2];
}else{
return pair[2].apply(this,arguments);
}
}
}
throw new Error("No match found");
},unregister:function(name){
for(var i=0;i<this.pairs.length;i++){
var pair=this.pairs[i];
if(pair[0]==name){
this.pairs.splice(i,1);
return true;
}
}
return false;
}});
}
if(!dojo._hasResource["dijit._base.place"]){
dojo._hasResource["dijit._base.place"]=true;
dojo.provide("dijit._base.place");
dijit.getViewport=function(){
return dojo.window.getBox();
};
dijit.placeOnScreen=function(node,pos,_17d,_17e){
var _17f=dojo.map(_17d,function(_180){
var c={corner:_180,pos:{x:pos.x,y:pos.y}};
if(_17e){
c.pos.x+=_180.charAt(1)=="L"?_17e.x:-_17e.x;
c.pos.y+=_180.charAt(0)=="T"?_17e.y:-_17e.y;
}
return c;
});
return dijit._place(node,_17f);
};
dijit._place=function(node,_181,_182,_183){
var view=dojo.window.getBox();
if(!node.parentNode||String(node.parentNode.tagName).toLowerCase()!="body"){
dojo.body().appendChild(node);
}
var best=null;
dojo.some(_181,function(_184){
var _185=_184.corner;
var pos=_184.pos;
var _186=0;
var _187={w:_185.charAt(1)=="L"?(view.l+view.w)-pos.x:pos.x-view.l,h:_185.charAt(1)=="T"?(view.t+view.h)-pos.y:pos.y-view.t};
if(_182){
var res=_182(node,_184.aroundCorner,_185,_187,_183);
_186=typeof res=="undefined"?0:res;
}
var _188=node.style;
var _189=_188.display;
var _18a=_188.visibility;
_188.visibility="hidden";
_188.display="";
var mb=dojo.marginBox(node);
_188.display=_189;
_188.visibility=_18a;
var _18b=Math.max(view.l,_185.charAt(1)=="L"?pos.x:(pos.x-mb.w)),_18c=Math.max(view.t,_185.charAt(0)=="T"?pos.y:(pos.y-mb.h)),endX=Math.min(view.l+view.w,_185.charAt(1)=="L"?(_18b+mb.w):pos.x),endY=Math.min(view.t+view.h,_185.charAt(0)=="T"?(_18c+mb.h):pos.y),_18d=endX-_18b,_18e=endY-_18c;
_186+=(mb.w-_18d)+(mb.h-_18e);
if(best==null||_186<best.overflow){
best={corner:_185,aroundCorner:_184.aroundCorner,x:_18b,y:_18c,w:_18d,h:_18e,overflow:_186,spaceAvailable:_187};
}
return !_186;
});
if(best.overflow&&_182){
_182(node,best.aroundCorner,best.corner,best.spaceAvailable,_183);
}
var l=dojo._isBodyLtr(),s=node.style;
s.top=best.y+"px";
s[l?"left":"right"]=(l?best.x:view.w-best.x-best.w)+"px";
return best;
};
dijit.placeOnScreenAroundNode=function(node,_18f,_190,_191){
_18f=dojo.byId(_18f);
var _192=dojo.position(_18f,true);
return dijit._placeOnScreenAroundRect(node,_192.x,_192.y,_192.w,_192.h,_190,_191);
};
dijit.placeOnScreenAroundRectangle=function(node,_193,_194,_195){
return dijit._placeOnScreenAroundRect(node,_193.x,_193.y,_193.width,_193.height,_194,_195);
};
dijit._placeOnScreenAroundRect=function(node,x,y,_196,_197,_198,_199){
var _19a=[];
for(var _19b in _198){
_19a.push({aroundCorner:_19b,corner:_198[_19b],pos:{x:x+(_19b.charAt(1)=="L"?0:_196),y:y+(_19b.charAt(0)=="T"?0:_197)}});
}
return dijit._place(node,_19a,_199,{w:_196,h:_197});
};
dijit.placementRegistry=new dojo.AdapterRegistry();
dijit.placementRegistry.register("node",function(n,x){
return typeof x=="object"&&typeof x.offsetWidth!="undefined"&&typeof x.offsetHeight!="undefined";
},dijit.placeOnScreenAroundNode);
dijit.placementRegistry.register("rect",function(n,x){
return typeof x=="object"&&"x" in x&&"y" in x&&"width" in x&&"height" in x;
},dijit.placeOnScreenAroundRectangle);
dijit.placeOnScreenAroundElement=function(node,_19c,_19d,_19e){
return dijit.placementRegistry.match.apply(dijit.placementRegistry,arguments);
};
dijit.getPopupAroundAlignment=function(_19f,_1a0){
var _1a1={};
dojo.forEach(_19f,function(pos){
switch(pos){
case "after":
_1a1[_1a0?"BR":"BL"]=_1a0?"BL":"BR";
break;
case "before":
_1a1[_1a0?"BL":"BR"]=_1a0?"BR":"BL";
break;
case "below-alt":
_1a0=!_1a0;
case "below":
_1a1[_1a0?"BL":"BR"]=_1a0?"TL":"TR";
_1a1[_1a0?"BR":"BL"]=_1a0?"TR":"TL";
break;
case "above-alt":
_1a0=!_1a0;
case "above":
default:
_1a1[_1a0?"TL":"TR"]=_1a0?"BL":"BR";
_1a1[_1a0?"TR":"TL"]=_1a0?"BR":"BL";
break;
}
});
return _1a1;
};
}
if(!dojo._hasResource["dijit._base.window"]){
dojo._hasResource["dijit._base.window"]=true;
dojo.provide("dijit._base.window");
dijit.getDocumentWindow=function(doc){
return dojo.window.get(doc);
};
}
if(!dojo._hasResource["dijit._base.popup"]){
dojo._hasResource["dijit._base.popup"]=true;
dojo.provide("dijit._base.popup");
dijit.popup={_stack:[],_beginZIndex:1000,_idGen:1,_createWrapper:function(_1a2){
var _1a3=_1a2.declaredClass?_1a2._popupWrapper:(_1a2.parentNode&&dojo.hasClass(_1a2.parentNode,"dijitPopup")),node=_1a2.domNode||_1a2;
if(!_1a3){
_1a3=dojo.create("div",{"class":"dijitPopup",style:{display:"none"},role:"presentation"},dojo.body());
_1a3.appendChild(node);
var s=node.style;
s.display="";
s.visibility="";
s.position="";
s.top="0px";
if(_1a2.declaredClass){
_1a2._popupWrapper=_1a3;
dojo.connect(_1a2,"destroy",function(){
dojo.destroy(_1a3);
delete _1a2._popupWrapper;
});
}
}
return _1a3;
},moveOffScreen:function(_1a4){
var _1a5=this._createWrapper(_1a4);
dojo.style(_1a5,{visibility:"hidden",top:"-9999px",display:""});
},hide:function(_1a6){
var _1a7=this._createWrapper(_1a6);
dojo.style(_1a7,"display","none");
},getTopPopup:function(){
var _1a8=this._stack;
for(var pi=_1a8.length-1;pi>0&&_1a8[pi].parent===_1a8[pi-1].widget;pi--){
}
return _1a8[pi];
},open:function(args){
var _1a9=this._stack,_1aa=args.popup,_1ab=args.orient||((args.parent?args.parent.isLeftToRight():dojo._isBodyLtr())?{"BL":"TL","BR":"TR","TL":"BL","TR":"BR"}:{"BR":"TR","BL":"TL","TR":"BR","TL":"BL"}),_1ac=args.around,id=(args.around&&args.around.id)?(args.around.id+"_dropdown"):("popup_"+this._idGen++);
while(_1a9.length&&(!args.parent||!dojo.isDescendant(args.parent.domNode,_1a9[_1a9.length-1].widget.domNode))){
dijit.popup.close(_1a9[_1a9.length-1].widget);
}
var _1ad=this._createWrapper(_1aa);
dojo.attr(_1ad,{id:id,style:{zIndex:this._beginZIndex+_1a9.length},"class":"dijitPopup "+(_1aa.baseClass||_1aa["class"]||"").split(" ")[0]+"Popup",dijitPopupParent:args.parent?args.parent.id:""});
if(dojo.isIE||dojo.isMoz){
if(!_1aa.bgIframe){
_1aa.bgIframe=new dijit.BackgroundIframe(_1ad);
}
}
var best=_1ac?dijit.placeOnScreenAroundElement(_1ad,_1ac,_1ab,_1aa.orient?dojo.hitch(_1aa,"orient"):null):dijit.placeOnScreen(_1ad,args,_1ab=="R"?["TR","BR","TL","BL"]:["TL","BL","TR","BR"],args.padding);
_1ad.style.display="";
_1ad.style.visibility="visible";
_1aa.domNode.style.visibility="visible";
var _1ae=[];
_1ae.push(dojo.connect(_1ad,"onkeypress",this,function(evt){
if(evt.charOrCode==dojo.keys.ESCAPE&&args.onCancel){
dojo.stopEvent(evt);
args.onCancel();
}else{
if(evt.charOrCode===dojo.keys.TAB){
dojo.stopEvent(evt);
var _1af=this.getTopPopup();
if(_1af&&_1af.onCancel){
_1af.onCancel();
}
}
}
}));
if(_1aa.onCancel){
_1ae.push(dojo.connect(_1aa,"onCancel",args.onCancel));
}
_1ae.push(dojo.connect(_1aa,_1aa.onExecute?"onExecute":"onChange",this,function(){
var _1b0=this.getTopPopup();
if(_1b0&&_1b0.onExecute){
_1b0.onExecute();
}
}));
_1a9.push({widget:_1aa,parent:args.parent,onExecute:args.onExecute,onCancel:args.onCancel,onClose:args.onClose,handlers:_1ae});
if(_1aa.onOpen){
_1aa.onOpen(best);
}
return best;
},close:function(_1b1){
var _1b2=this._stack;
while((_1b1&&dojo.some(_1b2,function(elem){
return elem.widget==_1b1;
}))||(!_1b1&&_1b2.length)){
var top=_1b2.pop(),_1b3=top.widget,_1b4=top.onClose;
if(_1b3.onClose){
_1b3.onClose();
}
dojo.forEach(top.handlers,dojo.disconnect);
if(_1b3&&_1b3.domNode){
this.hide(_1b3);
}
if(_1b4){
_1b4();
}
}
}};
dijit._frames=new function(){
var _1b5=[];
this.pop=function(){
var _1b6;
if(_1b5.length){
_1b6=_1b5.pop();
_1b6.style.display="";
}else{
if(dojo.isIE<9){
var burl=dojo.config["dojoBlankHtmlUrl"]||(dojo.moduleUrl("dojo","resources/blank.html")+"")||"javascript:\"\"";
var html="<iframe src='"+burl+"'"+" style='position: absolute; left: 0px; top: 0px;"+"z-index: -1; filter:Alpha(Opacity=\"0\");'>";
_1b6=dojo.doc.createElement(html);
}else{
_1b6=dojo.create("iframe");
_1b6.src="javascript:\"\"";
_1b6.className="dijitBackgroundIframe";
dojo.style(_1b6,"opacity",0.1);
}
_1b6.tabIndex=-1;
dijit.setWaiRole(_1b6,"presentation");
}
return _1b6;
};
this.push=function(_1b7){
_1b7.style.display="none";
_1b5.push(_1b7);
};
}();
dijit.BackgroundIframe=function(node){
if(!node.id){
throw new Error("no id");
}
if(dojo.isIE||dojo.isMoz){
var _1b8=(this.iframe=dijit._frames.pop());
node.appendChild(_1b8);
if(dojo.isIE<7||dojo.isQuirks){
this.resize(node);
this._conn=dojo.connect(node,"onresize",this,function(){
this.resize(node);
});
}else{
dojo.style(_1b8,{width:"100%",height:"100%"});
}
}
};
dojo.extend(dijit.BackgroundIframe,{resize:function(node){
if(this.iframe){
dojo.style(this.iframe,{width:node.offsetWidth+"px",height:node.offsetHeight+"px"});
}
},destroy:function(){
if(this._conn){
dojo.disconnect(this._conn);
this._conn=null;
}
if(this.iframe){
dijit._frames.push(this.iframe);
delete this.iframe;
}
}});
}
if(!dojo._hasResource["dijit._base.scroll"]){
dojo._hasResource["dijit._base.scroll"]=true;
dojo.provide("dijit._base.scroll");
dijit.scrollIntoView=function(node,pos){
dojo.window.scrollIntoView(node,pos);
};
}
if(!dojo._hasResource["dojo.uacss"]){
dojo._hasResource["dojo.uacss"]=true;
dojo.provide("dojo.uacss");
(function(){
var d=dojo,html=d.doc.documentElement,ie=d.isIE,_1b9=d.isOpera,maj=Math.floor,ff=d.isFF,_1ba=d.boxModel.replace(/-/,""),_1bb={dj_ie:ie,dj_ie6:maj(ie)==6,dj_ie7:maj(ie)==7,dj_ie8:maj(ie)==8,dj_ie9:maj(ie)==9,dj_quirks:d.isQuirks,dj_iequirks:ie&&d.isQuirks,dj_opera:_1b9,dj_khtml:d.isKhtml,dj_webkit:d.isWebKit,dj_safari:d.isSafari,dj_chrome:d.isChrome,dj_gecko:d.isMozilla,dj_ff3:maj(ff)==3};
_1bb["dj_"+_1ba]=true;
var _1bc="";
for(var clz in _1bb){
if(_1bb[clz]){
_1bc+=clz+" ";
}
}
html.className=d.trim(html.className+" "+_1bc);
dojo._loaders.unshift(function(){
if(!dojo._isBodyLtr()){
var _1bd="dj_rtl dijitRtl "+_1bc.replace(/ /g,"-rtl ");
html.className=d.trim(html.className+" "+_1bd);
}
});
})();
}
if(!dojo._hasResource["dijit._base.sniff"]){
dojo._hasResource["dijit._base.sniff"]=true;
dojo.provide("dijit._base.sniff");
}
if(!dojo._hasResource["dijit._base.typematic"]){
dojo._hasResource["dijit._base.typematic"]=true;
dojo.provide("dijit._base.typematic");
dijit.typematic={_fireEventAndReload:function(){
this._timer=null;
this._callback(++this._count,this._node,this._evt);
this._currentTimeout=Math.max(this._currentTimeout<0?this._initialDelay:(this._subsequentDelay>1?this._subsequentDelay:Math.round(this._currentTimeout*this._subsequentDelay)),this._minDelay);
this._timer=setTimeout(dojo.hitch(this,"_fireEventAndReload"),this._currentTimeout);
},trigger:function(evt,_1be,node,_1bf,obj,_1c0,_1c1,_1c2){
if(obj!=this._obj){
this.stop();
this._initialDelay=_1c1||500;
this._subsequentDelay=_1c0||0.9;
this._minDelay=_1c2||10;
this._obj=obj;
this._evt=evt;
this._node=node;
this._currentTimeout=-1;
this._count=-1;
this._callback=dojo.hitch(_1be,_1bf);
this._fireEventAndReload();
this._evt=dojo.mixin({faux:true},evt);
}
},stop:function(){
if(this._timer){
clearTimeout(this._timer);
this._timer=null;
}
if(this._obj){
this._callback(-1,this._node,this._evt);
this._obj=null;
}
},addKeyListener:function(node,_1c3,_1c4,_1c5,_1c6,_1c7,_1c8){
if(_1c3.keyCode){
_1c3.charOrCode=_1c3.keyCode;
dojo.deprecated("keyCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.","","2.0");
}else{
if(_1c3.charCode){
_1c3.charOrCode=String.fromCharCode(_1c3.charCode);
dojo.deprecated("charCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.","","2.0");
}
}
return [dojo.connect(node,"onkeypress",this,function(evt){
if(evt.charOrCode==_1c3.charOrCode&&(_1c3.ctrlKey===undefined||_1c3.ctrlKey==evt.ctrlKey)&&(_1c3.altKey===undefined||_1c3.altKey==evt.altKey)&&(_1c3.metaKey===undefined||_1c3.metaKey==(evt.metaKey||false))&&(_1c3.shiftKey===undefined||_1c3.shiftKey==evt.shiftKey)){
dojo.stopEvent(evt);
dijit.typematic.trigger(evt,_1c4,node,_1c5,_1c3,_1c6,_1c7,_1c8);
}else{
if(dijit.typematic._obj==_1c3){
dijit.typematic.stop();
}
}
}),dojo.connect(node,"onkeyup",this,function(evt){
if(dijit.typematic._obj==_1c3){
dijit.typematic.stop();
}
})];
},addMouseListener:function(node,_1c9,_1ca,_1cb,_1cc,_1cd){
var dc=dojo.connect;
return [dc(node,"mousedown",this,function(evt){
dojo.stopEvent(evt);
dijit.typematic.trigger(evt,_1c9,node,_1ca,node,_1cb,_1cc,_1cd);
}),dc(node,"mouseup",this,function(evt){
dojo.stopEvent(evt);
dijit.typematic.stop();
}),dc(node,"mouseout",this,function(evt){
dojo.stopEvent(evt);
dijit.typematic.stop();
}),dc(node,"mousemove",this,function(evt){
evt.preventDefault();
}),dc(node,"dblclick",this,function(evt){
dojo.stopEvent(evt);
if(dojo.isIE){
dijit.typematic.trigger(evt,_1c9,node,_1ca,node,_1cb,_1cc,_1cd);
setTimeout(dojo.hitch(this,dijit.typematic.stop),50);
}
})];
},addListener:function(_1ce,_1cf,_1d0,_1d1,_1d2,_1d3,_1d4,_1d5){
return this.addKeyListener(_1cf,_1d0,_1d1,_1d2,_1d3,_1d4,_1d5).concat(this.addMouseListener(_1ce,_1d1,_1d2,_1d3,_1d4,_1d5));
}};
}
if(!dojo._hasResource["dijit._base.wai"]){
dojo._hasResource["dijit._base.wai"]=true;
dojo.provide("dijit._base.wai");
dijit.wai={onload:function(){
var div=dojo.create("div",{id:"a11yTestNode",style:{cssText:"border: 1px solid;"+"border-color:red green;"+"position: absolute;"+"height: 5px;"+"top: -999px;"+"background-image: url(\""+(dojo.config.blankGif||dojo.moduleUrl("dojo","resources/blank.gif"))+"\");"}},dojo.body());
var cs=dojo.getComputedStyle(div);
if(cs){
var _1d6=cs.backgroundImage;
var _1d7=(cs.borderTopColor==cs.borderRightColor)||(_1d6!=null&&(_1d6=="none"||_1d6=="url(invalid-url:)"));
dojo[_1d7?"addClass":"removeClass"](dojo.body(),"dijit_a11y");
if(dojo.isIE){
div.outerHTML="";
}else{
dojo.body().removeChild(div);
}
}
}};
if(dojo.isIE||dojo.isMoz){
dojo._loaders.unshift(dijit.wai.onload);
}
dojo.mixin(dijit,{hasWaiRole:function(elem,role){
var _1d8=this.getWaiRole(elem);
return role?(_1d8.indexOf(role)>-1):(_1d8.length>0);
},getWaiRole:function(elem){
return dojo.trim((dojo.attr(elem,"role")||"").replace("wairole:",""));
},setWaiRole:function(elem,role){
dojo.attr(elem,"role",role);
},removeWaiRole:function(elem,role){
var _1d9=dojo.attr(elem,"role");
if(!_1d9){
return;
}
if(role){
var t=dojo.trim((" "+_1d9+" ").replace(" "+role+" "," "));
dojo.attr(elem,"role",t);
}else{
elem.removeAttribute("role");
}
},hasWaiState:function(elem,_1da){
return elem.hasAttribute?elem.hasAttribute("aria-"+_1da):!!elem.getAttribute("aria-"+_1da);
},getWaiState:function(elem,_1db){
return elem.getAttribute("aria-"+_1db)||"";
},setWaiState:function(elem,_1dc,_1dd){
elem.setAttribute("aria-"+_1dc,_1dd);
},removeWaiState:function(elem,_1de){
elem.removeAttribute("aria-"+_1de);
}});
}
if(!dojo._hasResource["dijit._base"]){
dojo._hasResource["dijit._base"]=true;
dojo.provide("dijit._base");
}
if(!dojo._hasResource["dijit._Widget"]){
dojo._hasResource["dijit._Widget"]=true;
dojo.provide("dijit._Widget");
dojo.connect(dojo,"_connect",function(_1df,_1e0){
if(_1df&&dojo.isFunction(_1df._onConnect)){
_1df._onConnect(_1e0);
}
});
dijit._connectOnUseEventHandler=function(_1e1){
};
dijit._lastKeyDownNode=null;
if(dojo.isIE){
(function(){
var _1e2=function(evt){
dijit._lastKeyDownNode=evt.srcElement;
};
dojo.doc.attachEvent("onkeydown",_1e2);
dojo.addOnWindowUnload(function(){
dojo.doc.detachEvent("onkeydown",_1e2);
});
})();
}else{
dojo.doc.addEventListener("keydown",function(evt){
dijit._lastKeyDownNode=evt.target;
},true);
}
(function(){
dojo.declare("dijit._Widget",dijit._WidgetBase,{_deferredConnects:{onClick:"",onDblClick:"",onKeyDown:"",onKeyPress:"",onKeyUp:"",onMouseMove:"",onMouseDown:"",onMouseOut:"",onMouseOver:"",onMouseLeave:"",onMouseEnter:"",onMouseUp:""},onClick:dijit._connectOnUseEventHandler,onDblClick:dijit._connectOnUseEventHandler,onKeyDown:dijit._connectOnUseEventHandler,onKeyPress:dijit._connectOnUseEventHandler,onKeyUp:dijit._connectOnUseEventHandler,onMouseDown:dijit._connectOnUseEventHandler,onMouseMove:dijit._connectOnUseEventHandler,onMouseOut:dijit._connectOnUseEventHandler,onMouseOver:dijit._connectOnUseEventHandler,onMouseLeave:dijit._connectOnUseEventHandler,onMouseEnter:dijit._connectOnUseEventHandler,onMouseUp:dijit._connectOnUseEventHandler,create:function(_1e3,_1e4){
this._deferredConnects=dojo.clone(this._deferredConnects);
for(var attr in this.attributeMap){
delete this._deferredConnects[attr];
}
for(attr in this._deferredConnects){
if(this[attr]!==dijit._connectOnUseEventHandler){
delete this._deferredConnects[attr];
}
}
this.inherited(arguments);
if(this.domNode){
for(attr in this.params){
this._onConnect(attr);
}
}
},_onConnect:function(_1e5){
if(_1e5 in this._deferredConnects){
var _1e6=this[this._deferredConnects[_1e5]||"domNode"];
this.connect(_1e6,_1e5.toLowerCase(),_1e5);
delete this._deferredConnects[_1e5];
}
},focused:false,isFocusable:function(){
return this.focus&&(dojo.style(this.domNode,"display")!="none");
},onFocus:function(){
},onBlur:function(){
},_onFocus:function(e){
this.onFocus();
},_onBlur:function(){
this.onBlur();
},setAttribute:function(attr,_1e7){
dojo.deprecated(this.declaredClass+"::setAttribute(attr, value) is deprecated. Use set() instead.","","2.0");
this.set(attr,_1e7);
},attr:function(name,_1e8){
if(dojo.config.isDebug){
var _1e9=arguments.callee._ach||(arguments.callee._ach={}),_1ea=(arguments.callee.caller||"unknown caller").toString();
if(!_1e9[_1ea]){
dojo.deprecated(this.declaredClass+"::attr() is deprecated. Use get() or set() instead, called from "+_1ea,"","2.0");
_1e9[_1ea]=true;
}
}
var args=arguments.length;
if(args>=2||typeof name==="object"){
return this.set.apply(this,arguments);
}else{
return this.get(name);
}
},nodesWithKeyClick:["input","button"],connect:function(obj,_1eb,_1ec){
var d=dojo,dc=d._connect,_1ed=this.inherited(arguments,[obj,_1eb=="ondijitclick"?"onclick":_1eb,_1ec]);
if(_1eb=="ondijitclick"){
if(d.indexOf(this.nodesWithKeyClick,obj.nodeName.toLowerCase())==-1){
var m=d.hitch(this,_1ec);
_1ed.push(dc(obj,"onkeydown",this,function(e){
if((e.keyCode==d.keys.ENTER||e.keyCode==d.keys.SPACE)&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&!e.metaKey){
dijit._lastKeyDownNode=e.target;
if(!("openDropDown" in this&&obj==this._buttonNode)){
e.preventDefault();
}
}
}),dc(obj,"onkeyup",this,function(e){
if((e.keyCode==d.keys.ENTER||e.keyCode==d.keys.SPACE)&&e.target==dijit._lastKeyDownNode&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&!e.metaKey){
dijit._lastKeyDownNode=null;
return m(e);
}
}));
}
}
return _1ed;
},_onShow:function(){
this.onShow();
},onShow:function(){
},onHide:function(){
},onClose:function(){
return true;
}});
})();
}
if(!dojo._hasResource["dijit._Contained"]){
dojo._hasResource["dijit._Contained"]=true;
dojo.provide("dijit._Contained");
dojo.declare("dijit._Contained",null,{getParent:function(){
var _1ee=dijit.getEnclosingWidget(this.domNode.parentNode);
return _1ee&&_1ee.isContainer?_1ee:null;
},_getSibling:function(_1ef){
var node=this.domNode;
do{
node=node[_1ef+"Sibling"];
}while(node&&node.nodeType!=1);
return node&&dijit.byNode(node);
},getPreviousSibling:function(){
return this._getSibling("previous");
},getNextSibling:function(){
return this._getSibling("next");
},getIndexInParent:function(){
var p=this.getParent();
if(!p||!p.getIndexOfChild){
return -1;
}
return p.getIndexOfChild(this);
}});
}
if(!dojo._hasResource["dijit._Container"]){
dojo._hasResource["dijit._Container"]=true;
dojo.provide("dijit._Container");
dojo.declare("dijit._Container",null,{isContainer:true,buildRendering:function(){
this.inherited(arguments);
if(!this.containerNode){
this.containerNode=this.domNode;
}
},addChild:function(_1f0,_1f1){
var _1f2=this.containerNode;
if(_1f1&&typeof _1f1=="number"){
var _1f3=this.getChildren();
if(_1f3&&_1f3.length>=_1f1){
_1f2=_1f3[_1f1-1].domNode;
_1f1="after";
}
}
dojo.place(_1f0.domNode,_1f2,_1f1);
if(this._started&&!_1f0._started){
_1f0.startup();
}
},removeChild:function(_1f4){
if(typeof _1f4=="number"){
_1f4=this.getChildren()[_1f4];
}
if(_1f4){
var node=_1f4.domNode;
if(node&&node.parentNode){
node.parentNode.removeChild(node);
}
}
},hasChildren:function(){
return this.getChildren().length>0;
},destroyDescendants:function(_1f5){
dojo.forEach(this.getChildren(),function(_1f6){
_1f6.destroyRecursive(_1f5);
});
},_getSiblingOfChild:function(_1f7,dir){
var node=_1f7.domNode,_1f8=(dir>0?"nextSibling":"previousSibling");
do{
node=node[_1f8];
}while(node&&(node.nodeType!=1||!dijit.byNode(node)));
return node&&dijit.byNode(node);
},getIndexOfChild:function(_1f9){
return dojo.indexOf(this.getChildren(),_1f9);
},startup:function(){
if(this._started){
return;
}
dojo.forEach(this.getChildren(),function(_1fa){
_1fa.startup();
});
this.inherited(arguments);
}});
}
if(!dojo._hasResource["dijit.layout._LayoutWidget"]){
dojo._hasResource["dijit.layout._LayoutWidget"]=true;
dojo.provide("dijit.layout._LayoutWidget");
dojo.declare("dijit.layout._LayoutWidget",[dijit._Widget,dijit._Container,dijit._Contained],{baseClass:"dijitLayoutContainer",isLayoutContainer:true,buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitContainer");
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
var _1fb=this.getParent&&this.getParent();
if(!(_1fb&&_1fb.isLayoutContainer)){
this.resize();
this.connect(dojo.isIE?this.domNode:dojo.global,"onresize",function(){
this.resize();
});
}
},resize:function(_1fc,_1fd){
var node=this.domNode;
if(_1fc){
dojo.marginBox(node,_1fc);
if(_1fc.t){
node.style.top=_1fc.t+"px";
}
if(_1fc.l){
node.style.left=_1fc.l+"px";
}
}
var mb=_1fd||{};
dojo.mixin(mb,_1fc||{});
if(!("h" in mb)||!("w" in mb)){
mb=dojo.mixin(dojo.marginBox(node),mb);
}
var cs=dojo.getComputedStyle(node);
var me=dojo._getMarginExtents(node,cs);
var be=dojo._getBorderExtents(node,cs);
var bb=(this._borderBox={w:mb.w-(me.w+be.w),h:mb.h-(me.h+be.h)});
var pe=dojo._getPadExtents(node,cs);
this._contentBox={l:dojo._toPixelValue(node,cs.paddingLeft),t:dojo._toPixelValue(node,cs.paddingTop),w:bb.w-pe.w,h:bb.h-pe.h};
this.layout();
},layout:function(){
},_setupChild:function(_1fe){
var cls=this.baseClass+"-child "+(_1fe.baseClass?this.baseClass+"-"+_1fe.baseClass:"");
dojo.addClass(_1fe.domNode,cls);
},addChild:function(_1ff,_200){
this.inherited(arguments);
if(this._started){
this._setupChild(_1ff);
}
},removeChild:function(_201){
var cls=this.baseClass+"-child"+(_201.baseClass?" "+this.baseClass+"-"+_201.baseClass:"");
dojo.removeClass(_201.domNode,cls);
this.inherited(arguments);
}});
dijit.layout.marginBox2contentBox=function(node,mb){
var cs=dojo.getComputedStyle(node);
var me=dojo._getMarginExtents(node,cs);
var pb=dojo._getPadBorderExtents(node,cs);
return {l:dojo._toPixelValue(node,cs.paddingLeft),t:dojo._toPixelValue(node,cs.paddingTop),w:mb.w-(me.w+pb.w),h:mb.h-(me.h+pb.h)};
};
(function(){
var _202=function(word){
return word.substring(0,1).toUpperCase()+word.substring(1);
};
var size=function(_203,dim){
var _204=_203.resize?_203.resize(dim):dojo.marginBox(_203.domNode,dim);
if(_204){
dojo.mixin(_203,_204);
}else{
dojo.mixin(_203,dojo.marginBox(_203.domNode));
dojo.mixin(_203,dim);
}
};
dijit.layout.layoutChildren=function(_205,dim,_206,_207,_208){
dim=dojo.mixin({},dim);
dojo.addClass(_205,"dijitLayoutContainer");
_206=dojo.filter(_206,function(item){
return item.region!="center"&&item.layoutAlign!="client";
}).concat(dojo.filter(_206,function(item){
return item.region=="center"||item.layoutAlign=="client";
}));
dojo.forEach(_206,function(_209){
var elm=_209.domNode,pos=(_209.region||_209.layoutAlign);
var _20a=elm.style;
_20a.left=dim.l+"px";
_20a.top=dim.t+"px";
_20a.position="absolute";
dojo.addClass(elm,"dijitAlign"+_202(pos));
var _20b={};
if(_207&&_207==_209.id){
_20b[_209.region=="top"||_209.region=="bottom"?"h":"w"]=_208;
}
if(pos=="top"||pos=="bottom"){
_20b.w=dim.w;
size(_209,_20b);
dim.h-=_209.h;
if(pos=="top"){
dim.t+=_209.h;
}else{
_20a.top=dim.t+dim.h+"px";
}
}else{
if(pos=="left"||pos=="right"){
_20b.h=dim.h;
size(_209,_20b);
dim.w-=_209.w;
if(pos=="left"){
dim.l+=_209.w;
}else{
_20a.left=dim.l+dim.w+"px";
}
}else{
if(pos=="client"||pos=="center"){
size(_209,dim);
}
}
}
});
};
})();
}
if(!dojo._hasResource["dijit.layout._ContentPaneResizeMixin"]){
dojo._hasResource["dijit.layout._ContentPaneResizeMixin"]=true;
dojo.provide("dijit.layout._ContentPaneResizeMixin");
dojo.declare("dijit.layout._ContentPaneResizeMixin",null,{doLayout:true,isContainer:true,isLayoutContainer:true,_startChildren:function(){
dojo.forEach(this.getChildren(),function(_20c){
_20c.startup();
_20c._started=true;
});
},startup:function(){
if(this._started){
return;
}
var _20d=dijit._Contained.prototype.getParent.call(this);
this._childOfLayoutWidget=_20d&&_20d.isLayoutContainer;
this._needLayout=!this._childOfLayoutWidget;
this.inherited(arguments);
this._startChildren();
if(this._isShown()){
this._onShow();
}
if(!this._childOfLayoutWidget){
this.connect(dojo.isIE?this.domNode:dojo.global,"onresize",function(){
this._needLayout=!this._childOfLayoutWidget;
this.resize();
});
}
},_checkIfSingleChild:function(){
var _20e=dojo.query("> *",this.containerNode).filter(function(node){
return node.tagName!=="SCRIPT";
}),_20f=_20e.filter(function(node){
return dojo.hasAttr(node,"data-dojo-type")||dojo.hasAttr(node,"dojoType")||dojo.hasAttr(node,"widgetId");
}),_210=dojo.filter(_20f.map(dijit.byNode),function(_211){
return _211&&_211.domNode&&_211.resize;
});
if(_20e.length==_20f.length&&_210.length==1){
this._singleChild=_210[0];
}else{
delete this._singleChild;
}
dojo.toggleClass(this.containerNode,this.baseClass+"SingleChild",!!this._singleChild);
},resize:function(_212,_213){
if(!this._wasShown&&this.open!==false){
this._onShow();
}
this._resizeCalled=true;
this._scheduleLayout(_212,_213);
},_scheduleLayout:function(_214,_215){
if(this._isShown()){
this._layout(_214,_215);
}else{
this._needLayout=true;
this._changeSize=_214;
this._resultSize=_215;
}
},_layout:function(_216,_217){
if(_216){
dojo.marginBox(this.domNode,_216);
}
var cn=this.containerNode;
if(cn===this.domNode){
var mb=_217||{};
dojo.mixin(mb,_216||{});
if(!("h" in mb)||!("w" in mb)){
mb=dojo.mixin(dojo.marginBox(cn),mb);
}
this._contentBox=dijit.layout.marginBox2contentBox(cn,mb);
}else{
this._contentBox=dojo.contentBox(cn);
}
this._layoutChildren();
delete this._needLayout;
},_layoutChildren:function(){
if(this.doLayout){
this._checkIfSingleChild();
}
if(this._singleChild&&this._singleChild.resize){
var cb=this._contentBox||dojo.contentBox(this.containerNode);
this._singleChild.resize({w:cb.w,h:cb.h});
}else{
dojo.forEach(this.getChildren(),function(_218){
if(_218.resize){
_218.resize();
}
});
}
},_isShown:function(){
if(this._childOfLayoutWidget){
if(this._resizeCalled&&"open" in this){
return this.open;
}
return this._resizeCalled;
}else{
if("open" in this){
return this.open;
}else{
var node=this.domNode,_219=this.domNode.parentNode;
return (node.style.display!="none")&&(node.style.visibility!="hidden")&&!dojo.hasClass(node,"dijitHidden")&&_219&&_219.style&&(_219.style.display!="none");
}
}
},_onShow:function(){
if(this._needLayout){
this._layout(this._changeSize,this._resultSize);
}
this.inherited(arguments);
this._wasShown=true;
}});
}
if(!dojo._hasResource["dojo.string"]){
dojo._hasResource["dojo.string"]=true;
dojo.provide("dojo.string");
dojo.getObject("string",true,dojo);
dojo.string.rep=function(str,num){
if(num<=0||!str){
return "";
}
var buf=[];
for(;;){
if(num&1){
buf.push(str);
}
if(!(num>>=1)){
break;
}
str+=str;
}
return buf.join("");
};
dojo.string.pad=function(text,size,ch,end){
if(!ch){
ch="0";
}
var out=String(text),pad=dojo.string.rep(ch,Math.ceil((size-out.length)/ch.length));
return end?out+pad:pad+out;
};
dojo.string.substitute=function(_21a,map,_21b,_21c){
_21c=_21c||dojo.global;
_21b=_21b?dojo.hitch(_21c,_21b):function(v){
return v;
};
return _21a.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,function(_21d,key,_21e){
var _21f=dojo.getObject(key,false,map);
if(_21e){
_21f=dojo.getObject(_21e,false,_21c).call(_21c,_21f,key);
}
return _21b(_21f,key).toString();
});
};
dojo.string.trim=String.prototype.trim?dojo.trim:function(str){
str=str.replace(/^\s+/,"");
for(var i=str.length-1;i>=0;i--){
if(/\S/.test(str.charAt(i))){
str=str.substring(0,i+1);
break;
}
}
return str;
};
}
if(!dojo._hasResource["dojo.html"]){
dojo._hasResource["dojo.html"]=true;
dojo.provide("dojo.html");
dojo.getObject("html",true,dojo);
(function(){
var _220=0,d=dojo;
dojo.html._secureForInnerHtml=function(cont){
return cont.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig,"");
};
dojo.html._emptyNode=dojo.empty;
dojo.html._setNodeContent=function(node,cont){
d.empty(node);
if(cont){
if(typeof cont=="string"){
cont=d._toDom(cont,node.ownerDocument);
}
if(!cont.nodeType&&d.isArrayLike(cont)){
for(var _221=cont.length,i=0;i<cont.length;i=_221==cont.length?i+1:0){
d.place(cont[i],node,"last");
}
}else{
d.place(cont,node,"last");
}
}
return node;
};
dojo.declare("dojo.html._ContentSetter",null,{node:"",content:"",id:"",cleanContent:false,extractContent:false,parseContent:false,parserScope:dojo._scopeName,startup:true,constructor:function(_222,node){
dojo.mixin(this,_222||{});
node=this.node=dojo.byId(this.node||node);
if(!this.id){
this.id=["Setter",(node)?node.id||node.tagName:"",_220++].join("_");
}
},set:function(cont,_223){
if(undefined!==cont){
this.content=cont;
}
if(_223){
this._mixin(_223);
}
this.onBegin();
this.setContent();
this.onEnd();
return this.node;
},setContent:function(){
var node=this.node;
if(!node){
throw new Error(this.declaredClass+": setContent given no node");
}
try{
node=dojo.html._setNodeContent(node,this.content);
}
catch(e){
var _224=this.onContentError(e);
try{
node.innerHTML=_224;
}
catch(e){
console.error("Fatal "+this.declaredClass+".setContent could not change content due to "+e.message,e);
}
}
this.node=node;
},empty:function(){
if(this.parseResults&&this.parseResults.length){
dojo.forEach(this.parseResults,function(w){
if(w.destroy){
w.destroy();
}
});
delete this.parseResults;
}
dojo.html._emptyNode(this.node);
},onBegin:function(){
var cont=this.content;
if(dojo.isString(cont)){
if(this.cleanContent){
cont=dojo.html._secureForInnerHtml(cont);
}
if(this.extractContent){
var _225=cont.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
if(_225){
cont=_225[1];
}
}
}
this.empty();
this.content=cont;
return this.node;
},onEnd:function(){
if(this.parseContent){
this._parse();
}
return this.node;
},tearDown:function(){
delete this.parseResults;
delete this.node;
delete this.content;
},onContentError:function(err){
return "Error occured setting content: "+err;
},_mixin:function(_226){
var _227={},key;
for(key in _226){
if(key in _227){
continue;
}
this[key]=_226[key];
}
},_parse:function(){
var _228=this.node;
try{
var _229={};
dojo.forEach(["dir","lang","textDir"],function(name){
if(this[name]){
_229[name]=this[name];
}
},this);
this.parseResults=dojo.parser.parse({rootNode:_228,noStart:!this.startup,inherited:_229,scope:this.parserScope});
}
catch(e){
this._onError("Content",e,"Error parsing in _ContentSetter#"+this.id);
}
},_onError:function(type,err,_22a){
var _22b=this["on"+type+"Error"].call(this,err);
if(_22a){
console.error(_22a,err);
}else{
if(_22b){
dojo.html._setNodeContent(this.node,_22b,true);
}
}
}});
dojo.html.set=function(node,cont,_22c){
if(undefined==cont){
console.warn("dojo.html.set: no cont argument provided, using empty string");
cont="";
}
if(!_22c){
return dojo.html._setNodeContent(node,cont,true);
}else{
var op=new dojo.html._ContentSetter(dojo.mixin(_22c,{content:cont,node:node}));
return op.set();
}
};
})();
}
if(!dojo._hasResource["dojo.i18n"]){
dojo._hasResource["dojo.i18n"]=true;
dojo.provide("dojo.i18n");
dojo.getObject("i18n",true,dojo);
dojo.i18n.getLocalization=dojo.i18n.getLocalization||function(_22d,_22e,_22f){
_22f=dojo.i18n.normalizeLocale(_22f);
var _230=_22f.split("-");
var _231=[_22d,"nls",_22e].join(".");
var _232=dojo._loadedModules[_231];
if(_232){
var _233;
for(var i=_230.length;i>0;i--){
var loc=_230.slice(0,i).join("_");
if(_232[loc]){
_233=_232[loc];
break;
}
}
if(!_233){
_233=_232.ROOT;
}
if(_233){
var _234=function(){
};
_234.prototype=_233;
return new _234();
}
}
throw new Error("Bundle not found: "+_22e+" in "+_22d+" , locale="+_22f);
};
dojo.i18n.normalizeLocale=function(_235){
var _236=_235?_235.toLowerCase():dojo.locale;
if(_236=="root"){
_236="ROOT";
}
return _236;
};
dojo.i18n._requireLocalization=function(_237,_238,_239,_23a){
var _23b=dojo.i18n.normalizeLocale(_239);
var _23c=[_237,"nls",_238].join(".");
var _23d="";
if(_23a){
var _23e=_23a.split(",");
for(var i=0;i<_23e.length;i++){
if(_23b["indexOf"](_23e[i])==0){
if(_23e[i].length>_23d.length){
_23d=_23e[i];
}
}
}
if(!_23d){
_23d="ROOT";
}
}
var _23f=_23a?_23d:_23b;
var _240=dojo._loadedModules[_23c];
var _241=null;
if(_240){
if(dojo.config.localizationComplete&&_240._built){
return;
}
var _242=_23f.replace(/-/g,"_");
var _243=_23c+"."+_242;
_241=dojo._loadedModules[_243];
}
if(!_241){
_240=dojo["provide"](_23c);
var syms=dojo._getModuleSymbols(_237);
var _244=syms.concat("nls").join("/");
var _245;
dojo.i18n._searchLocalePath(_23f,_23a,function(loc){
var _246=loc.replace(/-/g,"_");
var _247=_23c+"."+_246;
var _248=false;
if(!dojo._loadedModules[_247]){
dojo["provide"](_247);
var _249=[_244];
if(loc!="ROOT"){
_249.push(loc);
}
_249.push(_238);
var _24a=_249.join("/")+".js";
_248=dojo._loadPath(_24a,null,function(hash){
hash=hash.root||hash;
var _24b=function(){
};
_24b.prototype=_245;
_240[_246]=new _24b();
for(var j in hash){
_240[_246][j]=hash[j];
}
});
}else{
_248=true;
}
if(_248&&_240[_246]){
_245=_240[_246];
}else{
_240[_246]=_245;
}
if(_23a){
return true;
}
});
}
if(_23a&&_23b!=_23d){
_240[_23b.replace(/-/g,"_")]=_240[_23d.replace(/-/g,"_")];
}
};
(function(){
var _24c=dojo.config.extraLocale;
if(_24c){
if(!_24c instanceof Array){
_24c=[_24c];
}
var req=dojo.i18n._requireLocalization;
dojo.i18n._requireLocalization=function(m,b,_24d,_24e){
req(m,b,_24d,_24e);
if(_24d){
return;
}
for(var i=0;i<_24c.length;i++){
req(m,b,_24c[i],_24e);
}
};
}
})();
dojo.i18n._searchLocalePath=function(_24f,down,_250){
_24f=dojo.i18n.normalizeLocale(_24f);
var _251=_24f.split("-");
var _252=[];
for(var i=_251.length;i>0;i--){
_252.push(_251.slice(0,i).join("-"));
}
_252.push(false);
if(down){
_252.reverse();
}
for(var j=_252.length-1;j>=0;j--){
var loc=_252[j]||"ROOT";
var stop=_250(loc);
if(stop){
break;
}
}
};
dojo.i18n._preloadLocalizations=function(_253,_254){
function _255(_256){
_256=dojo.i18n.normalizeLocale(_256);
dojo.i18n._searchLocalePath(_256,true,function(loc){
for(var i=0;i<_254.length;i++){
if(_254[i]==loc){
dojo["require"](_253+"_"+loc);
return true;
}
}
return false;
});
};
_255();
var _257=dojo.config.extraLocale||[];
for(var i=0;i<_257.length;i++){
_255(_257[i]);
}
};
}
if(!dojo._hasResource["dijit.layout.ContentPane"]){
dojo._hasResource["dijit.layout.ContentPane"]=true;
dojo.provide("dijit.layout.ContentPane");
dojo.declare("dijit.layout.ContentPane",[dijit._Widget,dijit.layout._ContentPaneResizeMixin],{href:"",extractContent:false,parseOnLoad:true,parserScope:dojo._scopeName,preventCache:false,preload:false,refreshOnShow:false,loadingMessage:"<span class='dijitContentPaneLoading'>${loadingState}</span>",errorMessage:"<span class='dijitContentPaneError'>${errorState}</span>",isLoaded:false,baseClass:"dijitContentPane",ioArgs:{},onLoadDeferred:null,attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{title:[]}),stopParser:true,template:false,create:function(_258,_259){
if((!_258||!_258.template)&&_259&&!("href" in _258)&&!("content" in _258)){
var df=dojo.doc.createDocumentFragment();
_259=dojo.byId(_259);
while(_259.firstChild){
df.appendChild(_259.firstChild);
}
_258=dojo.delegate(_258,{content:df});
}
this.inherited(arguments,[_258,_259]);
},postMixInProperties:function(){
this.inherited(arguments);
var _25a=dojo.i18n.getLocalization("dijit","loading",this.lang);
this.loadingMessage=dojo.string.substitute(this.loadingMessage,_25a);
this.errorMessage=dojo.string.substitute(this.errorMessage,_25a);
},buildRendering:function(){
this.inherited(arguments);
if(!this.containerNode){
this.containerNode=this.domNode;
}
this.domNode.title="";
if(!dojo.attr(this.domNode,"role")){
dijit.setWaiRole(this.domNode,"group");
}
},_startChildren:function(){
this.inherited(arguments);
if(this._contentSetter){
dojo.forEach(this._contentSetter.parseResults,function(obj){
if(!obj._started&&!obj._destroyed&&dojo.isFunction(obj.startup)){
obj.startup();
obj._started=true;
}
},this);
}
},setHref:function(href){
dojo.deprecated("dijit.layout.ContentPane.setHref() is deprecated. Use set('href', ...) instead.","","2.0");
return this.set("href",href);
},_setHrefAttr:function(href){
this.cancel();
this.onLoadDeferred=new dojo.Deferred(dojo.hitch(this,"cancel"));
this.onLoadDeferred.addCallback(dojo.hitch(this,"onLoad"));
this._set("href",href);
if(this.preload||(this._created&&this._isShown())){
this._load();
}else{
this._hrefChanged=true;
}
return this.onLoadDeferred;
},setContent:function(data){
dojo.deprecated("dijit.layout.ContentPane.setContent() is deprecated.  Use set('content', ...) instead.","","2.0");
this.set("content",data);
},_setContentAttr:function(data){
this._set("href","");
this.cancel();
this.onLoadDeferred=new dojo.Deferred(dojo.hitch(this,"cancel"));
if(this._created){
this.onLoadDeferred.addCallback(dojo.hitch(this,"onLoad"));
}
this._setContent(data||"");
this._isDownloaded=false;
return this.onLoadDeferred;
},_getContentAttr:function(){
return this.containerNode.innerHTML;
},cancel:function(){
if(this._xhrDfd&&(this._xhrDfd.fired==-1)){
this._xhrDfd.cancel();
}
delete this._xhrDfd;
this.onLoadDeferred=null;
},uninitialize:function(){
if(this._beingDestroyed){
this.cancel();
}
this.inherited(arguments);
},destroyRecursive:function(_25b){
if(this._beingDestroyed){
return;
}
this.inherited(arguments);
},_onShow:function(){
this.inherited(arguments);
if(this.href){
if(!this._xhrDfd&&(!this.isLoaded||this._hrefChanged||this.refreshOnShow)){
return this.refresh();
}
}
},refresh:function(){
this.cancel();
this.onLoadDeferred=new dojo.Deferred(dojo.hitch(this,"cancel"));
this.onLoadDeferred.addCallback(dojo.hitch(this,"onLoad"));
this._load();
return this.onLoadDeferred;
},_load:function(){
this._setContent(this.onDownloadStart(),true);
var self=this;
var _25c={preventCache:(this.preventCache||this.refreshOnShow),url:this.href,handleAs:"text"};
if(dojo.isObject(this.ioArgs)){
dojo.mixin(_25c,this.ioArgs);
}
var hand=(this._xhrDfd=(this.ioMethod||dojo.xhrGet)(_25c));
hand.addCallback(function(html){
try{
self._isDownloaded=true;
self._setContent(html,false);
self.onDownloadEnd();
}
catch(err){
self._onError("Content",err);
}
delete self._xhrDfd;
return html;
});
hand.addErrback(function(err){
if(!hand.canceled){
self._onError("Download",err);
}
delete self._xhrDfd;
return err;
});
delete this._hrefChanged;
},_onLoadHandler:function(data){
this._set("isLoaded",true);
try{
this.onLoadDeferred.callback(data);
}
catch(e){
console.error("Error "+this.widgetId+" running custom onLoad code: "+e.message);
}
},_onUnloadHandler:function(){
this._set("isLoaded",false);
try{
this.onUnload();
}
catch(e){
console.error("Error "+this.widgetId+" running custom onUnload code: "+e.message);
}
},destroyDescendants:function(){
if(this.isLoaded){
this._onUnloadHandler();
}
var _25d=this._contentSetter;
dojo.forEach(this.getChildren(),function(_25e){
if(_25e.destroyRecursive){
_25e.destroyRecursive();
}
});
if(_25d){
dojo.forEach(_25d.parseResults,function(_25f){
if(_25f.destroyRecursive&&_25f.domNode&&_25f.domNode.parentNode==dojo.body()){
_25f.destroyRecursive();
}
});
delete _25d.parseResults;
}
dojo.html._emptyNode(this.containerNode);
delete this._singleChild;
},_setContent:function(cont,_260){
this.destroyDescendants();
var _261=this._contentSetter;
if(!(_261&&_261 instanceof dojo.html._ContentSetter)){
_261=this._contentSetter=new dojo.html._ContentSetter({node:this.containerNode,_onError:dojo.hitch(this,this._onError),onContentError:dojo.hitch(this,function(e){
var _262=this.onContentError(e);
try{
this.containerNode.innerHTML=_262;
}
catch(e){
console.error("Fatal "+this.id+" could not change content due to "+e.message,e);
}
})});
}
var _263=dojo.mixin({cleanContent:this.cleanContent,extractContent:this.extractContent,parseContent:this.parseOnLoad,parserScope:this.parserScope,startup:false,dir:this.dir,lang:this.lang},this._contentSetterParams||{});
_261.set((dojo.isObject(cont)&&cont.domNode)?cont.domNode:cont,_263);
delete this._contentSetterParams;
if(this.doLayout){
this._checkIfSingleChild();
}
if(!_260){
if(this._started){
this._startChildren();
this._scheduleLayout();
}
this._onLoadHandler(cont);
}
},_onError:function(type,err,_264){
this.onLoadDeferred.errback(err);
var _265=this["on"+type+"Error"].call(this,err);
if(_264){
console.error(_264,err);
}else{
if(_265){
this._setContent(_265,true);
}
}
},onLoad:function(data){
},onUnload:function(){
},onDownloadStart:function(){
return this.loadingMessage;
},onContentError:function(_266){
},onDownloadError:function(_267){
return this.errorMessage;
},onDownloadEnd:function(){
}});
}
if(!dojo._hasResource["dojo.regexp"]){
dojo._hasResource["dojo.regexp"]=true;
dojo.provide("dojo.regexp");
dojo.getObject("regexp",true,dojo);
dojo.regexp.escapeString=function(str,_268){
return str.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g,function(ch){
if(_268&&_268.indexOf(ch)!=-1){
return ch;
}
return "\\"+ch;
});
};
dojo.regexp.buildGroupRE=function(arr,re,_269){
if(!(arr instanceof Array)){
return re(arr);
}
var b=[];
for(var i=0;i<arr.length;i++){
b.push(re(arr[i]));
}
return dojo.regexp.group(b.join("|"),_269);
};
dojo.regexp.group=function(_26a,_26b){
return "("+(_26b?"?:":"")+_26a+")";
};
}
if(!dojo._hasResource["dojo.cookie"]){
dojo._hasResource["dojo.cookie"]=true;
dojo.provide("dojo.cookie");
dojo.cookie=function(name,_26c,_26d){
var c=document.cookie;
if(arguments.length==1){
var _26e=c.match(new RegExp("(?:^|; )"+dojo.regexp.escapeString(name)+"=([^;]*)"));
return _26e?decodeURIComponent(_26e[1]):undefined;
}else{
_26d=_26d||{};
var exp=_26d.expires;
if(typeof exp=="number"){
var d=new Date();
d.setTime(d.getTime()+exp*24*60*60*1000);
exp=_26d.expires=d;
}
if(exp&&exp.toUTCString){
_26d.expires=exp.toUTCString();
}
_26c=encodeURIComponent(_26c);
var _26f=name+"="+_26c,_270;
for(_270 in _26d){
_26f+="; "+_270;
var _271=_26d[_270];
if(_271!==true){
_26f+="="+_271;
}
}
document.cookie=_26f;
}
};
dojo.cookie.isSupported=function(){
if(!("cookieEnabled" in navigator)){
this("__djCookieTest__","CookiesAllowed");
navigator.cookieEnabled=this("__djCookieTest__")=="CookiesAllowed";
if(navigator.cookieEnabled){
this("__djCookieTest__","",{expires:-1});
}
}
return navigator.cookieEnabled;
};
}
if(!dojo._hasResource["dojo.cache"]){
dojo._hasResource["dojo.cache"]=true;
dojo.provide("dojo.cache");
var cache={};
dojo.cache=function(_272,url,_273){
if(typeof _272=="string"){
var _274=dojo.moduleUrl(_272,url);
}else{
_274=_272;
_273=url;
}
var key=_274.toString();
var val=_273;
if(_273!=undefined&&!dojo.isString(_273)){
val=("value" in _273?_273.value:undefined);
}
var _275=_273&&_273.sanitize?true:false;
if(typeof val=="string"){
val=cache[key]=_275?dojo.cache._sanitize(val):val;
}else{
if(val===null){
delete cache[key];
}else{
if(!(key in cache)){
val=dojo._getText(key);
cache[key]=_275?dojo.cache._sanitize(val):val;
}
val=cache[key];
}
}
return val;
};
dojo.cache._sanitize=function(val){
if(val){
val=val.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,"");
var _276=val.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
if(_276){
val=_276[1];
}
}else{
val="";
}
return val;
};
}
if(!dojo._hasResource["dijit._Templated"]){
dojo._hasResource["dijit._Templated"]=true;
dojo.provide("dijit._Templated");
dojo.declare("dijit._Templated",null,{templateString:null,templatePath:null,widgetsInTemplate:false,_skipNodeCache:false,_earlyTemplatedStartup:false,constructor:function(){
this._attachPoints=[];
this._attachEvents=[];
},_stringRepl:function(tmpl){
var _277=this.declaredClass,_278=this;
return dojo.string.substitute(tmpl,this,function(_279,key){
if(key.charAt(0)=="!"){
_279=dojo.getObject(key.substr(1),false,_278);
}
if(typeof _279=="undefined"){
throw new Error(_277+" template:"+key);
}
if(_279==null){
return "";
}
return key.charAt(0)=="!"?_279:_279.toString().replace(/"/g,"&quot;");
},this);
},buildRendering:function(){
var _27a=dijit._Templated.getCachedTemplate(this.templatePath,this.templateString,this._skipNodeCache);
var node;
if(dojo.isString(_27a)){
node=dojo._toDom(this._stringRepl(_27a));
if(node.nodeType!=1){
throw new Error("Invalid template: "+_27a);
}
}else{
node=_27a.cloneNode(true);
}
this.domNode=node;
this.inherited(arguments);
this._attachTemplateNodes(node);
if(this.widgetsInTemplate){
var cw=(this._startupWidgets=dojo.parser.parse(node,{noStart:!this._earlyTemplatedStartup,template:true,inherited:{dir:this.dir,lang:this.lang},propsThis:this,scope:"dojo"}));
this._supportingWidgets=dijit.findWidgets(node);
this._attachTemplateNodes(cw,function(n,p){
return n[p];
});
}
this._fillContent(this.srcNodeRef);
},_fillContent:function(_27b){
var dest=this.containerNode;
if(_27b&&dest){
while(_27b.hasChildNodes()){
dest.appendChild(_27b.firstChild);
}
}
},_attachTemplateNodes:function(_27c,_27d){
_27d=_27d||function(n,p){
return n.getAttribute(p);
};
var _27e=dojo.isArray(_27c)?_27c:(_27c.all||_27c.getElementsByTagName("*"));
var x=dojo.isArray(_27c)?0:-1;
for(;x<_27e.length;x++){
var _27f=(x==-1)?_27c:_27e[x];
if(this.widgetsInTemplate&&(_27d(_27f,"dojoType")||_27d(_27f,"data-dojo-type"))){
continue;
}
var _280=_27d(_27f,"dojoAttachPoint")||_27d(_27f,"data-dojo-attach-point");
if(_280){
var _281,_282=_280.split(/\s*,\s*/);
while((_281=_282.shift())){
if(dojo.isArray(this[_281])){
this[_281].push(_27f);
}else{
this[_281]=_27f;
}
this._attachPoints.push(_281);
}
}
var _283=_27d(_27f,"dojoAttachEvent")||_27d(_27f,"data-dojo-attach-event");
if(_283){
var _284,_285=_283.split(/\s*,\s*/);
var trim=dojo.trim;
while((_284=_285.shift())){
if(_284){
var _286=null;
if(_284.indexOf(":")!=-1){
var _287=_284.split(":");
_284=trim(_287[0]);
_286=trim(_287[1]);
}else{
_284=trim(_284);
}
if(!_286){
_286=_284;
}
this._attachEvents.push(this.connect(_27f,_284,_286));
}
}
}
var role=_27d(_27f,"waiRole");
if(role){
dijit.setWaiRole(_27f,role);
}
var _288=_27d(_27f,"waiState");
if(_288){
dojo.forEach(_288.split(/\s*,\s*/),function(_289){
if(_289.indexOf("-")!=-1){
var pair=_289.split("-");
dijit.setWaiState(_27f,pair[0],pair[1]);
}
});
}
}
},startup:function(){
dojo.forEach(this._startupWidgets,function(w){
if(w&&!w._started&&w.startup){
w.startup();
}
});
this.inherited(arguments);
},destroyRendering:function(){
dojo.forEach(this._attachPoints,function(_28a){
delete this[_28a];
},this);
this._attachPoints=[];
dojo.forEach(this._attachEvents,this.disconnect,this);
this._attachEvents=[];
this.inherited(arguments);
}});
dijit._Templated._templateCache={};
dijit._Templated.getCachedTemplate=function(_28b,_28c,_28d){
var _28e=dijit._Templated._templateCache;
var key=_28c||_28b;
var _28f=_28e[key];
if(_28f){
try{
if(!_28f.ownerDocument||_28f.ownerDocument==dojo.doc){
return _28f;
}
}
catch(e){
}
dojo.destroy(_28f);
}
if(!_28c){
_28c=dojo.cache(_28b,{sanitize:true});
}
_28c=dojo.string.trim(_28c);
if(_28d||_28c.match(/\$\{([^\}]+)\}/g)){
return (_28e[key]=_28c);
}else{
var node=dojo._toDom(_28c);
if(node.nodeType!=1){
throw new Error("Invalid template: "+_28c);
}
return (_28e[key]=node);
}
};
if(dojo.isIE){
dojo.addOnWindowUnload(function(){
var _290=dijit._Templated._templateCache;
for(var key in _290){
var _291=_290[key];
if(typeof _291=="object"){
dojo.destroy(_291);
}
delete _290[key];
}
});
}
dojo.extend(dijit._Widget,{dojoAttachEvent:"",dojoAttachPoint:"",waiRole:"",waiState:""});
}
if(!dojo._hasResource["dijit.layout.BorderContainer"]){
dojo._hasResource["dijit.layout.BorderContainer"]=true;
dojo.provide("dijit.layout.BorderContainer");
dojo.declare("dijit.layout.BorderContainer",dijit.layout._LayoutWidget,{design:"headline",gutters:true,liveSplitters:true,persist:false,baseClass:"dijitBorderContainer",_splitterClass:"dijit.layout._Splitter",postMixInProperties:function(){
if(!this.gutters){
this.baseClass+="NoGutter";
}
this.inherited(arguments);
},startup:function(){
if(this._started){
return;
}
dojo.forEach(this.getChildren(),this._setupChild,this);
this.inherited(arguments);
},_setupChild:function(_292){
var _293=_292.region;
if(_293){
this.inherited(arguments);
dojo.addClass(_292.domNode,this.baseClass+"Pane");
var ltr=this.isLeftToRight();
if(_293=="leading"){
_293=ltr?"left":"right";
}
if(_293=="trailing"){
_293=ltr?"right":"left";
}
if(_293!="center"&&(_292.splitter||this.gutters)&&!_292._splitterWidget){
var _294=dojo.getObject(_292.splitter?this._splitterClass:"dijit.layout._Gutter");
var _295=new _294({id:_292.id+"_splitter",container:this,child:_292,region:_293,live:this.liveSplitters});
_295.isSplitter=true;
_292._splitterWidget=_295;
dojo.place(_295.domNode,_292.domNode,"after");
_295.startup();
}
_292.region=_293;
}
},layout:function(){
this._layoutChildren();
},addChild:function(_296,_297){
this.inherited(arguments);
if(this._started){
this.layout();
}
},removeChild:function(_298){
var _299=_298.region;
var _29a=_298._splitterWidget;
if(_29a){
_29a.destroy();
delete _298._splitterWidget;
}
this.inherited(arguments);
if(this._started){
this._layoutChildren();
}
dojo.removeClass(_298.domNode,this.baseClass+"Pane");
dojo.style(_298.domNode,{top:"auto",bottom:"auto",left:"auto",right:"auto",position:"static"});
dojo.style(_298.domNode,_299=="top"||_299=="bottom"?"width":"height","auto");
},getChildren:function(){
return dojo.filter(this.inherited(arguments),function(_29b){
return !_29b.isSplitter;
});
},getSplitter:function(_29c){
return dojo.filter(this.getChildren(),function(_29d){
return _29d.region==_29c;
})[0]._splitterWidget;
},resize:function(_29e,_29f){
if(!this.cs||!this.pe){
var node=this.domNode;
this.cs=dojo.getComputedStyle(node);
this.pe=dojo._getPadExtents(node,this.cs);
this.pe.r=dojo._toPixelValue(node,this.cs.paddingRight);
this.pe.b=dojo._toPixelValue(node,this.cs.paddingBottom);
dojo.style(node,"padding","0px");
}
this.inherited(arguments);
},_layoutChildren:function(_2a0,_2a1){
if(!this._borderBox||!this._borderBox.h){
return;
}
var _2a2=dojo.map(this.getChildren(),function(_2a3,idx){
return {pane:_2a3,weight:[_2a3.region=="center"?Infinity:0,_2a3.layoutPriority,(this.design=="sidebar"?1:-1)*(/top|bottom/.test(_2a3.region)?1:-1),idx]};
},this);
_2a2.sort(function(a,b){
var aw=a.weight,bw=b.weight;
for(var i=0;i<aw.length;i++){
if(aw[i]!=bw[i]){
return aw[i]-bw[i];
}
}
return 0;
});
var _2a4=[];
dojo.forEach(_2a2,function(_2a5){
var pane=_2a5.pane;
_2a4.push(pane);
if(pane._splitterWidget){
_2a4.push(pane._splitterWidget);
}
});
var dim={l:this.pe.l,t:this.pe.t,w:this._borderBox.w-this.pe.w,h:this._borderBox.h-this.pe.h};
dijit.layout.layoutChildren(this.domNode,dim,_2a4,_2a0,_2a1);
},destroyRecursive:function(){
dojo.forEach(this.getChildren(),function(_2a6){
var _2a7=_2a6._splitterWidget;
if(_2a7){
_2a7.destroy();
}
delete _2a6._splitterWidget;
});
this.inherited(arguments);
}});
dojo.extend(dijit._Widget,{region:"",layoutPriority:0,splitter:false,minSize:0,maxSize:Infinity});
dojo.declare("dijit.layout._Splitter",[dijit._Widget,dijit._Templated],{live:true,templateString:"<div class=\"dijitSplitter\" dojoAttachEvent=\"onkeypress:_onKeyPress,onmousedown:_startDrag,onmouseenter:_onMouse,onmouseleave:_onMouse\" tabIndex=\"0\" role=\"separator\"><div class=\"dijitSplitterThumb\"></div></div>",postMixInProperties:function(){
this.inherited(arguments);
this.horizontal=/top|bottom/.test(this.region);
this._factor=/top|left/.test(this.region)?1:-1;
this._cookieName=this.container.id+"_"+this.region;
},buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitSplitter"+(this.horizontal?"H":"V"));
if(this.container.persist){
var _2a8=dojo.cookie(this._cookieName);
if(_2a8){
this.child.domNode.style[this.horizontal?"height":"width"]=_2a8;
}
}
},_computeMaxSize:function(){
var dim=this.horizontal?"h":"w",_2a9=dojo.marginBox(this.child.domNode)[dim],_2aa=dojo.filter(this.container.getChildren(),function(_2ab){
return _2ab.region=="center";
})[0],_2ac=dojo.marginBox(_2aa.domNode)[dim];
return Math.min(this.child.maxSize,_2a9+_2ac);
},_startDrag:function(e){
if(!this.cover){
this.cover=dojo.doc.createElement("div");
dojo.addClass(this.cover,"dijitSplitterCover");
dojo.place(this.cover,this.child.domNode,"after");
}
dojo.addClass(this.cover,"dijitSplitterCoverActive");
if(this.fake){
dojo.destroy(this.fake);
}
if(!(this._resize=this.live)){
(this.fake=this.domNode.cloneNode(true)).removeAttribute("id");
dojo.addClass(this.domNode,"dijitSplitterShadow");
dojo.place(this.fake,this.domNode,"after");
}
dojo.addClass(this.domNode,"dijitSplitterActive dijitSplitter"+(this.horizontal?"H":"V")+"Active");
if(this.fake){
dojo.removeClass(this.fake,"dijitSplitterHover dijitSplitter"+(this.horizontal?"H":"V")+"Hover");
}
var _2ad=this._factor,_2ae=this.horizontal,axis=_2ae?"pageY":"pageX",_2af=e[axis],_2b0=this.domNode.style,dim=_2ae?"h":"w",_2b1=dojo.marginBox(this.child.domNode)[dim],max=this._computeMaxSize(),min=this.child.minSize||20,_2b2=this.region,_2b3=_2b2=="top"||_2b2=="bottom"?"top":"left",_2b4=parseInt(_2b0[_2b3],10),_2b5=this._resize,_2b6=dojo.hitch(this.container,"_layoutChildren",this.child.id),de=dojo.doc;
this._handlers=(this._handlers||[]).concat([dojo.connect(de,"onmousemove",this._drag=function(e,_2b7){
var _2b8=e[axis]-_2af,_2b9=_2ad*_2b8+_2b1,_2ba=Math.max(Math.min(_2b9,max),min);
if(_2b5||_2b7){
_2b6(_2ba);
}
_2b0[_2b3]=_2b8+_2b4+_2ad*(_2ba-_2b9)+"px";
}),dojo.connect(de,"ondragstart",dojo.stopEvent),dojo.connect(dojo.body(),"onselectstart",dojo.stopEvent),dojo.connect(de,"onmouseup",this,"_stopDrag")]);
dojo.stopEvent(e);
},_onMouse:function(e){
var o=(e.type=="mouseover"||e.type=="mouseenter");
dojo.toggleClass(this.domNode,"dijitSplitterHover",o);
dojo.toggleClass(this.domNode,"dijitSplitter"+(this.horizontal?"H":"V")+"Hover",o);
},_stopDrag:function(e){
try{
if(this.cover){
dojo.removeClass(this.cover,"dijitSplitterCoverActive");
}
if(this.fake){
dojo.destroy(this.fake);
}
dojo.removeClass(this.domNode,"dijitSplitterActive dijitSplitter"+(this.horizontal?"H":"V")+"Active dijitSplitterShadow");
this._drag(e);
this._drag(e,true);
}
finally{
this._cleanupHandlers();
delete this._drag;
}
if(this.container.persist){
dojo.cookie(this._cookieName,this.child.domNode.style[this.horizontal?"height":"width"],{expires:365});
}
},_cleanupHandlers:function(){
dojo.forEach(this._handlers,dojo.disconnect);
delete this._handlers;
},_onKeyPress:function(e){
this._resize=true;
var _2bb=this.horizontal;
var tick=1;
var dk=dojo.keys;
switch(e.charOrCode){
case _2bb?dk.UP_ARROW:dk.LEFT_ARROW:
tick*=-1;
case _2bb?dk.DOWN_ARROW:dk.RIGHT_ARROW:
break;
default:
return;
}
var _2bc=dojo._getMarginSize(this.child.domNode)[_2bb?"h":"w"]+this._factor*tick;
this.container._layoutChildren(this.child.id,Math.max(Math.min(_2bc,this._computeMaxSize()),this.child.minSize));
dojo.stopEvent(e);
},destroy:function(){
this._cleanupHandlers();
delete this.child;
delete this.container;
delete this.cover;
delete this.fake;
this.inherited(arguments);
}});
dojo.declare("dijit.layout._Gutter",[dijit._Widget,dijit._Templated],{templateString:"<div class=\"dijitGutter\" role=\"presentation\"></div>",postMixInProperties:function(){
this.inherited(arguments);
this.horizontal=/top|bottom/.test(this.region);
},buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitGutter"+(this.horizontal?"H":"V"));
}});
}
if(!dojo._hasResource["dojo.data.util.filter"]){
dojo._hasResource["dojo.data.util.filter"]=true;
dojo.provide("dojo.data.util.filter");
dojo.getObject("data.util.filter",true,dojo);
dojo.data.util.filter.patternToRegExp=function(_2bd,_2be){
var rxp="^";
var c=null;
for(var i=0;i<_2bd.length;i++){
c=_2bd.charAt(i);
switch(c){
case "\\":
rxp+=c;
i++;
rxp+=_2bd.charAt(i);
break;
case "*":
rxp+=".*";
break;
case "?":
rxp+=".";
break;
case "$":
case "^":
case "/":
case "+":
case ".":
case "|":
case "(":
case ")":
case "{":
case "}":
case "[":
case "]":
rxp+="\\";
default:
rxp+=c;
}
}
rxp+="$";
if(_2be){
return new RegExp(rxp,"mi");
}else{
return new RegExp(rxp,"m");
}
};
}
if(!dojo._hasResource["dojo.data.util.sorter"]){
dojo._hasResource["dojo.data.util.sorter"]=true;
dojo.provide("dojo.data.util.sorter");
dojo.getObject("data.util.sorter",true,dojo);
dojo.data.util.sorter.basicComparator=function(a,b){
var r=-1;
if(a===null){
a=undefined;
}
if(b===null){
b=undefined;
}
if(a==b){
r=0;
}else{
if(a>b||a==null){
r=1;
}
}
return r;
};
dojo.data.util.sorter.createSortFunction=function(_2bf,_2c0){
var _2c1=[];
function _2c2(attr,dir,comp,s){
return function(_2c3,_2c4){
var a=s.getValue(_2c3,attr);
var b=s.getValue(_2c4,attr);
return dir*comp(a,b);
};
};
var _2c5;
var map=_2c0.comparatorMap;
var bc=dojo.data.util.sorter.basicComparator;
for(var i=0;i<_2bf.length;i++){
_2c5=_2bf[i];
var attr=_2c5.attribute;
if(attr){
var dir=(_2c5.descending)?-1:1;
var comp=bc;
if(map){
if(typeof attr!=="string"&&("toString" in attr)){
attr=attr.toString();
}
comp=map[attr]||bc;
}
_2c1.push(_2c2(attr,dir,comp,_2c0));
}
}
return function(rowA,rowB){
var i=0;
while(i<_2c1.length){
var ret=_2c1[i++](rowA,rowB);
if(ret!==0){
return ret;
}
}
return 0;
};
};
}
if(!dojo._hasResource["dojo.data.util.simpleFetch"]){
dojo._hasResource["dojo.data.util.simpleFetch"]=true;
dojo.provide("dojo.data.util.simpleFetch");
dojo.getObject("data.util.simpleFetch",true,dojo);
dojo.data.util.simpleFetch.fetch=function(_2c6){
_2c6=_2c6||{};
if(!_2c6.store){
_2c6.store=this;
}
var self=this;
var _2c7=function(_2c8,_2c9){
if(_2c9.onError){
var _2ca=_2c9.scope||dojo.global;
_2c9.onError.call(_2ca,_2c8,_2c9);
}
};
var _2cb=function(_2cc,_2cd){
var _2ce=_2cd.abort||null;
var _2cf=false;
var _2d0=_2cd.start?_2cd.start:0;
var _2d1=(_2cd.count&&(_2cd.count!==Infinity))?(_2d0+_2cd.count):_2cc.length;
_2cd.abort=function(){
_2cf=true;
if(_2ce){
_2ce.call(_2cd);
}
};
var _2d2=_2cd.scope||dojo.global;
if(!_2cd.store){
_2cd.store=self;
}
if(_2cd.onBegin){
_2cd.onBegin.call(_2d2,_2cc.length,_2cd);
}
if(_2cd.sort){
_2cc.sort(dojo.data.util.sorter.createSortFunction(_2cd.sort,self));
}
if(_2cd.onItem){
for(var i=_2d0;(i<_2cc.length)&&(i<_2d1);++i){
var item=_2cc[i];
if(!_2cf){
_2cd.onItem.call(_2d2,item,_2cd);
}
}
}
if(_2cd.onComplete&&!_2cf){
var _2d3=null;
if(!_2cd.onItem){
_2d3=_2cc.slice(_2d0,_2d1);
}
_2cd.onComplete.call(_2d2,_2d3,_2cd);
}
};
this._fetchItems(_2c6,_2cb,_2c7);
return _2c6;
};
}
if(!dojo._hasResource["dojo.data.ItemFileReadStore"]){
dojo._hasResource["dojo.data.ItemFileReadStore"]=true;
dojo.provide("dojo.data.ItemFileReadStore");
dojo.declare("dojo.data.ItemFileReadStore",null,{constructor:function(_2d4){
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=[];
this._loadFinished=false;
this._jsonFileUrl=_2d4.url;
this._ccUrl=_2d4.url;
this.url=_2d4.url;
this._jsonData=_2d4.data;
this.data=null;
this._datatypeMap=_2d4.typeMap||{};
if(!this._datatypeMap["Date"]){
this._datatypeMap["Date"]={type:Date,deserialize:function(_2d5){
return dojo.date.stamp.fromISOString(_2d5);
}};
}
this._features={"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
this._itemsByIdentity=null;
this._storeRefPropName="_S";
this._itemNumPropName="_0";
this._rootItemPropName="_RI";
this._reverseRefMap="_RRM";
this._loadInProgress=false;
this._queuedFetches=[];
if(_2d4.urlPreventCache!==undefined){
this.urlPreventCache=_2d4.urlPreventCache?true:false;
}
if(_2d4.hierarchical!==undefined){
this.hierarchical=_2d4.hierarchical?true:false;
}
if(_2d4.clearOnClose){
this.clearOnClose=true;
}
if("failOk" in _2d4){
this.failOk=_2d4.failOk?true:false;
}
},url:"",_ccUrl:"",data:null,typeMap:null,clearOnClose:false,urlPreventCache:false,failOk:false,hierarchical:true,_assertIsItem:function(item){
if(!this.isItem(item)){
throw new Error("dojo.data.ItemFileReadStore: Invalid item argument.");
}
},_assertIsAttribute:function(_2d6){
if(typeof _2d6!=="string"){
throw new Error("dojo.data.ItemFileReadStore: Invalid attribute argument.");
}
},getValue:function(item,_2d7,_2d8){
var _2d9=this.getValues(item,_2d7);
return (_2d9.length>0)?_2d9[0]:_2d8;
},getValues:function(item,_2da){
this._assertIsItem(item);
this._assertIsAttribute(_2da);
return (item[_2da]||[]).slice(0);
},getAttributes:function(item){
this._assertIsItem(item);
var _2db=[];
for(var key in item){
if((key!==this._storeRefPropName)&&(key!==this._itemNumPropName)&&(key!==this._rootItemPropName)&&(key!==this._reverseRefMap)){
_2db.push(key);
}
}
return _2db;
},hasAttribute:function(item,_2dc){
this._assertIsItem(item);
this._assertIsAttribute(_2dc);
return (_2dc in item);
},containsValue:function(item,_2dd,_2de){
var _2df=undefined;
if(typeof _2de==="string"){
_2df=dojo.data.util.filter.patternToRegExp(_2de,false);
}
return this._containsValue(item,_2dd,_2de,_2df);
},_containsValue:function(item,_2e0,_2e1,_2e2){
return dojo.some(this.getValues(item,_2e0),function(_2e3){
if(_2e3!==null&&!dojo.isObject(_2e3)&&_2e2){
if(_2e3.toString().match(_2e2)){
return true;
}
}else{
if(_2e1===_2e3){
return true;
}
}
});
},isItem:function(_2e4){
if(_2e4&&_2e4[this._storeRefPropName]===this){
if(this._arrayOfAllItems[_2e4[this._itemNumPropName]]===_2e4){
return true;
}
}
return false;
},isItemLoaded:function(_2e5){
return this.isItem(_2e5);
},loadItem:function(_2e6){
this._assertIsItem(_2e6.item);
},getFeatures:function(){
return this._features;
},getLabel:function(item){
if(this._labelAttr&&this.isItem(item)){
return this.getValue(item,this._labelAttr);
}
return undefined;
},getLabelAttributes:function(item){
if(this._labelAttr){
return [this._labelAttr];
}
return null;
},_fetchItems:function(_2e7,_2e8,_2e9){
var self=this,_2ea=function(_2eb,_2ec){
var _2ed=[],i,key;
if(_2eb.query){
var _2ee,_2ef=_2eb.queryOptions?_2eb.queryOptions.ignoreCase:false;
var _2f0={};
for(key in _2eb.query){
_2ee=_2eb.query[key];
if(typeof _2ee==="string"){
_2f0[key]=dojo.data.util.filter.patternToRegExp(_2ee,_2ef);
}else{
if(_2ee instanceof RegExp){
_2f0[key]=_2ee;
}
}
}
for(i=0;i<_2ec.length;++i){
var _2f1=true;
var _2f2=_2ec[i];
if(_2f2===null){
_2f1=false;
}else{
for(key in _2eb.query){
_2ee=_2eb.query[key];
if(!self._containsValue(_2f2,key,_2ee,_2f0[key])){
_2f1=false;
}
}
}
if(_2f1){
_2ed.push(_2f2);
}
}
_2e8(_2ed,_2eb);
}else{
for(i=0;i<_2ec.length;++i){
var item=_2ec[i];
if(item!==null){
_2ed.push(item);
}
}
_2e8(_2ed,_2eb);
}
};
if(this._loadFinished){
_2ea(_2e7,this._getItemsArray(_2e7.queryOptions));
}else{
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
this._ccUrl=this._jsonFileUrl;
this.url=this._jsonFileUrl;
}else{
if(this.url!==this._ccUrl){
this._jsonFileUrl=this.url;
this._ccUrl=this.url;
}
}
if(this.data!=null){
this._jsonData=this.data;
this.data=null;
}
if(this._jsonFileUrl){
if(this._loadInProgress){
this._queuedFetches.push({args:_2e7,filter:_2ea});
}else{
this._loadInProgress=true;
var _2f3={url:self._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};
var _2f4=dojo.xhrGet(_2f3);
_2f4.addCallback(function(data){
try{
self._getItemsFromLoadedData(data);
self._loadFinished=true;
self._loadInProgress=false;
_2ea(_2e7,self._getItemsArray(_2e7.queryOptions));
self._handleQueuedFetches();
}
catch(e){
self._loadFinished=true;
self._loadInProgress=false;
_2e9(e,_2e7);
}
});
_2f4.addErrback(function(_2f5){
self._loadInProgress=false;
_2e9(_2f5,_2e7);
});
var _2f6=null;
if(_2e7.abort){
_2f6=_2e7.abort;
}
_2e7.abort=function(){
var df=_2f4;
if(df&&df.fired===-1){
df.cancel();
df=null;
}
if(_2f6){
_2f6.call(_2e7);
}
};
}
}else{
if(this._jsonData){
try{
this._loadFinished=true;
this._getItemsFromLoadedData(this._jsonData);
this._jsonData=null;
_2ea(_2e7,this._getItemsArray(_2e7.queryOptions));
}
catch(e){
_2e9(e,_2e7);
}
}else{
_2e9(new Error("dojo.data.ItemFileReadStore: No JSON source data was provided as either URL or a nested Javascript object."),_2e7);
}
}
}
},_handleQueuedFetches:function(){
if(this._queuedFetches.length>0){
for(var i=0;i<this._queuedFetches.length;i++){
var _2f7=this._queuedFetches[i],_2f8=_2f7.args,_2f9=_2f7.filter;
if(_2f9){
_2f9(_2f8,this._getItemsArray(_2f8.queryOptions));
}else{
this.fetchItemByIdentity(_2f8);
}
}
this._queuedFetches=[];
}
},_getItemsArray:function(_2fa){
if(_2fa&&_2fa.deep){
return this._arrayOfAllItems;
}
return this._arrayOfTopLevelItems;
},close:function(_2fb){
if(this.clearOnClose&&this._loadFinished&&!this._loadInProgress){
if(((this._jsonFileUrl==""||this._jsonFileUrl==null)&&(this.url==""||this.url==null))&&this.data==null){
console.debug("dojo.data.ItemFileReadStore: WARNING!  Data reload "+" information has not been provided."+"  Please set 'url' or 'data' to the appropriate value before"+" the next fetch");
}
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=[];
this._loadFinished=false;
this._itemsByIdentity=null;
this._loadInProgress=false;
this._queuedFetches=[];
}
},_getItemsFromLoadedData:function(_2fc){
var _2fd=false,self=this;
function _2fe(_2ff){
var _300=((_2ff!==null)&&(typeof _2ff==="object")&&(!dojo.isArray(_2ff)||_2fd)&&(!dojo.isFunction(_2ff))&&(_2ff.constructor==Object||dojo.isArray(_2ff))&&(typeof _2ff._reference==="undefined")&&(typeof _2ff._type==="undefined")&&(typeof _2ff._value==="undefined")&&self.hierarchical);
return _300;
};
function _301(_302){
self._arrayOfAllItems.push(_302);
for(var _303 in _302){
var _304=_302[_303];
if(_304){
if(dojo.isArray(_304)){
var _305=_304;
for(var k=0;k<_305.length;++k){
var _306=_305[k];
if(_2fe(_306)){
_301(_306);
}
}
}else{
if(_2fe(_304)){
_301(_304);
}
}
}
}
};
this._labelAttr=_2fc.label;
var i,item;
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=_2fc.items;
for(i=0;i<this._arrayOfTopLevelItems.length;++i){
item=this._arrayOfTopLevelItems[i];
if(dojo.isArray(item)){
_2fd=true;
}
_301(item);
item[this._rootItemPropName]=true;
}
var _307={},key;
for(i=0;i<this._arrayOfAllItems.length;++i){
item=this._arrayOfAllItems[i];
for(key in item){
if(key!==this._rootItemPropName){
var _308=item[key];
if(_308!==null){
if(!dojo.isArray(_308)){
item[key]=[_308];
}
}else{
item[key]=[null];
}
}
_307[key]=key;
}
}
while(_307[this._storeRefPropName]){
this._storeRefPropName+="_";
}
while(_307[this._itemNumPropName]){
this._itemNumPropName+="_";
}
while(_307[this._reverseRefMap]){
this._reverseRefMap+="_";
}
var _309;
var _30a=_2fc.identifier;
if(_30a){
this._itemsByIdentity={};
this._features["dojo.data.api.Identity"]=_30a;
for(i=0;i<this._arrayOfAllItems.length;++i){
item=this._arrayOfAllItems[i];
_309=item[_30a];
var _30b=_309[0];
if(!Object.hasOwnProperty.call(this._itemsByIdentity,_30b)){
this._itemsByIdentity[_30b]=item;
}else{
if(this._jsonFileUrl){
throw new Error("dojo.data.ItemFileReadStore:  The json data as specified by: ["+this._jsonFileUrl+"] is malformed.  Items within the list have identifier: ["+_30a+"].  Value collided: ["+_30b+"]");
}else{
if(this._jsonData){
throw new Error("dojo.data.ItemFileReadStore:  The json data provided by the creation arguments is malformed.  Items within the list have identifier: ["+_30a+"].  Value collided: ["+_30b+"]");
}
}
}
}
}else{
this._features["dojo.data.api.Identity"]=Number;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
item=this._arrayOfAllItems[i];
item[this._storeRefPropName]=this;
item[this._itemNumPropName]=i;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
item=this._arrayOfAllItems[i];
for(key in item){
_309=item[key];
for(var j=0;j<_309.length;++j){
_308=_309[j];
if(_308!==null&&typeof _308=="object"){
if(("_type" in _308)&&("_value" in _308)){
var type=_308._type;
var _30c=this._datatypeMap[type];
if(!_30c){
throw new Error("dojo.data.ItemFileReadStore: in the typeMap constructor arg, no object class was specified for the datatype '"+type+"'");
}else{
if(dojo.isFunction(_30c)){
_309[j]=new _30c(_308._value);
}else{
if(dojo.isFunction(_30c.deserialize)){
_309[j]=_30c.deserialize(_308._value);
}else{
throw new Error("dojo.data.ItemFileReadStore: Value provided in typeMap was neither a constructor, nor a an object with a deserialize function");
}
}
}
}
if(_308._reference){
var _30d=_308._reference;
if(!dojo.isObject(_30d)){
_309[j]=this._getItemByIdentity(_30d);
}else{
for(var k=0;k<this._arrayOfAllItems.length;++k){
var _30e=this._arrayOfAllItems[k],_30f=true;
for(var _310 in _30d){
if(_30e[_310]!=_30d[_310]){
_30f=false;
}
}
if(_30f){
_309[j]=_30e;
}
}
}
if(this.referenceIntegrity){
var _311=_309[j];
if(this.isItem(_311)){
this._addReferenceToMap(_311,item,key);
}
}
}else{
if(this.isItem(_308)){
if(this.referenceIntegrity){
this._addReferenceToMap(_308,item,key);
}
}
}
}
}
}
}
},_addReferenceToMap:function(_312,_313,_314){
},getIdentity:function(item){
var _315=this._features["dojo.data.api.Identity"];
if(_315===Number){
return item[this._itemNumPropName];
}else{
var _316=item[_315];
if(_316){
return _316[0];
}
}
return null;
},fetchItemByIdentity:function(_317){
var item,_318;
if(!this._loadFinished){
var self=this;
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
this._ccUrl=this._jsonFileUrl;
this.url=this._jsonFileUrl;
}else{
if(this.url!==this._ccUrl){
this._jsonFileUrl=this.url;
this._ccUrl=this.url;
}
}
if(this.data!=null&&this._jsonData==null){
this._jsonData=this.data;
this.data=null;
}
if(this._jsonFileUrl){
if(this._loadInProgress){
this._queuedFetches.push({args:_317});
}else{
this._loadInProgress=true;
var _319={url:self._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};
var _31a=dojo.xhrGet(_319);
_31a.addCallback(function(data){
var _31b=_317.scope?_317.scope:dojo.global;
try{
self._getItemsFromLoadedData(data);
self._loadFinished=true;
self._loadInProgress=false;
item=self._getItemByIdentity(_317.identity);
if(_317.onItem){
_317.onItem.call(_31b,item);
}
self._handleQueuedFetches();
}
catch(error){
self._loadInProgress=false;
if(_317.onError){
_317.onError.call(_31b,error);
}
}
});
_31a.addErrback(function(_31c){
self._loadInProgress=false;
if(_317.onError){
var _31d=_317.scope?_317.scope:dojo.global;
_317.onError.call(_31d,_31c);
}
});
}
}else{
if(this._jsonData){
self._getItemsFromLoadedData(self._jsonData);
self._jsonData=null;
self._loadFinished=true;
item=self._getItemByIdentity(_317.identity);
if(_317.onItem){
_318=_317.scope?_317.scope:dojo.global;
_317.onItem.call(_318,item);
}
}
}
}else{
item=this._getItemByIdentity(_317.identity);
if(_317.onItem){
_318=_317.scope?_317.scope:dojo.global;
_317.onItem.call(_318,item);
}
}
},_getItemByIdentity:function(_31e){
var item=null;
if(this._itemsByIdentity&&Object.hasOwnProperty.call(this._itemsByIdentity,_31e)){
item=this._itemsByIdentity[_31e];
}else{
if(Object.hasOwnProperty.call(this._arrayOfAllItems,_31e)){
item=this._arrayOfAllItems[_31e];
}
}
if(item===undefined){
item=null;
}
return item;
},getIdentityAttributes:function(item){
var _31f=this._features["dojo.data.api.Identity"];
if(_31f===Number){
return null;
}else{
return [_31f];
}
},_forceLoad:function(){
var self=this;
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
this._ccUrl=this._jsonFileUrl;
this.url=this._jsonFileUrl;
}else{
if(this.url!==this._ccUrl){
this._jsonFileUrl=this.url;
this._ccUrl=this.url;
}
}
if(this.data!=null){
this._jsonData=this.data;
this.data=null;
}
if(this._jsonFileUrl){
var _320={url:this._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk,sync:true};
var _321=dojo.xhrGet(_320);
_321.addCallback(function(data){
try{
if(self._loadInProgress!==true&&!self._loadFinished){
self._getItemsFromLoadedData(data);
self._loadFinished=true;
}else{
if(self._loadInProgress){
throw new Error("dojo.data.ItemFileReadStore:  Unable to perform a synchronous load, an async load is in progress.");
}
}
}
catch(e){
console.log(e);
throw e;
}
});
_321.addErrback(function(_322){
throw _322;
});
}else{
if(this._jsonData){
self._getItemsFromLoadedData(self._jsonData);
self._jsonData=null;
self._loadFinished=true;
}
}
}});
dojo.extend(dojo.data.ItemFileReadStore,dojo.data.util.simpleFetch);
}
if(!dojo._hasResource["dojo.data.ItemFileWriteStore"]){
dojo._hasResource["dojo.data.ItemFileWriteStore"]=true;
dojo.provide("dojo.data.ItemFileWriteStore");
dojo.declare("dojo.data.ItemFileWriteStore",dojo.data.ItemFileReadStore,{constructor:function(_323){
this._features["dojo.data.api.Write"]=true;
this._features["dojo.data.api.Notification"]=true;
this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
if(!this._datatypeMap["Date"].serialize){
this._datatypeMap["Date"].serialize=function(obj){
return dojo.date.stamp.toISOString(obj,{zulu:true});
};
}
if(_323&&(_323.referenceIntegrity===false)){
this.referenceIntegrity=false;
}
this._saveInProgress=false;
},referenceIntegrity:true,_assert:function(_324){
if(!_324){
throw new Error("assertion failed in ItemFileWriteStore");
}
},_getIdentifierAttribute:function(){
var _325=this.getFeatures()["dojo.data.api.Identity"];
return _325;
},newItem:function(_326,_327){
this._assert(!this._saveInProgress);
if(!this._loadFinished){
this._forceLoad();
}
if(typeof _326!="object"&&typeof _326!="undefined"){
throw new Error("newItem() was passed something other than an object");
}
var _328=null;
var _329=this._getIdentifierAttribute();
if(_329===Number){
_328=this._arrayOfAllItems.length;
}else{
_328=_326[_329];
if(typeof _328==="undefined"){
throw new Error("newItem() was not passed an identity for the new item");
}
if(dojo.isArray(_328)){
throw new Error("newItem() was not passed an single-valued identity");
}
}
if(this._itemsByIdentity){
this._assert(typeof this._itemsByIdentity[_328]==="undefined");
}
this._assert(typeof this._pending._newItems[_328]==="undefined");
this._assert(typeof this._pending._deletedItems[_328]==="undefined");
var _32a={};
_32a[this._storeRefPropName]=this;
_32a[this._itemNumPropName]=this._arrayOfAllItems.length;
if(this._itemsByIdentity){
this._itemsByIdentity[_328]=_32a;
_32a[_329]=[_328];
}
this._arrayOfAllItems.push(_32a);
var _32b=null;
if(_327&&_327.parent&&_327.attribute){
_32b={item:_327.parent,attribute:_327.attribute,oldValue:undefined};
var _32c=this.getValues(_327.parent,_327.attribute);
if(_32c&&_32c.length>0){
var _32d=_32c.slice(0,_32c.length);
if(_32c.length===1){
_32b.oldValue=_32c[0];
}else{
_32b.oldValue=_32c.slice(0,_32c.length);
}
_32d.push(_32a);
this._setValueOrValues(_327.parent,_327.attribute,_32d,false);
_32b.newValue=this.getValues(_327.parent,_327.attribute);
}else{
this._setValueOrValues(_327.parent,_327.attribute,_32a,false);
_32b.newValue=_32a;
}
}else{
_32a[this._rootItemPropName]=true;
this._arrayOfTopLevelItems.push(_32a);
}
this._pending._newItems[_328]=_32a;
for(var key in _326){
if(key===this._storeRefPropName||key===this._itemNumPropName){
throw new Error("encountered bug in ItemFileWriteStore.newItem");
}
var _32e=_326[key];
if(!dojo.isArray(_32e)){
_32e=[_32e];
}
_32a[key]=_32e;
if(this.referenceIntegrity){
for(var i=0;i<_32e.length;i++){
var val=_32e[i];
if(this.isItem(val)){
this._addReferenceToMap(val,_32a,key);
}
}
}
}
this.onNew(_32a,_32b);
return _32a;
},_removeArrayElement:function(_32f,_330){
var _331=dojo.indexOf(_32f,_330);
if(_331!=-1){
_32f.splice(_331,1);
return true;
}
return false;
},deleteItem:function(item){
this._assert(!this._saveInProgress);
this._assertIsItem(item);
var _332=item[this._itemNumPropName];
var _333=this.getIdentity(item);
if(this.referenceIntegrity){
var _334=this.getAttributes(item);
if(item[this._reverseRefMap]){
item["backup_"+this._reverseRefMap]=dojo.clone(item[this._reverseRefMap]);
}
dojo.forEach(_334,function(_335){
dojo.forEach(this.getValues(item,_335),function(_336){
if(this.isItem(_336)){
if(!item["backupRefs_"+this._reverseRefMap]){
item["backupRefs_"+this._reverseRefMap]=[];
}
item["backupRefs_"+this._reverseRefMap].push({id:this.getIdentity(_336),attr:_335});
this._removeReferenceFromMap(_336,item,_335);
}
},this);
},this);
var _337=item[this._reverseRefMap];
if(_337){
for(var _338 in _337){
var _339=null;
if(this._itemsByIdentity){
_339=this._itemsByIdentity[_338];
}else{
_339=this._arrayOfAllItems[_338];
}
if(_339){
for(var _33a in _337[_338]){
var _33b=this.getValues(_339,_33a)||[];
var _33c=dojo.filter(_33b,function(_33d){
return !(this.isItem(_33d)&&this.getIdentity(_33d)==_333);
},this);
this._removeReferenceFromMap(item,_339,_33a);
if(_33c.length<_33b.length){
this._setValueOrValues(_339,_33a,_33c,true);
}
}
}
}
}
}
this._arrayOfAllItems[_332]=null;
item[this._storeRefPropName]=null;
if(this._itemsByIdentity){
delete this._itemsByIdentity[_333];
}
this._pending._deletedItems[_333]=item;
if(item[this._rootItemPropName]){
this._removeArrayElement(this._arrayOfTopLevelItems,item);
}
this.onDelete(item);
return true;
},setValue:function(item,_33e,_33f){
return this._setValueOrValues(item,_33e,_33f,true);
},setValues:function(item,_340,_341){
return this._setValueOrValues(item,_340,_341,true);
},unsetAttribute:function(item,_342){
return this._setValueOrValues(item,_342,[],true);
},_setValueOrValues:function(item,_343,_344,_345){
this._assert(!this._saveInProgress);
this._assertIsItem(item);
this._assert(dojo.isString(_343));
this._assert(typeof _344!=="undefined");
var _346=this._getIdentifierAttribute();
if(_343==_346){
throw new Error("ItemFileWriteStore does not have support for changing the value of an item's identifier.");
}
var _347=this._getValueOrValues(item,_343);
var _348=this.getIdentity(item);
if(!this._pending._modifiedItems[_348]){
var _349={};
for(var key in item){
if((key===this._storeRefPropName)||(key===this._itemNumPropName)||(key===this._rootItemPropName)){
_349[key]=item[key];
}else{
if(key===this._reverseRefMap){
_349[key]=dojo.clone(item[key]);
}else{
_349[key]=item[key].slice(0,item[key].length);
}
}
}
this._pending._modifiedItems[_348]=_349;
}
var _34a=false;
if(dojo.isArray(_344)&&_344.length===0){
_34a=delete item[_343];
_344=undefined;
if(this.referenceIntegrity&&_347){
var _34b=_347;
if(!dojo.isArray(_34b)){
_34b=[_34b];
}
for(var i=0;i<_34b.length;i++){
var _34c=_34b[i];
if(this.isItem(_34c)){
this._removeReferenceFromMap(_34c,item,_343);
}
}
}
}else{
var _34d;
if(dojo.isArray(_344)){
var _34e=_344;
_34d=_344.slice(0,_344.length);
}else{
_34d=[_344];
}
if(this.referenceIntegrity){
if(_347){
var _34b=_347;
if(!dojo.isArray(_34b)){
_34b=[_34b];
}
var map={};
dojo.forEach(_34b,function(_34f){
if(this.isItem(_34f)){
var id=this.getIdentity(_34f);
map[id.toString()]=true;
}
},this);
dojo.forEach(_34d,function(_350){
if(this.isItem(_350)){
var id=this.getIdentity(_350);
if(map[id.toString()]){
delete map[id.toString()];
}else{
this._addReferenceToMap(_350,item,_343);
}
}
},this);
for(var rId in map){
var _351;
if(this._itemsByIdentity){
_351=this._itemsByIdentity[rId];
}else{
_351=this._arrayOfAllItems[rId];
}
this._removeReferenceFromMap(_351,item,_343);
}
}else{
for(var i=0;i<_34d.length;i++){
var _34c=_34d[i];
if(this.isItem(_34c)){
this._addReferenceToMap(_34c,item,_343);
}
}
}
}
item[_343]=_34d;
_34a=true;
}
if(_345){
this.onSet(item,_343,_347,_344);
}
return _34a;
},_addReferenceToMap:function(_352,_353,_354){
var _355=this.getIdentity(_353);
var _356=_352[this._reverseRefMap];
if(!_356){
_356=_352[this._reverseRefMap]={};
}
var _357=_356[_355];
if(!_357){
_357=_356[_355]={};
}
_357[_354]=true;
},_removeReferenceFromMap:function(_358,_359,_35a){
var _35b=this.getIdentity(_359);
var _35c=_358[this._reverseRefMap];
var _35d;
if(_35c){
for(_35d in _35c){
if(_35d==_35b){
delete _35c[_35d][_35a];
if(this._isEmpty(_35c[_35d])){
delete _35c[_35d];
}
}
}
if(this._isEmpty(_35c)){
delete _358[this._reverseRefMap];
}
}
},_dumpReferenceMap:function(){
var i;
for(i=0;i<this._arrayOfAllItems.length;i++){
var item=this._arrayOfAllItems[i];
if(item&&item[this._reverseRefMap]){
console.log("Item: ["+this.getIdentity(item)+"] is referenced by: "+dojo.toJson(item[this._reverseRefMap]));
}
}
},_getValueOrValues:function(item,_35e){
var _35f=undefined;
if(this.hasAttribute(item,_35e)){
var _360=this.getValues(item,_35e);
if(_360.length==1){
_35f=_360[0];
}else{
_35f=_360;
}
}
return _35f;
},_flatten:function(_361){
if(this.isItem(_361)){
var item=_361;
var _362=this.getIdentity(item);
var _363={_reference:_362};
return _363;
}else{
if(typeof _361==="object"){
for(var type in this._datatypeMap){
var _364=this._datatypeMap[type];
if(dojo.isObject(_364)&&!dojo.isFunction(_364)){
if(_361 instanceof _364.type){
if(!_364.serialize){
throw new Error("ItemFileWriteStore:  No serializer defined for type mapping: ["+type+"]");
}
return {_type:type,_value:_364.serialize(_361)};
}
}else{
if(_361 instanceof _364){
return {_type:type,_value:_361.toString()};
}
}
}
}
return _361;
}
},_getNewFileContentString:function(){
var _365={};
var _366=this._getIdentifierAttribute();
if(_366!==Number){
_365.identifier=_366;
}
if(this._labelAttr){
_365.label=this._labelAttr;
}
_365.items=[];
for(var i=0;i<this._arrayOfAllItems.length;++i){
var item=this._arrayOfAllItems[i];
if(item!==null){
var _367={};
for(var key in item){
if(key!==this._storeRefPropName&&key!==this._itemNumPropName&&key!==this._reverseRefMap&&key!==this._rootItemPropName){
var _368=key;
var _369=this.getValues(item,_368);
if(_369.length==1){
_367[_368]=this._flatten(_369[0]);
}else{
var _36a=[];
for(var j=0;j<_369.length;++j){
_36a.push(this._flatten(_369[j]));
_367[_368]=_36a;
}
}
}
}
_365.items.push(_367);
}
}
var _36b=true;
return dojo.toJson(_365,_36b);
},_isEmpty:function(_36c){
var _36d=true;
if(dojo.isObject(_36c)){
var i;
for(i in _36c){
_36d=false;
break;
}
}else{
if(dojo.isArray(_36c)){
if(_36c.length>0){
_36d=false;
}
}
}
return _36d;
},save:function(_36e){
this._assert(!this._saveInProgress);
this._saveInProgress=true;
var self=this;
var _36f=function(){
self._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
self._saveInProgress=false;
if(_36e&&_36e.onComplete){
var _370=_36e.scope||dojo.global;
_36e.onComplete.call(_370);
}
};
var _371=function(err){
self._saveInProgress=false;
if(_36e&&_36e.onError){
var _372=_36e.scope||dojo.global;
_36e.onError.call(_372,err);
}
};
if(this._saveEverything){
var _373=this._getNewFileContentString();
this._saveEverything(_36f,_371,_373);
}
if(this._saveCustom){
this._saveCustom(_36f,_371);
}
if(!this._saveEverything&&!this._saveCustom){
_36f();
}
},revert:function(){
this._assert(!this._saveInProgress);
var _374;
for(_374 in this._pending._modifiedItems){
var _375=this._pending._modifiedItems[_374];
var _376=null;
if(this._itemsByIdentity){
_376=this._itemsByIdentity[_374];
}else{
_376=this._arrayOfAllItems[_374];
}
_375[this._storeRefPropName]=this;
for(key in _376){
delete _376[key];
}
dojo.mixin(_376,_375);
}
var _377;
for(_374 in this._pending._deletedItems){
_377=this._pending._deletedItems[_374];
_377[this._storeRefPropName]=this;
var _378=_377[this._itemNumPropName];
if(_377["backup_"+this._reverseRefMap]){
_377[this._reverseRefMap]=_377["backup_"+this._reverseRefMap];
delete _377["backup_"+this._reverseRefMap];
}
this._arrayOfAllItems[_378]=_377;
if(this._itemsByIdentity){
this._itemsByIdentity[_374]=_377;
}
if(_377[this._rootItemPropName]){
this._arrayOfTopLevelItems.push(_377);
}
}
for(_374 in this._pending._deletedItems){
_377=this._pending._deletedItems[_374];
if(_377["backupRefs_"+this._reverseRefMap]){
dojo.forEach(_377["backupRefs_"+this._reverseRefMap],function(_379){
var _37a;
if(this._itemsByIdentity){
_37a=this._itemsByIdentity[_379.id];
}else{
_37a=this._arrayOfAllItems[_379.id];
}
this._addReferenceToMap(_37a,_377,_379.attr);
},this);
delete _377["backupRefs_"+this._reverseRefMap];
}
}
for(_374 in this._pending._newItems){
var _37b=this._pending._newItems[_374];
_37b[this._storeRefPropName]=null;
this._arrayOfAllItems[_37b[this._itemNumPropName]]=null;
if(_37b[this._rootItemPropName]){
this._removeArrayElement(this._arrayOfTopLevelItems,_37b);
}
if(this._itemsByIdentity){
delete this._itemsByIdentity[_374];
}
}
this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
return true;
},isDirty:function(item){
if(item){
var _37c=this.getIdentity(item);
return new Boolean(this._pending._newItems[_37c]||this._pending._modifiedItems[_37c]||this._pending._deletedItems[_37c]).valueOf();
}else{
if(!this._isEmpty(this._pending._newItems)||!this._isEmpty(this._pending._modifiedItems)||!this._isEmpty(this._pending._deletedItems)){
return true;
}
return false;
}
},onSet:function(item,_37d,_37e,_37f){
},onNew:function(_380,_381){
},onDelete:function(_382){
},close:function(_383){
if(this.clearOnClose){
if(!this.isDirty()){
this.inherited(arguments);
}else{
throw new Error("dojo.data.ItemFileWriteStore: There are unsaved changes present in the store.  Please save or revert the changes before invoking close.");
}
}
}});
}
if(!dojo._hasResource["dijit.tree.TreeStoreModel"]){
dojo._hasResource["dijit.tree.TreeStoreModel"]=true;
dojo.provide("dijit.tree.TreeStoreModel");
dojo.declare("dijit.tree.TreeStoreModel",null,{store:null,childrenAttrs:["children"],newItemIdAttr:"id",labelAttr:"",root:null,query:null,deferItemLoadingUntilExpand:false,constructor:function(args){
dojo.mixin(this,args);
this.connects=[];
var _384=this.store;
if(!_384.getFeatures()["dojo.data.api.Identity"]){
throw new Error("dijit.Tree: store must support dojo.data.Identity");
}
if(_384.getFeatures()["dojo.data.api.Notification"]){
this.connects=this.connects.concat([dojo.connect(_384,"onNew",this,"onNewItem"),dojo.connect(_384,"onDelete",this,"onDeleteItem"),dojo.connect(_384,"onSet",this,"onSetItem")]);
}
},destroy:function(){
dojo.forEach(this.connects,dojo.disconnect);
},getRoot:function(_385,_386){
if(this.root){
_385(this.root);
}else{
this.store.fetch({query:this.query,onComplete:dojo.hitch(this,function(_387){
if(_387.length!=1){
throw new Error(this.declaredClass+": query "+dojo.toJson(this.query)+" returned "+_387.length+" items, but must return exactly one item");
}
this.root=_387[0];
_385(this.root);
}),onError:_386});
}
},mayHaveChildren:function(item){
return dojo.some(this.childrenAttrs,function(attr){
return this.store.hasAttribute(item,attr);
},this);
},getChildren:function(_388,_389,_38a){
var _38b=this.store;
if(!_38b.isItemLoaded(_388)){
var _38c=dojo.hitch(this,arguments.callee);
_38b.loadItem({item:_388,onItem:function(_38d){
_38c(_38d,_389,_38a);
},onError:_38a});
return;
}
var _38e=[];
for(var i=0;i<this.childrenAttrs.length;i++){
var vals=_38b.getValues(_388,this.childrenAttrs[i]);
_38e=_38e.concat(vals);
}
var _38f=0;
if(!this.deferItemLoadingUntilExpand){
dojo.forEach(_38e,function(item){
if(!_38b.isItemLoaded(item)){
_38f++;
}
});
}
if(_38f==0){
_389(_38e);
}else{
dojo.forEach(_38e,function(item,idx){
if(!_38b.isItemLoaded(item)){
_38b.loadItem({item:item,onItem:function(item){
_38e[idx]=item;
if(--_38f==0){
_389(_38e);
}
},onError:_38a});
}
});
}
},isItem:function(_390){
return this.store.isItem(_390);
},fetchItemByIdentity:function(_391){
this.store.fetchItemByIdentity(_391);
},getIdentity:function(item){
return this.store.getIdentity(item);
},getLabel:function(item){
if(this.labelAttr){
return this.store.getValue(item,this.labelAttr);
}else{
return this.store.getLabel(item);
}
},newItem:function(args,_392,_393){
var _394={parent:_392,attribute:this.childrenAttrs[0]},_395;
if(this.newItemIdAttr&&args[this.newItemIdAttr]){
this.fetchItemByIdentity({identity:args[this.newItemIdAttr],scope:this,onItem:function(item){
if(item){
this.pasteItem(item,null,_392,true,_393);
}else{
_395=this.store.newItem(args,_394);
if(_395&&(_393!=undefined)){
this.pasteItem(_395,_392,_392,false,_393);
}
}
}});
}else{
_395=this.store.newItem(args,_394);
if(_395&&(_393!=undefined)){
this.pasteItem(_395,_392,_392,false,_393);
}
}
},pasteItem:function(_396,_397,_398,_399,_39a){
var _39b=this.store,_39c=this.childrenAttrs[0];
if(_397){
dojo.forEach(this.childrenAttrs,function(attr){
if(_39b.containsValue(_397,attr,_396)){
if(!_399){
var _39d=dojo.filter(_39b.getValues(_397,attr),function(x){
return x!=_396;
});
_39b.setValues(_397,attr,_39d);
}
_39c=attr;
}
});
}
if(_398){
if(typeof _39a=="number"){
var _39e=_39b.getValues(_398,_39c).slice();
_39e.splice(_39a,0,_396);
_39b.setValues(_398,_39c,_39e);
}else{
_39b.setValues(_398,_39c,_39b.getValues(_398,_39c).concat(_396));
}
}
},onChange:function(item){
},onChildrenChange:function(_39f,_3a0){
},onDelete:function(_3a1,_3a2){
},onNewItem:function(item,_3a3){
if(!_3a3){
return;
}
this.getChildren(_3a3.item,dojo.hitch(this,function(_3a4){
this.onChildrenChange(_3a3.item,_3a4);
}));
},onDeleteItem:function(item){
this.onDelete(item);
},onSetItem:function(item,_3a5,_3a6,_3a7){
if(dojo.indexOf(this.childrenAttrs,_3a5)!=-1){
this.getChildren(item,dojo.hitch(this,function(_3a8){
this.onChildrenChange(item,_3a8);
}));
}else{
this.onChange(item);
}
}});
}
if(!dojo._hasResource["dijit.tree.ForestStoreModel"]){
dojo._hasResource["dijit.tree.ForestStoreModel"]=true;
dojo.provide("dijit.tree.ForestStoreModel");
dojo.declare("dijit.tree.ForestStoreModel",dijit.tree.TreeStoreModel,{rootId:"$root$",rootLabel:"ROOT",query:null,constructor:function(_3a9){
this.root={store:this,root:true,id:_3a9.rootId,label:_3a9.rootLabel,children:_3a9.rootChildren};
},mayHaveChildren:function(item){
return item===this.root||this.inherited(arguments);
},getChildren:function(_3aa,_3ab,_3ac){
if(_3aa===this.root){
if(this.root.children){
_3ab(this.root.children);
}else{
this.store.fetch({query:this.query,onComplete:dojo.hitch(this,function(_3ad){
this.root.children=_3ad;
_3ab(_3ad);
}),onError:_3ac});
}
}else{
this.inherited(arguments);
}
},isItem:function(_3ae){
return (_3ae===this.root)?true:this.inherited(arguments);
},fetchItemByIdentity:function(_3af){
if(_3af.identity==this.root.id){
var _3b0=_3af.scope?_3af.scope:dojo.global;
if(_3af.onItem){
_3af.onItem.call(_3b0,this.root);
}
}else{
this.inherited(arguments);
}
},getIdentity:function(item){
return (item===this.root)?this.root.id:this.inherited(arguments);
},getLabel:function(item){
return (item===this.root)?this.root.label:this.inherited(arguments);
},newItem:function(args,_3b1,_3b2){
if(_3b1===this.root){
this.onNewRootItem(args);
return this.store.newItem(args);
}else{
return this.inherited(arguments);
}
},onNewRootItem:function(args){
},pasteItem:function(_3b3,_3b4,_3b5,_3b6,_3b7){
if(_3b4===this.root){
if(!_3b6){
this.onLeaveRoot(_3b3);
}
}
dijit.tree.TreeStoreModel.prototype.pasteItem.call(this,_3b3,_3b4===this.root?null:_3b4,_3b5===this.root?null:_3b5,_3b6,_3b7);
if(_3b5===this.root){
this.onAddToRoot(_3b3);
}
},onAddToRoot:function(item){
console.log(this,": item ",item," added to root");
},onLeaveRoot:function(item){
console.log(this,": item ",item," removed from root");
},_requeryTop:function(){
var _3b8=this.root.children||[];
this.store.fetch({query:this.query,onComplete:dojo.hitch(this,function(_3b9){
this.root.children=_3b9;
if(_3b8.length!=_3b9.length||dojo.some(_3b8,function(item,idx){
return _3b9[idx]!=item;
})){
this.onChildrenChange(this.root,_3b9);
}
})});
},onNewItem:function(item,_3ba){
this._requeryTop();
this.inherited(arguments);
},onDeleteItem:function(item){
if(dojo.indexOf(this.root.children,item)!=-1){
this._requeryTop();
}
this.inherited(arguments);
},onSetItem:function(item,_3bb,_3bc,_3bd){
this._requeryTop();
this.inherited(arguments);
}});
}
if(!dojo._hasResource["dijit.tree._dndContainer"]){
dojo._hasResource["dijit.tree._dndContainer"]=true;
dojo.provide("dijit.tree._dndContainer");
dojo.getObject("tree",true,dojo);
dijit.tree._compareNodes=function(n1,n2){
if(n1===n2){
return 0;
}
if("sourceIndex" in document.documentElement){
return n1.sourceIndex-n2.sourceIndex;
}else{
if("compareDocumentPosition" in document.documentElement){
return n1.compareDocumentPosition(n2)&2?1:-1;
}else{
if(document.createRange){
var r1=doc.createRange();
r1.setStartBefore(n1);
var r2=doc.createRange();
r2.setStartBefore(n2);
return r1.compareBoundaryPoints(r1.END_TO_END,r2);
}else{
throw Error("dijit.tree._compareNodes don't know how to compare two different nodes in this browser");
}
}
}
};
dojo.declare("dijit.tree._dndContainer",null,{constructor:function(tree,_3be){
this.tree=tree;
this.node=tree.domNode;
dojo.mixin(this,_3be);
this.map={};
this.current=null;
this.containerState="";
dojo.addClass(this.node,"dojoDndContainer");
this.events=[dojo.connect(this.node,"onmouseenter",this,"onOverEvent"),dojo.connect(this.node,"onmouseleave",this,"onOutEvent"),dojo.connect(this.tree,"_onNodeMouseEnter",this,"onMouseOver"),dojo.connect(this.tree,"_onNodeMouseLeave",this,"onMouseOut"),dojo.connect(this.node,"ondragstart",dojo,"stopEvent"),dojo.connect(this.node,"onselectstart",dojo,"stopEvent")];
},getItem:function(key){
var _3bf=this.selection[key],ret={data:_3bf,type:["treeNode"]};
return ret;
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
this.node=this.parent=null;
},onMouseOver:function(_3c0,evt){
this.current=_3c0;
},onMouseOut:function(_3c1,evt){
this.current=null;
},_changeState:function(type,_3c2){
var _3c3="dojoDnd"+type;
var _3c4=type.toLowerCase()+"State";
dojo.replaceClass(this.node,_3c3+_3c2,_3c3+this[_3c4]);
this[_3c4]=_3c2;
},_addItemClass:function(node,type){
dojo.addClass(node,"dojoDndItem"+type);
},_removeItemClass:function(node,type){
dojo.removeClass(node,"dojoDndItem"+type);
},onOverEvent:function(){
this._changeState("Container","Over");
},onOutEvent:function(){
this._changeState("Container","");
}});
}
if(!dojo._hasResource["dijit.tree._dndSelector"]){
dojo._hasResource["dijit.tree._dndSelector"]=true;
dojo.provide("dijit.tree._dndSelector");
dojo.declare("dijit.tree._dndSelector",dijit.tree._dndContainer,{constructor:function(tree,_3c5){
this.selection={};
this.anchor=null;
dijit.setWaiState(this.tree.domNode,"multiselect",!this.singular);
this.events.push(dojo.connect(this.tree.domNode,"onmousedown",this,"onMouseDown"),dojo.connect(this.tree.domNode,"onmouseup",this,"onMouseUp"),dojo.connect(this.tree.domNode,"onmousemove",this,"onMouseMove"));
},singular:false,getSelectedTreeNodes:function(){
var _3c6=[],sel=this.selection;
for(var i in sel){
_3c6.push(sel[i]);
}
return _3c6;
},selectNone:function(){
this.setSelection([]);
return this;
},destroy:function(){
this.inherited(arguments);
this.selection=this.anchor=null;
},addTreeNode:function(node,_3c7){
this.setSelection(this.getSelectedTreeNodes().concat([node]));
if(_3c7){
this.anchor=node;
}
return node;
},removeTreeNode:function(node){
this.setSelection(this._setDifference(this.getSelectedTreeNodes(),[node]));
return node;
},isTreeNodeSelected:function(node){
return node.id&&!!this.selection[node.id];
},setSelection:function(_3c8){
var _3c9=this.getSelectedTreeNodes();
dojo.forEach(this._setDifference(_3c9,_3c8),dojo.hitch(this,function(node){
node.setSelected(false);
if(this.anchor==node){
delete this.anchor;
}
delete this.selection[node.id];
}));
dojo.forEach(this._setDifference(_3c8,_3c9),dojo.hitch(this,function(node){
node.setSelected(true);
this.selection[node.id]=node;
}));
this._updateSelectionProperties();
},_setDifference:function(xs,ys){
dojo.forEach(ys,function(y){
y.__exclude__=true;
});
var ret=dojo.filter(xs,function(x){
return !x.__exclude__;
});
dojo.forEach(ys,function(y){
delete y["__exclude__"];
});
return ret;
},_updateSelectionProperties:function(){
var _3ca=this.getSelectedTreeNodes();
var _3cb=[],_3cc=[];
dojo.forEach(_3ca,function(node){
_3cc.push(node);
_3cb.push(node.getTreePath());
});
var _3cd=dojo.map(_3cc,function(node){
return node.item;
});
this.tree._set("paths",_3cb);
this.tree._set("path",_3cb[0]||[]);
this.tree._set("selectedNodes",_3cc);
this.tree._set("selectedNode",_3cc[0]||null);
this.tree._set("selectedItems",_3cd);
this.tree._set("selectedItem",_3cd[0]||null);
},onMouseDown:function(e){
if(!this.current||this.tree.isExpandoNode(e.target,this.current)){
return;
}
if(e.button==dojo.mouseButtons.RIGHT){
return;
}
dojo.stopEvent(e);
var _3ce=this.current,copy=dojo.isCopyKey(e),id=_3ce.id;
if(!this.singular&&!e.shiftKey&&this.selection[id]){
this._doDeselect=true;
return;
}else{
this._doDeselect=false;
}
this.userSelect(_3ce,copy,e.shiftKey);
},onMouseUp:function(e){
if(!this._doDeselect){
return;
}
this._doDeselect=false;
this.userSelect(this.current,dojo.isCopyKey(e),e.shiftKey);
},onMouseMove:function(e){
this._doDeselect=false;
},userSelect:function(node,_3cf,_3d0){
if(this.singular){
if(this.anchor==node&&_3cf){
this.selectNone();
}else{
this.setSelection([node]);
this.anchor=node;
}
}else{
if(_3d0&&this.anchor){
var cr=dijit.tree._compareNodes(this.anchor.rowNode,node.rowNode),_3d1,end,_3d2=this.anchor;
if(cr<0){
_3d1=_3d2;
end=node;
}else{
_3d1=node;
end=_3d2;
}
nodes=[];
while(_3d1!=end){
nodes.push(_3d1);
_3d1=this.tree._getNextNode(_3d1);
}
nodes.push(end);
this.setSelection(nodes);
}else{
if(this.selection[node.id]&&_3cf){
this.removeTreeNode(node);
}else{
if(_3cf){
this.addTreeNode(node,true);
}else{
this.setSelection([node]);
this.anchor=node;
}
}
}
}
},forInSelectedItems:function(f,o){
o=o||dojo.global;
for(var id in this.selection){
f.call(o,this.getItem(id),id,this);
}
}});
}
if(!dojo._hasResource["dijit.tree.dndSource"]){
dojo._hasResource["dijit.tree.dndSource"]=true;
dojo.provide("dijit.tree.dndSource");
dojo.declare("dijit.tree.dndSource",dijit.tree._dndSelector,{isSource:true,accept:["text","treeNode"],copyOnly:false,dragThreshold:5,betweenThreshold:0,constructor:function(tree,_3d3){
if(!_3d3){
_3d3={};
}
dojo.mixin(this,_3d3);
this.isSource=typeof _3d3.isSource=="undefined"?true:_3d3.isSource;
var type=_3d3.accept instanceof Array?_3d3.accept:["text","treeNode"];
this.accept=null;
if(type.length){
this.accept={};
for(var i=0;i<type.length;++i){
this.accept[type[i]]=1;
}
}
this.isDragging=false;
this.mouseDown=false;
this.targetAnchor=null;
this.targetBox=null;
this.dropPosition="";
this._lastX=0;
this._lastY=0;
this.sourceState="";
if(this.isSource){
dojo.addClass(this.node,"dojoDndSource");
}
this.targetState="";
if(this.accept){
dojo.addClass(this.node,"dojoDndTarget");
}
this.topics=[dojo.subscribe("/dnd/source/over",this,"onDndSourceOver"),dojo.subscribe("/dnd/start",this,"onDndStart"),dojo.subscribe("/dnd/drop",this,"onDndDrop"),dojo.subscribe("/dnd/cancel",this,"onDndCancel")];
},checkAcceptance:function(_3d4,_3d5){
return true;
},copyState:function(_3d6){
return this.copyOnly||_3d6;
},destroy:function(){
this.inherited("destroy",arguments);
dojo.forEach(this.topics,dojo.unsubscribe);
this.targetAnchor=null;
},_onDragMouse:function(e){
var m=dojo.dnd.manager(),_3d7=this.targetAnchor,_3d8=this.current,_3d9=this.dropPosition;
var _3da="Over";
if(_3d8&&this.betweenThreshold>0){
if(!this.targetBox||_3d7!=_3d8){
this.targetBox=dojo.position(_3d8.rowNode,true);
}
if((e.pageY-this.targetBox.y)<=this.betweenThreshold){
_3da="Before";
}else{
if((e.pageY-this.targetBox.y)>=(this.targetBox.h-this.betweenThreshold)){
_3da="After";
}
}
}
if(_3d8!=_3d7||_3da!=_3d9){
if(_3d7){
this._removeItemClass(_3d7.rowNode,_3d9);
}
if(_3d8){
this._addItemClass(_3d8.rowNode,_3da);
}
if(!_3d8){
m.canDrop(false);
}else{
if(_3d8==this.tree.rootNode&&_3da!="Over"){
m.canDrop(false);
}else{
if(m.source==this&&(_3d8.id in this.selection)){
m.canDrop(false);
}else{
if(this.checkItemAcceptance(_3d8.rowNode,m.source,_3da.toLowerCase())&&!this._isParentChildDrop(m.source,_3d8.rowNode)){
m.canDrop(true);
}else{
m.canDrop(false);
}
}
}
}
this.targetAnchor=_3d8;
this.dropPosition=_3da;
}
},onMouseMove:function(e){
if(this.isDragging&&this.targetState=="Disabled"){
return;
}
this.inherited(arguments);
var m=dojo.dnd.manager();
if(this.isDragging){
this._onDragMouse(e);
}else{
if(this.mouseDown&&this.isSource&&(Math.abs(e.pageX-this._lastX)>=this.dragThreshold||Math.abs(e.pageY-this._lastY)>=this.dragThreshold)){
var _3db=this.getSelectedTreeNodes();
if(_3db.length){
if(_3db.length>1){
var seen=this.selection,i=0,r=[],n,p;
nextitem:
while((n=_3db[i++])){
for(p=n.getParent();p&&p!==this.tree;p=p.getParent()){
if(seen[p.id]){
continue nextitem;
}
}
r.push(n);
}
_3db=r;
}
_3db=dojo.map(_3db,function(n){
return n.domNode;
});
m.startDrag(this,_3db,this.copyState(dojo.isCopyKey(e)));
}
}
}
},onMouseDown:function(e){
this.mouseDown=true;
this.mouseButton=e.button;
this._lastX=e.pageX;
this._lastY=e.pageY;
this.inherited(arguments);
},onMouseUp:function(e){
if(this.mouseDown){
this.mouseDown=false;
this.inherited(arguments);
}
},onMouseOut:function(){
this.inherited(arguments);
this._unmarkTargetAnchor();
},checkItemAcceptance:function(_3dc,_3dd,_3de){
return true;
},onDndSourceOver:function(_3df){
if(this!=_3df){
this.mouseDown=false;
this._unmarkTargetAnchor();
}else{
if(this.isDragging){
var m=dojo.dnd.manager();
m.canDrop(false);
}
}
},onDndStart:function(_3e0,_3e1,copy){
if(this.isSource){
this._changeState("Source",this==_3e0?(copy?"Copied":"Moved"):"");
}
var _3e2=this.checkAcceptance(_3e0,_3e1);
this._changeState("Target",_3e2?"":"Disabled");
if(this==_3e0){
dojo.dnd.manager().overSource(this);
}
this.isDragging=true;
},itemCreator:function(_3e3,_3e4,_3e5){
return dojo.map(_3e3,function(node){
return {"id":node.id,"name":node.textContent||node.innerText||""};
});
},onDndDrop:function(_3e6,_3e7,copy){
if(this.containerState=="Over"){
var tree=this.tree,_3e8=tree.model,_3e9=this.targetAnchor,_3ea=false;
this.isDragging=false;
var _3eb=_3e9;
var _3ec;
var _3ed;
_3ec=(_3eb&&_3eb.item)||tree.item;
if(this.dropPosition=="Before"||this.dropPosition=="After"){
_3ec=(_3eb.getParent()&&_3eb.getParent().item)||tree.item;
_3ed=_3eb.getIndexInParent();
if(this.dropPosition=="After"){
_3ed=_3eb.getIndexInParent()+1;
}
}else{
_3ec=(_3eb&&_3eb.item)||tree.item;
}
var _3ee;
dojo.forEach(_3e7,function(node,idx){
var _3ef=_3e6.getItem(node.id);
if(dojo.indexOf(_3ef.type,"treeNode")!=-1){
var _3f0=_3ef.data,_3f1=_3f0.item,_3f2=_3f0.getParent().item;
}
if(_3e6==this){
if(typeof _3ed=="number"){
if(_3ec==_3f2&&_3f0.getIndexInParent()<_3ed){
_3ed-=1;
}
}
_3e8.pasteItem(_3f1,_3f2,_3ec,copy,_3ed);
}else{
if(_3e8.isItem(_3f1)){
_3e8.pasteItem(_3f1,_3f2,_3ec,copy,_3ed);
}else{
if(!_3ee){
_3ee=this.itemCreator(_3e7,_3e9.rowNode,_3e6);
}
_3e8.newItem(_3ee[idx],_3ec,_3ed);
}
}
},this);
this.tree._expandNode(_3eb);
}
this.onDndCancel();
},onDndCancel:function(){
this._unmarkTargetAnchor();
this.isDragging=false;
this.mouseDown=false;
delete this.mouseButton;
this._changeState("Source","");
this._changeState("Target","");
},onOverEvent:function(){
this.inherited(arguments);
dojo.dnd.manager().overSource(this);
},onOutEvent:function(){
this._unmarkTargetAnchor();
var m=dojo.dnd.manager();
if(this.isDragging){
m.canDrop(false);
}
m.outSource(this);
this.inherited(arguments);
},_isParentChildDrop:function(_3f3,_3f4){
if(!_3f3.tree||_3f3.tree!=this.tree){
return false;
}
var root=_3f3.tree.domNode;
var ids=_3f3.selection;
var node=_3f4.parentNode;
while(node!=root&&!ids[node.id]){
node=node.parentNode;
}
return node.id&&ids[node.id];
},_unmarkTargetAnchor:function(){
if(!this.targetAnchor){
return;
}
this._removeItemClass(this.targetAnchor.rowNode,this.dropPosition);
this.targetAnchor=null;
this.targetBox=null;
this.dropPosition=null;
},_markDndStatus:function(copy){
this._changeState("Source",copy?"Copied":"Moved");
}});
}
if(!dojo._hasResource["dojo.fx.Toggler"]){
dojo._hasResource["dojo.fx.Toggler"]=true;
dojo.provide("dojo.fx.Toggler");
dojo.declare("dojo.fx.Toggler",null,{node:null,showFunc:dojo.fadeIn,hideFunc:dojo.fadeOut,showDuration:200,hideDuration:200,constructor:function(args){
var _3f5=this;
dojo.mixin(_3f5,args);
_3f5.node=args.node;
_3f5._showArgs=dojo.mixin({},args);
_3f5._showArgs.node=_3f5.node;
_3f5._showArgs.duration=_3f5.showDuration;
_3f5.showAnim=_3f5.showFunc(_3f5._showArgs);
_3f5._hideArgs=dojo.mixin({},args);
_3f5._hideArgs.node=_3f5.node;
_3f5._hideArgs.duration=_3f5.hideDuration;
_3f5.hideAnim=_3f5.hideFunc(_3f5._hideArgs);
dojo.connect(_3f5.showAnim,"beforeBegin",dojo.hitch(_3f5.hideAnim,"stop",true));
dojo.connect(_3f5.hideAnim,"beforeBegin",dojo.hitch(_3f5.showAnim,"stop",true));
},show:function(_3f6){
return this.showAnim.play(_3f6||0);
},hide:function(_3f7){
return this.hideAnim.play(_3f7||0);
}});
}
if(!dojo._hasResource["dojo.fx"]){
dojo._hasResource["dojo.fx"]=true;
dojo.provide("dojo.fx");
(function(){
var d=dojo,_3f8={_fire:function(evt,args){
if(this[evt]){
this[evt].apply(this,args||[]);
}
return this;
}};
var _3f9=function(_3fa){
this._index=-1;
this._animations=_3fa||[];
this._current=this._onAnimateCtx=this._onEndCtx=null;
this.duration=0;
d.forEach(this._animations,function(a){
this.duration+=a.duration;
if(a.delay){
this.duration+=a.delay;
}
},this);
};
d.extend(_3f9,{_onAnimate:function(){
this._fire("onAnimate",arguments);
},_onEnd:function(){
d.disconnect(this._onAnimateCtx);
d.disconnect(this._onEndCtx);
this._onAnimateCtx=this._onEndCtx=null;
if(this._index+1==this._animations.length){
this._fire("onEnd");
}else{
this._current=this._animations[++this._index];
this._onAnimateCtx=d.connect(this._current,"onAnimate",this,"_onAnimate");
this._onEndCtx=d.connect(this._current,"onEnd",this,"_onEnd");
this._current.play(0,true);
}
},play:function(_3fb,_3fc){
if(!this._current){
this._current=this._animations[this._index=0];
}
if(!_3fc&&this._current.status()=="playing"){
return this;
}
var _3fd=d.connect(this._current,"beforeBegin",this,function(){
this._fire("beforeBegin");
}),_3fe=d.connect(this._current,"onBegin",this,function(arg){
this._fire("onBegin",arguments);
}),_3ff=d.connect(this._current,"onPlay",this,function(arg){
this._fire("onPlay",arguments);
d.disconnect(_3fd);
d.disconnect(_3fe);
d.disconnect(_3ff);
});
if(this._onAnimateCtx){
d.disconnect(this._onAnimateCtx);
}
this._onAnimateCtx=d.connect(this._current,"onAnimate",this,"_onAnimate");
if(this._onEndCtx){
d.disconnect(this._onEndCtx);
}
this._onEndCtx=d.connect(this._current,"onEnd",this,"_onEnd");
this._current.play.apply(this._current,arguments);
return this;
},pause:function(){
if(this._current){
var e=d.connect(this._current,"onPause",this,function(arg){
this._fire("onPause",arguments);
d.disconnect(e);
});
this._current.pause();
}
return this;
},gotoPercent:function(_400,_401){
this.pause();
var _402=this.duration*_400;
this._current=null;
d.some(this._animations,function(a){
if(a.duration<=_402){
this._current=a;
return true;
}
_402-=a.duration;
return false;
});
if(this._current){
this._current.gotoPercent(_402/this._current.duration,_401);
}
return this;
},stop:function(_403){
if(this._current){
if(_403){
for(;this._index+1<this._animations.length;++this._index){
this._animations[this._index].stop(true);
}
this._current=this._animations[this._index];
}
var e=d.connect(this._current,"onStop",this,function(arg){
this._fire("onStop",arguments);
d.disconnect(e);
});
this._current.stop();
}
return this;
},status:function(){
return this._current?this._current.status():"stopped";
},destroy:function(){
if(this._onAnimateCtx){
d.disconnect(this._onAnimateCtx);
}
if(this._onEndCtx){
d.disconnect(this._onEndCtx);
}
}});
d.extend(_3f9,_3f8);
dojo.fx.chain=function(_404){
return new _3f9(_404);
};
var _405=function(_406){
this._animations=_406||[];
this._connects=[];
this._finished=0;
this.duration=0;
d.forEach(_406,function(a){
var _407=a.duration;
if(a.delay){
_407+=a.delay;
}
if(this.duration<_407){
this.duration=_407;
}
this._connects.push(d.connect(a,"onEnd",this,"_onEnd"));
},this);
this._pseudoAnimation=new d.Animation({curve:[0,1],duration:this.duration});
var self=this;
d.forEach(["beforeBegin","onBegin","onPlay","onAnimate","onPause","onStop","onEnd"],function(evt){
self._connects.push(d.connect(self._pseudoAnimation,evt,function(){
self._fire(evt,arguments);
}));
});
};
d.extend(_405,{_doAction:function(_408,args){
d.forEach(this._animations,function(a){
a[_408].apply(a,args);
});
return this;
},_onEnd:function(){
if(++this._finished>this._animations.length){
this._fire("onEnd");
}
},_call:function(_409,args){
var t=this._pseudoAnimation;
t[_409].apply(t,args);
},play:function(_40a,_40b){
this._finished=0;
this._doAction("play",arguments);
this._call("play",arguments);
return this;
},pause:function(){
this._doAction("pause",arguments);
this._call("pause",arguments);
return this;
},gotoPercent:function(_40c,_40d){
var ms=this.duration*_40c;
d.forEach(this._animations,function(a){
a.gotoPercent(a.duration<ms?1:(ms/a.duration),_40d);
});
this._call("gotoPercent",arguments);
return this;
},stop:function(_40e){
this._doAction("stop",arguments);
this._call("stop",arguments);
return this;
},status:function(){
return this._pseudoAnimation.status();
},destroy:function(){
d.forEach(this._connects,dojo.disconnect);
}});
d.extend(_405,_3f8);
dojo.fx.combine=function(_40f){
return new _405(_40f);
};
dojo.fx.wipeIn=function(args){
var node=args.node=d.byId(args.node),s=node.style,o;
var anim=d.animateProperty(d.mixin({properties:{height:{start:function(){
o=s.overflow;
s.overflow="hidden";
if(s.visibility=="hidden"||s.display=="none"){
s.height="1px";
s.display="";
s.visibility="";
return 1;
}else{
var _410=d.style(node,"height");
return Math.max(_410,1);
}
},end:function(){
return node.scrollHeight;
}}}},args));
d.connect(anim,"onEnd",function(){
s.height="auto";
s.overflow=o;
});
return anim;
};
dojo.fx.wipeOut=function(args){
var node=args.node=d.byId(args.node),s=node.style,o;
var anim=d.animateProperty(d.mixin({properties:{height:{end:1}}},args));
d.connect(anim,"beforeBegin",function(){
o=s.overflow;
s.overflow="hidden";
s.display="";
});
d.connect(anim,"onEnd",function(){
s.overflow=o;
s.height="auto";
s.display="none";
});
return anim;
};
dojo.fx.slideTo=function(args){
var node=args.node=d.byId(args.node),top=null,left=null;
var init=(function(n){
return function(){
var cs=d.getComputedStyle(n);
var pos=cs.position;
top=(pos=="absolute"?n.offsetTop:parseInt(cs.top)||0);
left=(pos=="absolute"?n.offsetLeft:parseInt(cs.left)||0);
if(pos!="absolute"&&pos!="relative"){
var ret=d.position(n,true);
top=ret.y;
left=ret.x;
n.style.position="absolute";
n.style.top=top+"px";
n.style.left=left+"px";
}
};
})(node);
init();
var anim=d.animateProperty(d.mixin({properties:{top:args.top||0,left:args.left||0}},args));
d.connect(anim,"beforeBegin",anim,init);
return anim;
};
})();
}
if(!dojo._hasResource["dojo.DeferredList"]){
dojo._hasResource["dojo.DeferredList"]=true;
dojo.provide("dojo.DeferredList");
dojo.DeferredList=function(list,_411,_412,_413,_414){
var _415=[];
dojo.Deferred.call(this);
var self=this;
if(list.length===0&&!_411){
this.resolve([0,[]]);
}
var _416=0;
dojo.forEach(list,function(item,i){
item.then(function(_417){
if(_411){
self.resolve([i,_417]);
}else{
_418(true,_417);
}
},function(_419){
if(_412){
self.reject(_419);
}else{
_418(false,_419);
}
if(_413){
return null;
}
throw _419;
});
function _418(_41a,_41b){
_415[i]=[_41a,_41b];
_416++;
if(_416===list.length){
self.resolve(_415);
}
};
});
};
dojo.DeferredList.prototype=new dojo.Deferred();
dojo.DeferredList.prototype.gatherResults=function(_41c){
var d=new dojo.DeferredList(_41c,false,true,false);
d.addCallback(function(_41d){
var ret=[];
dojo.forEach(_41d,function(_41e){
ret.push(_41e[1]);
});
return ret;
});
return d;
};
}
if(!dojo._hasResource["dijit._CssStateMixin"]){
dojo._hasResource["dijit._CssStateMixin"]=true;
dojo.provide("dijit._CssStateMixin");
dojo.declare("dijit._CssStateMixin",[],{cssStateNodes:{},hovering:false,active:false,_applyAttributes:function(){
this.inherited(arguments);
dojo.forEach(["onmouseenter","onmouseleave","onmousedown"],function(e){
this.connect(this.domNode,e,"_cssMouseEvent");
},this);
dojo.forEach(["disabled","readOnly","checked","selected","focused","state","hovering","active"],function(attr){
this.watch(attr,dojo.hitch(this,"_setStateClass"));
},this);
for(var ap in this.cssStateNodes){
this._trackMouseState(this[ap],this.cssStateNodes[ap]);
}
this._setStateClass();
},_cssMouseEvent:function(_41f){
if(!this.disabled){
switch(_41f.type){
case "mouseenter":
case "mouseover":
this._set("hovering",true);
this._set("active",this._mouseDown);
break;
case "mouseleave":
case "mouseout":
this._set("hovering",false);
this._set("active",false);
break;
case "mousedown":
this._set("active",true);
this._mouseDown=true;
var _420=this.connect(dojo.body(),"onmouseup",function(){
this._mouseDown=false;
this._set("active",false);
this.disconnect(_420);
});
break;
}
}
},_setStateClass:function(){
var _421=this.baseClass.split(" ");
function _422(_423){
_421=_421.concat(dojo.map(_421,function(c){
return c+_423;
}),"dijit"+_423);
};
if(!this.isLeftToRight()){
_422("Rtl");
}
if(this.checked){
_422("Checked");
}
if(this.state){
_422(this.state);
}
if(this.selected){
_422("Selected");
}
if(this.disabled){
_422("Disabled");
}else{
if(this.readOnly){
_422("ReadOnly");
}else{
if(this.active){
_422("Active");
}else{
if(this.hovering){
_422("Hover");
}
}
}
}
if(this._focused){
_422("Focused");
}
var tn=this.stateNode||this.domNode,_424={};
dojo.forEach(tn.className.split(" "),function(c){
_424[c]=true;
});
if("_stateClasses" in this){
dojo.forEach(this._stateClasses,function(c){
delete _424[c];
});
}
dojo.forEach(_421,function(c){
_424[c]=true;
});
var _425=[];
for(var c in _424){
_425.push(c);
}
tn.className=_425.join(" ");
this._stateClasses=_421;
},_trackMouseState:function(node,_426){
var _427=false,_428=false,_429=false;
var self=this,cn=dojo.hitch(this,"connect",node);
function _42a(){
var _42b=("disabled" in self&&self.disabled)||("readonly" in self&&self.readonly);
dojo.toggleClass(node,_426+"Hover",_427&&!_428&&!_42b);
dojo.toggleClass(node,_426+"Active",_428&&!_42b);
dojo.toggleClass(node,_426+"Focused",_429&&!_42b);
};
cn("onmouseenter",function(){
_427=true;
_42a();
});
cn("onmouseleave",function(){
_427=false;
_428=false;
_42a();
});
cn("onmousedown",function(){
_428=true;
_42a();
});
cn("onmouseup",function(){
_428=false;
_42a();
});
cn("onfocus",function(){
_429=true;
_42a();
});
cn("onblur",function(){
_429=false;
_42a();
});
this.watch("disabled",_42a);
this.watch("readOnly",_42a);
}});
}
if(!dojo._hasResource["dijit.Tree"]){
dojo._hasResource["dijit.Tree"]=true;
dojo.provide("dijit.Tree");
dojo.declare("dijit._TreeNode",[dijit._Widget,dijit._Templated,dijit._Container,dijit._Contained,dijit._CssStateMixin],{item:null,isTreeNode:true,label:"",isExpandable:null,isExpanded:false,state:"UNCHECKED",templateString:dojo.cache("dijit","templates/TreeNode.html","<div class=\"dijitTreeNode\" role=\"presentation\"\n\t><div dojoAttachPoint=\"rowNode\" class=\"dijitTreeRow\" role=\"presentation\" dojoAttachEvent=\"onmouseenter:_onMouseEnter, onmouseleave:_onMouseLeave, onclick:_onClick, ondblclick:_onDblClick\"\n\t\t><img src=\"${_blankGif}\" alt=\"\" dojoAttachPoint=\"expandoNode\" class=\"dijitTreeExpando\" role=\"presentation\"\n\t\t/><span dojoAttachPoint=\"expandoNodeText\" class=\"dijitExpandoText\" role=\"presentation\"\n\t\t></span\n\t\t><span dojoAttachPoint=\"contentNode\"\n\t\t\tclass=\"dijitTreeContent\" role=\"presentation\">\n\t\t\t<span dojoAttachPoint=\"labelNode\" class=\"dijitTreeLabel\" role=\"treeitem\" tabindex=\"-1\" aria-selected=\"false\" dojoAttachEvent=\"onfocus:_onLabelFocus\"></span>\n\t\t</span\n\t></div>\n\t<div dojoAttachPoint=\"containerNode\" class=\"dijitTreeContainer\" role=\"presentation\" style=\"display: none;\"></div>\n</div>\n"),baseClass:"dijitTreeNode",cssStateNodes:{rowNode:"dijitTreeRow",labelNode:"dijitTreeLabel"},attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{label:{node:"labelNode",type:"innerText"},tooltip:{node:"rowNode",type:"attribute",attribute:"title"}}),buildRendering:function(){
this.inherited(arguments);
this._setExpando();
this._updateItemClasses(this.item);
if(this.isExpandable){
dijit.setWaiState(this.labelNode,"expanded",this.isExpanded);
}
this.setSelected(false);
},_setIndentAttr:function(_42c){
var _42d=(Math.max(_42c,0)*this.tree._nodePixelIndent)+"px";
dojo.style(this.domNode,"backgroundPosition",_42d+" 0px");
dojo.style(this.rowNode,this.isLeftToRight()?"paddingLeft":"paddingRight",_42d);
dojo.forEach(this.getChildren(),function(_42e){
_42e.set("indent",_42c+1);
});
this._set("indent",_42c);
},markProcessing:function(){
this.state="LOADING";
this._setExpando(true);
},unmarkProcessing:function(){
this._setExpando(false);
},_updateItemClasses:function(item){
var tree=this.tree,_42f=tree.model;
if(tree._v10Compat&&item===_42f.root){
item=null;
}
//this._applyClassAndStyle(item,"icon","Icon");
this._applyClassAndStyle(item,"label","Label");
this._applyClassAndStyle(item,"row","Row");
},_applyClassAndStyle:function(item,_430,_431){
var _432="_"+_430+"Class";
var _433=_430+"Node";
var _434=this[_432];
this[_432]=this.tree["get"+_431+"Class"](item,this.isExpanded);
dojo.replaceClass(this[_433],this[_432]||"",_434||"");
dojo.style(this[_433],this.tree["get"+_431+"Style"](item,this.isExpanded)||{});
},_updateLayout:function(){
var _435=this.getParent();
if(!_435||_435.rowNode.style.display=="none"){
dojo.addClass(this.domNode,"dijitTreeIsRoot");
}else{
dojo.toggleClass(this.domNode,"dijitTreeIsLast",!this.getNextSibling());
}
},_setExpando:function(_436){
var _437=["dijitTreeExpandoLoading","dijitTreeExpandoOpened","dijitTreeExpandoClosed","dijitTreeExpandoLeaf"],_438=["*","-","+","*"],idx=_436?0:(this.isExpandable?(this.isExpanded?1:2):3);
dojo.replaceClass(this.expandoNode,_437[idx],_437);
this.expandoNodeText.innerHTML=_438[idx];
},expand:function(){
if(this._expandDeferred){
return this._expandDeferred;
}
this._wipeOut&&this._wipeOut.stop();
this.isExpanded=true;
dijit.setWaiState(this.labelNode,"expanded","true");
if(this.tree.showRoot||this!==this.tree.rootNode){
dijit.setWaiRole(this.containerNode,"group");
}
dojo.addClass(this.contentNode,"dijitTreeContentExpanded");
this._setExpando();
this._updateItemClasses(this.item);
if(this==this.tree.rootNode){
dijit.setWaiState(this.tree.domNode,"expanded","true");
}
var def,_439=dojo.fx.wipeIn({node:this.containerNode,duration:dijit.defaultDuration,onEnd:function(){
def.callback(true);
}});
def=(this._expandDeferred=new dojo.Deferred(function(){
_439.stop();
}));
_439.play();
return def;
},collapse:function(){
if(!this.isExpanded){
return;
}
if(this._expandDeferred){
this._expandDeferred.cancel();
delete this._expandDeferred;
}
this.isExpanded=false;
dijit.setWaiState(this.labelNode,"expanded","false");
if(this==this.tree.rootNode){
dijit.setWaiState(this.tree.domNode,"expanded","false");
}
dojo.removeClass(this.contentNode,"dijitTreeContentExpanded");
this._setExpando();
this._updateItemClasses(this.item);
if(!this._wipeOut){
this._wipeOut=dojo.fx.wipeOut({node:this.containerNode,duration:dijit.defaultDuration});
}
this._wipeOut.play();
},indent:0,setChildItems:function(_43a){
var tree=this.tree,_43b=tree.model,defs=[];
dojo.forEach(this.getChildren(),function(_43c){
dijit._Container.prototype.removeChild.call(this,_43c);
},this);
this.state="LOADED";
if(_43a&&_43a.length>0){
this.isExpandable=true;
dojo.forEach(_43a,function(item){
var id=_43b.getIdentity(item),_43d=tree._itemNodesMap[id],node;
if(_43d){
for(var i=0;i<_43d.length;i++){
if(_43d[i]&&!_43d[i].getParent()){
node=_43d[i];
node.set("indent",this.indent+1);
break;
}
}
}
if(!node){
node=this.tree._createTreeNode({item:item,tree:tree,isExpandable:_43b.mayHaveChildren(item),label:tree.getLabel(item),tooltip:tree.getTooltip(item),dir:tree.dir,lang:tree.lang,indent:this.indent+1});
if(_43d){
_43d.push(node);
}else{
tree._itemNodesMap[id]=[node];
}
}
this.addChild(node);
if(this.tree.autoExpand||this.tree._state(item)){
defs.push(tree._expandNode(node));
}
},this);
dojo.forEach(this.getChildren(),function(_43e,idx){
_43e._updateLayout();
});
}else{
this.isExpandable=false;
}
if(this._setExpando){
this._setExpando(false);
}
this._updateItemClasses(this.item);
if(this==tree.rootNode){
var fc=this.tree.showRoot?this:this.getChildren()[0];
if(fc){
fc.setFocusable(true);
tree.lastFocused=fc;
}else{
tree.domNode.setAttribute("tabIndex","0");
}
}
return new dojo.DeferredList(defs);
},getTreePath:function(){
var node=this;
var path=[];
while(node&&node!==this.tree.rootNode){
path.unshift(node.item);
node=node.getParent();
}
path.unshift(this.tree.rootNode.item);
return path;
},getIdentity:function(){
return this.tree.model.getIdentity(this.item);
},removeChild:function(node){
this.inherited(arguments);
var _43f=this.getChildren();
if(_43f.length==0){
this.isExpandable=false;
this.collapse();
}
dojo.forEach(_43f,function(_440){
_440._updateLayout();
});
},makeExpandable:function(){
this.isExpandable=true;
this._setExpando(false);
},_onLabelFocus:function(evt){
this.tree._onNodeFocus(this);
},setSelected:function(_441){
dijit.setWaiState(this.labelNode,"selected",_441);
dojo.toggleClass(this.rowNode,"dijitTreeRowSelected",_441);
},setFocusable:function(_442){
this.labelNode.setAttribute("tabIndex",_442?"0":"-1");
},_onClick:function(evt){
this.tree._onClick(this,evt);
},_onDblClick:function(evt){
this.tree._onDblClick(this,evt);
},_onMouseEnter:function(evt){
this.tree._onNodeMouseEnter(this,evt);
},_onMouseLeave:function(evt){
this.tree._onNodeMouseLeave(this,evt);
}});
dojo.declare("dijit.Tree",[dijit._Widget,dijit._Templated],{store:null,model:null,query:null,label:"",showRoot:true,childrenAttr:["children"],paths:[],path:[],selectedItems:null,selectedItem:null,openOnClick:false,openOnDblClick:false,templateString:dojo.cache("dijit","templates/Tree.html","<div class=\"dijitTree dijitTreeContainer\" role=\"tree\"\n\tdojoAttachEvent=\"onkeypress:_onKeyPress\">\n\t<div class=\"dijitInline dijitTreeIndent\" style=\"position: absolute; top: -9999px\" dojoAttachPoint=\"indentDetector\"></div>\n</div>\n"),persist:true,autoExpand:false,dndController:"dijit.tree._dndSelector",dndParams:["onDndDrop","itemCreator","onDndCancel","checkAcceptance","checkItemAcceptance","dragThreshold","betweenThreshold"],onDndDrop:null,itemCreator:null,onDndCancel:null,checkAcceptance:null,checkItemAcceptance:null,dragThreshold:5,betweenThreshold:0,_nodePixelIndent:19,_publish:function(_443,_444){
dojo.publish(this.id,[dojo.mixin({tree:this,event:_443},_444||{})]);
},postMixInProperties:function(){
this.tree=this;
if(this.autoExpand){
this.persist=false;
}
this._itemNodesMap={};
if(!this.cookieName){
this.cookieName=this.id+"SaveStateCookie";
}
this._loadDeferred=new dojo.Deferred();
this.inherited(arguments);
},postCreate:function(){
this._initState();
if(!this.model){
this._store2model();
}
this.connect(this.model,"onChange","_onItemChange");
this.connect(this.model,"onChildrenChange","_onItemChildrenChange");
this.connect(this.model,"onDelete","_onItemDelete");
this._load();
this.inherited(arguments);
if(this.dndController){
if(dojo.isString(this.dndController)){
this.dndController=dojo.getObject(this.dndController);
}
var _445={};
for(var i=0;i<this.dndParams.length;i++){
if(this[this.dndParams[i]]){
_445[this.dndParams[i]]=this[this.dndParams[i]];
}
}
this.dndController=new this.dndController(this,_445);
}
},_store2model:function(){
this._v10Compat=true;
dojo.deprecated("Tree: from version 2.0, should specify a model object rather than a store/query");
var _446={id:this.id+"_ForestStoreModel",store:this.store,query:this.query,childrenAttrs:this.childrenAttr};
if(this.params.mayHaveChildren){
_446.mayHaveChildren=dojo.hitch(this,"mayHaveChildren");
}
if(this.params.getItemChildren){
_446.getChildren=dojo.hitch(this,function(item,_447,_448){
this.getItemChildren((this._v10Compat&&item===this.model.root)?null:item,_447,_448);
});
}
this.model=new dijit.tree.ForestStoreModel(_446);
this.showRoot=Boolean(this.label);
},onLoad:function(){
},_load:function(){
this.model.getRoot(dojo.hitch(this,function(item){
var rn=(this.rootNode=this.tree._createTreeNode({item:item,tree:this,isExpandable:true,label:this.label||this.getLabel(item),indent:this.showRoot?0:-1}));
if(!this.showRoot){
rn.rowNode.style.display="none";
dijit.setWaiRole(this.domNode,"presentation");
dijit.setWaiRole(rn.labelNode,"presentation");
dijit.setWaiRole(rn.containerNode,"tree");
}
this.domNode.appendChild(rn.domNode);
var _449=this.model.getIdentity(item);
if(this._itemNodesMap[_449]){
this._itemNodesMap[_449].push(rn);
}else{
this._itemNodesMap[_449]=[rn];
}
rn._updateLayout();
this._expandNode(rn).addCallback(dojo.hitch(this,function(){
this._loadDeferred.callback(true);
this.onLoad();
}));
}),function(err){
console.error(this,": error loading root: ",err);
});
},getNodesByItem:function(item){
if(!item){
return [];
}
var _44a=dojo.isString(item)?item:this.model.getIdentity(item);
return [].concat(this._itemNodesMap[_44a]);
},_setSelectedItemAttr:function(item){
this.set("selectedItems",[item]);
},_setSelectedItemsAttr:function(_44b){
var tree=this;
this._loadDeferred.addCallback(dojo.hitch(this,function(){
var _44c=dojo.map(_44b,function(item){
return (!item||dojo.isString(item))?item:tree.model.getIdentity(item);
});
var _44d=[];
dojo.forEach(_44c,function(id){
_44d=_44d.concat(tree._itemNodesMap[id]||[]);
});
this.set("selectedNodes",_44d);
}));
},_setPathAttr:function(path){
if(path.length){
return this.set("paths",[path]);
}else{
return this.set("paths",[]);
}
},_setPathsAttr:function(_44e){
var tree=this;
return new dojo.DeferredList(dojo.map(_44e,function(path){
var d=new dojo.Deferred();
path=dojo.map(path,function(item){
return dojo.isString(item)?item:tree.model.getIdentity(item);
});
if(path.length){
tree._loadDeferred.addCallback(function(){
_44f(path,[tree.rootNode],d);
});
}else{
d.errback("Empty path");
}
return d;
})).addCallback(_450);
function _44f(path,_451,def){
var _452=path.shift();
var _453=dojo.filter(_451,function(node){
return node.getIdentity()==_452;
})[0];
if(!!_453){
if(path.length){
tree._expandNode(_453).addCallback(function(){
_44f(path,_453.getChildren(),def);
});
}else{
def.callback(_453);
}
}else{
def.errback("Could not expand path at "+_452);
}
};
function _450(_454){
tree.set("selectedNodes",dojo.map(dojo.filter(_454,function(x){
return x[0];
}),function(x){
return x[1];
}));
};
},_setSelectedNodeAttr:function(node){
this.set("selectedNodes",[node]);
},_setSelectedNodesAttr:function(_455){
this._loadDeferred.addCallback(dojo.hitch(this,function(){
this.dndController.setSelection(_455);
}));
},mayHaveChildren:function(item){
},getItemChildren:function(_456,_457){
},getLabel:function(item){
return this.model.getLabel(item);
},getIconClass:function(item,_458){
return ""; //return (!item||this.model.mayHaveChildren(item))?(_458?"dijitFolderOpened":"dijitFolderClosed"):"dijitLeaf";
},getLabelClass:function(item,_459){
},getRowClass:function(item,_45a){
},getIconStyle:function(item,_45b){
},getLabelStyle:function(item,_45c){
},getRowStyle:function(item,_45d){
},getTooltip:function(item){
return "";
},_onKeyPress:function(e){
if(e.altKey){
return;
}
var dk=dojo.keys;
var _45e=dijit.getEnclosingWidget(e.target);
if(!_45e){
return;
}
var key=e.charOrCode;
if(typeof key=="string"&&key!=" "){
if(!e.altKey&&!e.ctrlKey&&!e.shiftKey&&!e.metaKey){
this._onLetterKeyNav({node:_45e,key:key.toLowerCase()});
dojo.stopEvent(e);
}
}else{
if(this._curSearch){
clearTimeout(this._curSearch.timer);
delete this._curSearch;
}
var map=this._keyHandlerMap;
if(!map){
map={};
map[dk.ENTER]="_onEnterKey";
map[dk.SPACE]=map[" "]="_onEnterKey";
map[this.isLeftToRight()?dk.LEFT_ARROW:dk.RIGHT_ARROW]="_onLeftArrow";
map[this.isLeftToRight()?dk.RIGHT_ARROW:dk.LEFT_ARROW]="_onRightArrow";
map[dk.UP_ARROW]="_onUpArrow";
map[dk.DOWN_ARROW]="_onDownArrow";
map[dk.HOME]="_onHomeKey";
map[dk.END]="_onEndKey";
this._keyHandlerMap=map;
}
if(this._keyHandlerMap[key]){
this[this._keyHandlerMap[key]]({node:_45e,item:_45e.item,evt:e});
dojo.stopEvent(e);
}
}
},_onEnterKey:function(_45f){
this._publish("execute",{item:_45f.item,node:_45f.node});
this.dndController.userSelect(_45f.node,dojo.isCopyKey(_45f.evt),_45f.evt.shiftKey);
this.onClick(_45f.item,_45f.node,_45f.evt);
},_onDownArrow:function(_460){
var node=this._getNextNode(_460.node);
if(node&&node.isTreeNode){
this.focusNode(node);
}
},_onUpArrow:function(_461){
var node=_461.node;
var _462=node.getPreviousSibling();
if(_462){
node=_462;
while(node.isExpandable&&node.isExpanded&&node.hasChildren()){
var _463=node.getChildren();
node=_463[_463.length-1];
}
}else{
var _464=node.getParent();
if(!(!this.showRoot&&_464===this.rootNode)){
node=_464;
}
}
if(node&&node.isTreeNode){
this.focusNode(node);
}
},_onRightArrow:function(_465){
var node=_465.node;
if(node.isExpandable&&!node.isExpanded){
this._expandNode(node);
}else{
if(node.hasChildren()){
node=node.getChildren()[0];
if(node&&node.isTreeNode){
this.focusNode(node);
}
}
}
},_onLeftArrow:function(_466){
var node=_466.node;
if(node.isExpandable&&node.isExpanded){
this._collapseNode(node);
}else{
var _467=node.getParent();
if(_467&&_467.isTreeNode&&!(!this.showRoot&&_467===this.rootNode)){
this.focusNode(_467);
}
}
},_onHomeKey:function(){
var node=this._getRootOrFirstNode();
if(node){
this.focusNode(node);
}
},_onEndKey:function(_468){
var node=this.rootNode;
while(node.isExpanded){
var c=node.getChildren();
node=c[c.length-1];
}
if(node&&node.isTreeNode){
this.focusNode(node);
}
},multiCharSearchDuration:250,_onLetterKeyNav:function(_469){
var cs=this._curSearch;
if(cs){
cs.pattern=cs.pattern+_469.key;
clearTimeout(cs.timer);
}else{
cs=this._curSearch={pattern:_469.key,startNode:_469.node};
}
var self=this;
cs.timer=setTimeout(function(){
delete self._curSearch;
},this.multiCharSearchDuration);
var node=cs.startNode;
do{
node=this._getNextNode(node);
if(!node){
node=this._getRootOrFirstNode();
}
}while(node!==cs.startNode&&(node.label.toLowerCase().substr(0,cs.pattern.length)!=cs.pattern));
if(node&&node.isTreeNode){
if(node!==cs.startNode){
this.focusNode(node);
}
}
},isExpandoNode:function(node,_46a){
return dojo.isDescendant(node,_46a.expandoNode);
},_onClick:function(_46b,e){
var _46c=e.target,_46d=this.isExpandoNode(_46c,_46b);
if((this.openOnClick&&_46b.isExpandable)||_46d){
if(_46b.isExpandable){
this._onExpandoClick({node:_46b});
}
}else{
this._publish("execute",{item:_46b.item,node:_46b,evt:e});
this.onClick(_46b.item,_46b,e);
this.focusNode(_46b);
}
dojo.stopEvent(e);
},_onDblClick:function(_46e,e){
var _46f=e.target,_470=(_46f==_46e.expandoNode||_46f==_46e.expandoNodeText);
if((this.openOnDblClick&&_46e.isExpandable)||_470){
if(_46e.isExpandable){
this._onExpandoClick({node:_46e});
}
}else{
this._publish("execute",{item:_46e.item,node:_46e,evt:e});
this.onDblClick(_46e.item,_46e,e);
this.focusNode(_46e);
}
dojo.stopEvent(e);
},_onExpandoClick:function(_471){
var node=_471.node;
this.focusNode(node);
if(node.isExpanded){
this._collapseNode(node);
}else{
this._expandNode(node);
}
},onClick:function(item,node,evt){
},onDblClick:function(item,node,evt){
},onOpen:function(item,node){
},onClose:function(item,node){
},_getNextNode:function(node){
if(node.isExpandable&&node.isExpanded&&node.hasChildren()){
return node.getChildren()[0];
}else{
while(node&&node.isTreeNode){
var _472=node.getNextSibling();
if(_472){
return _472;
}
node=node.getParent();
}
return null;
}
},_getRootOrFirstNode:function(){
return this.showRoot?this.rootNode:this.rootNode.getChildren()[0];
},_collapseNode:function(node){
if(node._expandNodeDeferred){
delete node._expandNodeDeferred;
}
if(node.isExpandable){
if(node.state=="LOADING"){
return;
}
node.collapse();
this.onClose(node.item,node);
if(node.item){
this._state(node.item,false);
this._saveState();
}
}
},_expandNode:function(node,_473){
if(node._expandNodeDeferred&&!_473){
return node._expandNodeDeferred;
}
var _474=this.model,item=node.item,_475=this;
switch(node.state){
case "UNCHECKED":
node.markProcessing();
var def=(node._expandNodeDeferred=new dojo.Deferred());
_474.getChildren(item,function(_476){
node.unmarkProcessing();
var scid=node.setChildItems(_476);
var ed=_475._expandNode(node,true);
scid.addCallback(function(){
ed.addCallback(function(){
def.callback();
});
});
},function(err){
console.error(_475,": error loading root children: ",err);
});
break;
default:
def=(node._expandNodeDeferred=node.expand());
this.onOpen(node.item,node);
if(item){
this._state(item,true);
this._saveState();
}
}
return def;
},focusNode:function(node){
dijit.focus(node.labelNode);
},_onNodeFocus:function(node){
if(node&&node!=this.lastFocused){
if(this.lastFocused&&!this.lastFocused._destroyed){
this.lastFocused.setFocusable(false);
}
node.setFocusable(true);
this.lastFocused=node;
}
},_onNodeMouseEnter:function(node){
},_onNodeMouseLeave:function(node){
},_onItemChange:function(item){
var _477=this.model,_478=_477.getIdentity(item),_479=this._itemNodesMap[_478];
if(_479){
var _47a=this.getLabel(item),_47b=this.getTooltip(item);
dojo.forEach(_479,function(node){
node.set({item:item,label:_47a,tooltip:_47b});
node._updateItemClasses(item);
});
}
},_onItemChildrenChange:function(_47c,_47d){
var _47e=this.model,_47f=_47e.getIdentity(_47c),_480=this._itemNodesMap[_47f];
if(_480){
dojo.forEach(_480,function(_481){
_481.setChildItems(_47d);
});
}
},_onItemDelete:function(item){
var _482=this.model,_483=_482.getIdentity(item),_484=this._itemNodesMap[_483];
if(_484){
dojo.forEach(_484,function(node){
this.dndController.removeTreeNode(node);
var _485=node.getParent();
if(_485){
_485.removeChild(node);
}
node.destroyRecursive();
},this);
delete this._itemNodesMap[_483];
}
},_initState:function(){
if(this.persist){
var _486=dojo.cookie(this.cookieName);
this._openedItemIds={};
if(_486){
dojo.forEach(_486.split(","),function(item){
this._openedItemIds[item]=true;
},this);
}
}
},_state:function(item,_487){
if(!this.persist){
return false;
}
var id=this.model.getIdentity(item);
if(arguments.length===1){
return this._openedItemIds[id];
}
if(_487){
this._openedItemIds[id]=true;
}else{
delete this._openedItemIds[id];
}
},_saveState:function(){
if(!this.persist){
return;
}
var ary=[];
for(var id in this._openedItemIds){
ary.push(id);
}
dojo.cookie(this.cookieName,ary.join(","),{expires:365});
},destroy:function(){
if(this._curSearch){
clearTimeout(this._curSearch.timer);
delete this._curSearch;
}
if(this.rootNode){
this.rootNode.destroyRecursive();
}
if(this.dndController&&!dojo.isString(this.dndController)){
this.dndController.destroy();
}
this.rootNode=null;
this.inherited(arguments);
},destroyRecursive:function(){
this.destroy();
},resize:function(_488){
if(_488){
dojo.marginBox(this.domNode,_488);
}
this._nodePixelIndent=dojo._getMarginSize(this.tree.indentDetector).w;
if(this.tree.rootNode){
this.tree.rootNode.set("indent",this.showRoot?0:-1);
}
},_createTreeNode:function(args){
return new dijit._TreeNode(args);
}});
}
if(!dojo._hasResource["dijit.form._FormWidget"]){
dojo._hasResource["dijit.form._FormWidget"]=true;
dojo.provide("dijit.form._FormWidget");
dojo.declare("dijit.form._FormWidget",[dijit._Widget,dijit._Templated,dijit._CssStateMixin],{name:"",alt:"",value:"",type:"text",tabIndex:"0",disabled:false,intermediateChanges:false,scrollOnFocus:true,attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{value:"focusNode",id:"focusNode",tabIndex:"focusNode",alt:"focusNode",title:"focusNode"}),postMixInProperties:function(){
this.nameAttrSetting=this.name?("name=\""+this.name.replace(/'/g,"&quot;")+"\""):"";
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this.connect(this.domNode,"onmousedown","_onMouseDown");
},_setDisabledAttr:function(_489){
this._set("disabled",_489);
dojo.attr(this.focusNode,"disabled",_489);
if(this.valueNode){
dojo.attr(this.valueNode,"disabled",_489);
}
dijit.setWaiState(this.focusNode,"disabled",_489);
if(_489){
this._set("hovering",false);
this._set("active",false);
var _48a="tabIndex" in this.attributeMap?this.attributeMap.tabIndex:"focusNode";
dojo.forEach(dojo.isArray(_48a)?_48a:[_48a],function(_48b){
var node=this[_48b];
if(dojo.isWebKit||dijit.hasDefaultTabStop(node)){
node.setAttribute("tabIndex","-1");
}else{
node.removeAttribute("tabIndex");
}
},this);
}else{
if(this.tabIndex!=""){
this.focusNode.setAttribute("tabIndex",this.tabIndex);
}
}
},setDisabled:function(_48c){
dojo.deprecated("setDisabled("+_48c+") is deprecated. Use set('disabled',"+_48c+") instead.","","2.0");
this.set("disabled",_48c);
},_onFocus:function(e){
if(this.scrollOnFocus){
dojo.window.scrollIntoView(this.domNode);
}
this.inherited(arguments);
},isFocusable:function(){
return !this.disabled&&this.focusNode&&(dojo.style(this.domNode,"display")!="none");
},focus:function(){
if(!this.disabled){
dijit.focus(this.focusNode);
}
},compare:function(val1,val2){
if(typeof val1=="number"&&typeof val2=="number"){
return (isNaN(val1)&&isNaN(val2))?0:val1-val2;
}else{
if(val1>val2){
return 1;
}else{
if(val1<val2){
return -1;
}else{
return 0;
}
}
}
},onChange:function(_48d){
},_onChangeActive:false,_handleOnChange:function(_48e,_48f){
if(this._lastValueReported==undefined&&(_48f===null||!this._onChangeActive)){
this._resetValue=this._lastValueReported=_48e;
}
this._pendingOnChange=this._pendingOnChange||(typeof _48e!=typeof this._lastValueReported)||(this.compare(_48e,this._lastValueReported)!=0);
if((this.intermediateChanges||_48f||_48f===undefined)&&this._pendingOnChange){
this._lastValueReported=_48e;
this._pendingOnChange=false;
if(this._onChangeActive){
if(this._onChangeHandle){
clearTimeout(this._onChangeHandle);
}
this._onChangeHandle=setTimeout(dojo.hitch(this,function(){
this._onChangeHandle=null;
this.onChange(_48e);
}),0);
}
}
},create:function(){
this.inherited(arguments);
this._onChangeActive=true;
},destroy:function(){
if(this._onChangeHandle){
clearTimeout(this._onChangeHandle);
this.onChange(this._lastValueReported);
}
this.inherited(arguments);
},setValue:function(_490){
dojo.deprecated("dijit.form._FormWidget:setValue("+_490+") is deprecated.  Use set('value',"+_490+") instead.","","2.0");
this.set("value",_490);
},getValue:function(){
dojo.deprecated(this.declaredClass+"::getValue() is deprecated. Use get('value') instead.","","2.0");
return this.get("value");
},_onMouseDown:function(e){
if(!e.ctrlKey&&dojo.mouseButtons.isLeft(e)&&this.isFocusable()){
var _491=this.connect(dojo.body(),"onmouseup",function(){
if(this.isFocusable()){
this.focus();
}
this.disconnect(_491);
});
}
}});
dojo.declare("dijit.form._FormValueWidget",dijit.form._FormWidget,{readOnly:false,attributeMap:dojo.delegate(dijit.form._FormWidget.prototype.attributeMap,{value:"",readOnly:"focusNode"}),_setReadOnlyAttr:function(_492){
dojo.attr(this.focusNode,"readOnly",_492);
dijit.setWaiState(this.focusNode,"readonly",_492);
this._set("readOnly",_492);
},postCreate:function(){
this.inherited(arguments);
if(dojo.isIE<9||(dojo.isIE&&dojo.isQuirks)){
this.connect(this.focusNode||this.domNode,"onkeydown",this._onKeyDown);
}
if(this._resetValue===undefined){
this._lastValueReported=this._resetValue=this.value;
}
},_setValueAttr:function(_493,_494){
this._handleOnChange(_493,_494);
},_handleOnChange:function(_495,_496){
this._set("value",_495);
this.inherited(arguments);
},undo:function(){
this._setValueAttr(this._lastValueReported,false);
},reset:function(){
this._hasBeenBlurred=false;
this._setValueAttr(this._resetValue,true);
},_onKeyDown:function(e){
if(e.keyCode==dojo.keys.ESCAPE&&!(e.ctrlKey||e.altKey||e.metaKey)){
var te;
if(dojo.isIE){
e.preventDefault();
te=document.createEventObject();
te.keyCode=dojo.keys.ESCAPE;
te.shiftKey=e.shiftKey;
e.srcElement.fireEvent("onkeypress",te);
}
}
},_layoutHackIE7:function(){
if(dojo.isIE==7){
var _497=this.domNode;
var _498=_497.parentNode;
var _499=_497.firstChild||_497;
var _49a=_499.style.filter;
var _49b=this;
while(_498&&_498.clientHeight==0){
(function ping(){
var _49c=_49b.connect(_498,"onscroll",function(e){
_49b.disconnect(_49c);
_499.style.filter=(new Date()).getMilliseconds();
setTimeout(function(){
_499.style.filter=_49a;
},0);
});
})();
_498=_498.parentNode;
}
}
}});
}
if(!dojo._hasResource["dijit.form.TextBox"]){
dojo._hasResource["dijit.form.TextBox"]=true;
dojo.provide("dijit.form.TextBox");
dojo.declare("dijit.form.TextBox",dijit.form._FormValueWidget,{trim:false,uppercase:false,lowercase:false,propercase:false,maxLength:"",selectOnClick:false,placeHolder:"",templateString:dojo.cache("dijit.form","templates/TextBox.html","<div class=\"dijit dijitReset dijitInline dijitLeft\" id=\"widget_${id}\" role=\"presentation\"\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class=\"dijitReset dijitInputInner\" dojoAttachPoint='textbox,focusNode' autocomplete=\"off\"\n\t\t\t${!nameAttrSetting} type='${type}'\n\t/></div\n></div>\n"),_singleNodeTemplate:"<input class=\"dijit dijitReset dijitLeft dijitInputField\" dojoAttachPoint=\"textbox,focusNode\" autocomplete=\"off\" type=\"${type}\" ${!nameAttrSetting} />",_buttonInputDisabled:dojo.isIE?"disabled":"",baseClass:"dijitTextBox",attributeMap:dojo.delegate(dijit.form._FormValueWidget.prototype.attributeMap,{maxLength:"focusNode"}),postMixInProperties:function(){
var type=this.type.toLowerCase();
if(this.templateString&&this.templateString.toLowerCase()=="input"||((type=="hidden"||type=="file")&&this.templateString==dijit.form.TextBox.prototype.templateString)){
this.templateString=this._singleNodeTemplate;
}
this.inherited(arguments);
},_setPlaceHolderAttr:function(v){
this._set("placeHolder",v);
if(!this._phspan){
this._attachPoints.push("_phspan");
this._phspan=dojo.create("span",{className:"dijitPlaceHolder dijitInputField"},this.textbox,"after");
}
this._phspan.innerHTML="";
this._phspan.appendChild(document.createTextNode(v));
this._updatePlaceHolder();
},_updatePlaceHolder:function(){
if(this._phspan){
this._phspan.style.display=(this.placeHolder&&!this._focused&&!this.textbox.value)?"":"none";
}
},_getValueAttr:function(){
return this.parse(this.get("displayedValue"),this.constraints);
},_setValueAttr:function(_49d,_49e,_49f){
var _4a0;
if(_49d!==undefined){
_4a0=this.filter(_49d);
if(typeof _49f!="string"){
if(_4a0!==null&&((typeof _4a0!="number")||!isNaN(_4a0))){
_49f=this.filter(this.format(_4a0,this.constraints));
}else{
_49f="";
}
}
}
if(_49f!=null&&_49f!=undefined&&((typeof _49f)!="number"||!isNaN(_49f))&&this.textbox.value!=_49f){
this.textbox.value=_49f;
this._set("displayedValue",this.get("displayedValue"));
}
this._updatePlaceHolder();
this.inherited(arguments,[_4a0,_49e]);
},displayedValue:"",getDisplayedValue:function(){
dojo.deprecated(this.declaredClass+"::getDisplayedValue() is deprecated. Use set('displayedValue') instead.","","2.0");
return this.get("displayedValue");
},_getDisplayedValueAttr:function(){
return this.filter(this.textbox.value);
},setDisplayedValue:function(_4a1){
dojo.deprecated(this.declaredClass+"::setDisplayedValue() is deprecated. Use set('displayedValue', ...) instead.","","2.0");
this.set("displayedValue",_4a1);
},_setDisplayedValueAttr:function(_4a2){
if(_4a2===null||_4a2===undefined){
_4a2="";
}else{
if(typeof _4a2!="string"){
_4a2=String(_4a2);
}
}
this.textbox.value=_4a2;
this._setValueAttr(this.get("value"),undefined);
this._set("displayedValue",this.get("displayedValue"));
},format:function(_4a3,_4a4){
return ((_4a3==null||_4a3==undefined)?"":(_4a3.toString?_4a3.toString():_4a3));
},parse:function(_4a5,_4a6){
return _4a5;
},_refreshState:function(){
},_onInput:function(e){
if(e&&e.type&&/key/i.test(e.type)&&e.keyCode){
switch(e.keyCode){
case dojo.keys.SHIFT:
case dojo.keys.ALT:
case dojo.keys.CTRL:
case dojo.keys.TAB:
return;
}
}
if(this.intermediateChanges){
var _4a7=this;
setTimeout(function(){
_4a7._handleOnChange(_4a7.get("value"),false);
},0);
}
this._refreshState();
this._set("displayedValue",this.get("displayedValue"));
},postCreate:function(){
if(dojo.isIE){
setTimeout(dojo.hitch(this,function(){
var s=dojo.getComputedStyle(this.domNode);
if(s){
var ff=s.fontFamily;
if(ff){
var _4a8=this.domNode.getElementsByTagName("INPUT");
if(_4a8){
for(var i=0;i<_4a8.length;i++){
_4a8[i].style.fontFamily=ff;
}
}
}
}
}),0);
}
this.textbox.setAttribute("value",this.textbox.value);
this.inherited(arguments);
if(dojo.isMoz||dojo.isOpera){
this.connect(this.textbox,"oninput","_onInput");
}else{
this.connect(this.textbox,"onkeydown","_onInput");
this.connect(this.textbox,"onkeyup","_onInput");
this.connect(this.textbox,"onpaste","_onInput");
this.connect(this.textbox,"oncut","_onInput");
}
},_blankValue:"",filter:function(val){
if(val===null){
return this._blankValue;
}
if(typeof val!="string"){
return val;
}
if(this.trim){
val=dojo.trim(val);
}
if(this.uppercase){
val=val.toUpperCase();
}
if(this.lowercase){
val=val.toLowerCase();
}
if(this.propercase){
val=val.replace(/[^\s]+/g,function(word){
return word.substring(0,1).toUpperCase()+word.substring(1);
});
}
return val;
},_setBlurValue:function(){
this._setValueAttr(this.get("value"),true);
},_onBlur:function(e){
if(this.disabled){
return;
}
this._setBlurValue();
this.inherited(arguments);
if(this._selectOnClickHandle){
this.disconnect(this._selectOnClickHandle);
}
if(this.selectOnClick&&dojo.isMoz){
this.textbox.selectionStart=this.textbox.selectionEnd=undefined;
}
this._updatePlaceHolder();
},_onFocus:function(by){
if(this.disabled||this.readOnly){
return;
}
if(this.selectOnClick&&by=="mouse"){
this._selectOnClickHandle=this.connect(this.domNode,"onmouseup",function(){
this.disconnect(this._selectOnClickHandle);
var _4a9;
if(dojo.isIE){
var _4aa=dojo.doc.selection.createRange();
var _4ab=_4aa.parentElement();
_4a9=_4ab==this.textbox&&_4aa.text.length==0;
}else{
_4a9=this.textbox.selectionStart==this.textbox.selectionEnd;
}
if(_4a9){
dijit.selectInputText(this.textbox);
}
});
}
this._updatePlaceHolder();
this.inherited(arguments);
this._refreshState();
},reset:function(){
this.textbox.value="";
this.inherited(arguments);
}});
dijit.selectInputText=function(_4ac,_4ad,stop){
var _4ae=dojo.global;
var _4af=dojo.doc;
_4ac=dojo.byId(_4ac);
if(isNaN(_4ad)){
_4ad=0;
}
if(isNaN(stop)){
stop=_4ac.value?_4ac.value.length:0;
}
dijit.focus(_4ac);
if(_4af["selection"]&&dojo.body()["createTextRange"]){
if(_4ac.createTextRange){
var r=_4ac.createTextRange();
r.collapse(true);
r.moveStart("character",-99999);
r.moveStart("character",_4ad);
r.moveEnd("character",stop-_4ad);
r.select();
}
}else{
if(_4ae["getSelection"]){
if(_4ac.setSelectionRange){
_4ac.setSelectionRange(_4ad,stop);
}
}
}
};
}
if(!dojo._hasResource["dijit._HasDropDown"]){
dojo._hasResource["dijit._HasDropDown"]=true;
dojo.provide("dijit._HasDropDown");
dojo.declare("dijit._HasDropDown",null,{_buttonNode:null,_arrowWrapperNode:null,_popupStateNode:null,_aroundNode:null,dropDown:null,autoWidth:true,forceWidth:false,maxHeight:0,dropDownPosition:["below","above"],_stopClickEvents:true,_onDropDownMouseDown:function(e){
if(this.disabled||this.readOnly){
return;
}
dojo.stopEvent(e);
this._docHandler=this.connect(dojo.doc,"onmouseup","_onDropDownMouseUp");
this.toggleDropDown();
},_onDropDownMouseUp:function(e){
if(e&&this._docHandler){
this.disconnect(this._docHandler);
}
var _4b0=this.dropDown,_4b1=false;
if(e&&this._opened){
var c=dojo.position(this._buttonNode,true);
if(!(e.pageX>=c.x&&e.pageX<=c.x+c.w)||!(e.pageY>=c.y&&e.pageY<=c.y+c.h)){
var t=e.target;
while(t&&!_4b1){
if(dojo.hasClass(t,"dijitPopup")){
_4b1=true;
}else{
t=t.parentNode;
}
}
if(_4b1){
t=e.target;
if(_4b0.onItemClick){
var _4b2;
while(t&&!(_4b2=dijit.byNode(t))){
t=t.parentNode;
}
if(_4b2&&_4b2.onClick&&_4b2.getParent){
_4b2.getParent().onItemClick(_4b2,e);
}
}
return;
}
}
}
if(this._opened&&_4b0.focus&&_4b0.autoFocus!==false){
window.setTimeout(dojo.hitch(_4b0,"focus"),1);
}
},_onDropDownClick:function(e){
if(this._stopClickEvents){
dojo.stopEvent(e);
}
},buildRendering:function(){
this.inherited(arguments);
this._buttonNode=this._buttonNode||this.focusNode||this.domNode;
this._popupStateNode=this._popupStateNode||this.focusNode||this._buttonNode;
var _4b3={"after":this.isLeftToRight()?"Right":"Left","before":this.isLeftToRight()?"Left":"Right","above":"Up","below":"Down","left":"Left","right":"Right"}[this.dropDownPosition[0]]||this.dropDownPosition[0]||"Down";
dojo.addClass(this._arrowWrapperNode||this._buttonNode,"dijit"+_4b3+"ArrowButton");
},postCreate:function(){
this.inherited(arguments);
this.connect(this._buttonNode,"onmousedown","_onDropDownMouseDown");
this.connect(this._buttonNode,"onclick","_onDropDownClick");
this.connect(this.focusNode,"onkeypress","_onKey");
this.connect(this.focusNode,"onkeyup","_onKeyUp");
},destroy:function(){
if(this.dropDown){
if(!this.dropDown._destroyed){
this.dropDown.destroyRecursive();
}
delete this.dropDown;
}
this.inherited(arguments);
},_onKey:function(e){
if(this.disabled||this.readOnly){
return;
}
var d=this.dropDown,_4b4=e.target;
if(d&&this._opened&&d.handleKey){
if(d.handleKey(e)===false){
dojo.stopEvent(e);
return;
}
}
if(d&&this._opened&&e.charOrCode==dojo.keys.ESCAPE){
this.closeDropDown();
dojo.stopEvent(e);
}else{
if(!this._opened&&(e.charOrCode==dojo.keys.DOWN_ARROW||((e.charOrCode==dojo.keys.ENTER||e.charOrCode==" ")&&((_4b4.tagName||"").toLowerCase()!=="input"||(_4b4.type&&_4b4.type.toLowerCase()!=="text"))))){
this._toggleOnKeyUp=true;
dojo.stopEvent(e);
}
}
},_onKeyUp:function(){
if(this._toggleOnKeyUp){
delete this._toggleOnKeyUp;
this.toggleDropDown();
var d=this.dropDown;
if(d&&d.focus){
setTimeout(dojo.hitch(d,"focus"),1);
}
}
},_onBlur:function(){
var _4b5=dijit._curFocus&&this.dropDown&&dojo.isDescendant(dijit._curFocus,this.dropDown.domNode);
this.closeDropDown(_4b5);
this.inherited(arguments);
},isLoaded:function(){
return true;
},loadDropDown:function(_4b6){
_4b6();
},toggleDropDown:function(){
if(this.disabled||this.readOnly){
return;
}
if(!this._opened){
if(!this.isLoaded()){
this.loadDropDown(dojo.hitch(this,"openDropDown"));
return;
}else{
this.openDropDown();
}
}else{
this.closeDropDown();
}
},openDropDown:function(){
var _4b7=this.dropDown,_4b8=_4b7.domNode,_4b9=this._aroundNode||this.domNode,self=this;
if(!this._preparedNode){
this._preparedNode=true;
if(_4b8.style.width){
this._explicitDDWidth=true;
}
if(_4b8.style.height){
this._explicitDDHeight=true;
}
}
if(this.maxHeight||this.forceWidth||this.autoWidth){
var _4ba={display:"",visibility:"hidden"};
if(!this._explicitDDWidth){
_4ba.width="";
}
if(!this._explicitDDHeight){
_4ba.height="";
}
dojo.style(_4b8,_4ba);
var _4bb=this.maxHeight;
if(_4bb==-1){
var _4bc=dojo.window.getBox(),_4bd=dojo.position(_4b9,false);
_4bb=Math.floor(Math.max(_4bd.y,_4bc.h-(_4bd.y+_4bd.h)));
}
if(_4b7.startup&&!_4b7._started){
_4b7.startup();
}
dijit.popup.moveOffScreen(_4b7);
var mb=dojo._getMarginSize(_4b8);
var _4be=(_4bb&&mb.h>_4bb);
dojo.style(_4b8,{overflowX:"hidden",overflowY:_4be?"auto":"hidden"});
if(_4be){
mb.h=_4bb;
if("w" in mb){
mb.w+=16;
}
}else{
delete mb.h;
}
if(this.forceWidth){
mb.w=_4b9.offsetWidth;
}else{
if(this.autoWidth){
mb.w=Math.max(mb.w,_4b9.offsetWidth);
}else{
delete mb.w;
}
}
if(dojo.isFunction(_4b7.resize)){
_4b7.resize(mb);
}else{
dojo.marginBox(_4b8,mb);
}
}
var _4bf=dijit.popup.open({parent:this,popup:_4b7,around:_4b9,orient:dijit.getPopupAroundAlignment((this.dropDownPosition&&this.dropDownPosition.length)?this.dropDownPosition:["below"],this.isLeftToRight()),onExecute:function(){
self.closeDropDown(true);
},onCancel:function(){
self.closeDropDown(true);
},onClose:function(){
dojo.attr(self._popupStateNode,"popupActive",false);
dojo.removeClass(self._popupStateNode,"dijitHasDropDownOpen");
self._opened=false;
}});
dojo.attr(this._popupStateNode,"popupActive","true");
dojo.addClass(self._popupStateNode,"dijitHasDropDownOpen");
this._opened=true;
return _4bf;
},closeDropDown:function(_4c0){
if(this._opened){
if(_4c0){
this.focus();
}
dijit.popup.close(this.dropDown);
this._opened=false;
}
}});
}
if(!dojo._hasResource["dijit.form.Button"]){
dojo._hasResource["dijit.form.Button"]=true;
dojo.provide("dijit.form.Button");
dojo.declare("dijit.form.Button",dijit.form._FormWidget,{label:"",showLabel:true,iconClass:"",type:"button",baseClass:"dijitButton",templateString:dojo.cache("dijit.form","templates/Button.html","<span class=\"dijit dijitReset dijitInline\"\n\t><span class=\"dijitReset dijitInline dijitButtonNode\"\n\t\tdojoAttachEvent=\"ondijitclick:_onButtonClick\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdojoAttachPoint=\"titleNode,focusNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\" dojoAttachPoint=\"iconNode\"></span\n\t\t\t><span class=\"dijitReset dijitToggleButtonIconChar\">&#x25CF;</span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t\tdojoAttachPoint=\"containerNode\"\n\t\t\t></span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\" tabIndex=\"-1\"\n\t\tdojoAttachPoint=\"valueNode\"\n/></span>\n"),attributeMap:dojo.delegate(dijit.form._FormWidget.prototype.attributeMap,{value:"valueNode"}),_onClick:function(e){
if(this.disabled){
return false;
}
this._clicked();
return this.onClick(e);
},_onButtonClick:function(e){
if(this._onClick(e)===false){
e.preventDefault();
}else{
if(this.type=="submit"&&!(this.valueNode||this.focusNode).form){
for(var node=this.domNode;node.parentNode;node=node.parentNode){
var _4c1=dijit.byNode(node);
if(_4c1&&typeof _4c1._onSubmit=="function"){
_4c1._onSubmit(e);
break;
}
}
}else{
if(this.valueNode){
this.valueNode.click();
e.preventDefault();
}
}
}
},buildRendering:function(){
this.inherited(arguments);
dojo.setSelectable(this.focusNode,false);
},_fillContent:function(_4c2){
if(_4c2&&(!this.params||!("label" in this.params))){
this.set("label",_4c2.innerHTML);
}
},_setShowLabelAttr:function(val){
if(this.containerNode){
dojo.toggleClass(this.containerNode,"dijitDisplayNone",!val);
}
this._set("showLabel",val);
},onClick:function(e){
return true;
},_clicked:function(e){
},setLabel:function(_4c3){
dojo.deprecated("dijit.form.Button.setLabel() is deprecated.  Use set('label', ...) instead.","","2.0");
this.set("label",_4c3);
},_setLabelAttr:function(_4c4){
this._set("label",_4c4);
this.containerNode.innerHTML=_4c4;
if(this.showLabel==false&&!this.params.title){
this.titleNode.title=dojo.trim(this.containerNode.innerText||this.containerNode.textContent||"");
}
},_setIconClassAttr:function(val){
var _4c5=this.iconClass||"dijitNoIcon",_4c6=val||"dijitNoIcon";
dojo.replaceClass(this.iconNode,_4c6,_4c5);
this._set("iconClass",val);
}});
dojo.declare("dijit.form.DropDownButton",[dijit.form.Button,dijit._Container,dijit._HasDropDown],{baseClass:"dijitDropDownButton",templateString:dojo.cache("dijit.form","templates/DropDownButton.html","<span class=\"dijit dijitReset dijitInline\"\n\t><span class='dijitReset dijitInline dijitButtonNode'\n\t\tdojoAttachEvent=\"ondijitclick:_onButtonClick\" dojoAttachPoint=\"_buttonNode\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdojoAttachPoint=\"focusNode,titleNode,_arrowWrapperNode\"\n\t\t\trole=\"button\" aria-haspopup=\"true\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\"\n\t\t\t\tdojoAttachPoint=\"iconNode\"\n\t\t\t></span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tdojoAttachPoint=\"containerNode,_popupStateNode\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t></span\n\t\t\t><span class=\"dijitReset dijitInline dijitArrowButtonInner\"></span\n\t\t\t><span class=\"dijitReset dijitInline dijitArrowButtonChar\">&#9660;</span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\" tabIndex=\"-1\"\n\t\tdojoAttachPoint=\"valueNode\"\n/></span>\n"),_fillContent:function(){
if(this.srcNodeRef){
var _4c7=dojo.query("*",this.srcNodeRef);
dijit.form.DropDownButton.superclass._fillContent.call(this,_4c7[0]);
this.dropDownContainer=this.srcNodeRef;
}
},startup:function(){
if(this._started){
return;
}
if(!this.dropDown&&this.dropDownContainer){
var _4c8=dojo.query("[widgetId]",this.dropDownContainer)[0];
this.dropDown=dijit.byNode(_4c8);
delete this.dropDownContainer;
}
if(this.dropDown){
dijit.popup.hide(this.dropDown);
}
this.inherited(arguments);
},isLoaded:function(){
var _4c9=this.dropDown;
return (!!_4c9&&(!_4c9.href||_4c9.isLoaded));
},loadDropDown:function(){
var _4ca=this.dropDown;
if(!_4ca){
return;
}
if(!this.isLoaded()){
var _4cb=dojo.connect(_4ca,"onLoad",this,function(){
dojo.disconnect(_4cb);
this.openDropDown();
});
_4ca.refresh();
}else{
this.openDropDown();
}
},isFocusable:function(){
return this.inherited(arguments)&&!this._mouseDown;
}});
dojo.declare("dijit.form.ComboButton",dijit.form.DropDownButton,{templateString:dojo.cache("dijit.form","templates/ComboButton.html","<table class=\"dijit dijitReset dijitInline dijitLeft\"\n\tcellspacing='0' cellpadding='0' role=\"presentation\"\n\t><tbody role=\"presentation\"><tr role=\"presentation\"\n\t\t><td class=\"dijitReset dijitStretch dijitButtonNode\" dojoAttachPoint=\"buttonNode\" dojoAttachEvent=\"ondijitclick:_onButtonClick,onkeypress:_onButtonKeyPress\"\n\t\t><div id=\"${id}_button\" class=\"dijitReset dijitButtonContents\"\n\t\t\tdojoAttachPoint=\"titleNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><div class=\"dijitReset dijitInline dijitIcon\" dojoAttachPoint=\"iconNode\" role=\"presentation\"></div\n\t\t\t><div class=\"dijitReset dijitInline dijitButtonText\" id=\"${id}_label\" dojoAttachPoint=\"containerNode\" role=\"presentation\"></div\n\t\t></div\n\t\t></td\n\t\t><td id=\"${id}_arrow\" class='dijitReset dijitRight dijitButtonNode dijitArrowButton'\n\t\t\tdojoAttachPoint=\"_popupStateNode,focusNode,_buttonNode\"\n\t\t\tdojoAttachEvent=\"onkeypress:_onArrowKeyPress\"\n\t\t\ttitle=\"${optionsTitle}\"\n\t\t\trole=\"button\" aria-haspopup=\"true\"\n\t\t\t><div class=\"dijitReset dijitArrowButtonInner\" role=\"presentation\"></div\n\t\t\t><div class=\"dijitReset dijitArrowButtonChar\" role=\"presentation\">&#9660;</div\n\t\t></td\n\t\t><td style=\"display:none !important;\"\n\t\t\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" dojoAttachPoint=\"valueNode\"\n\t\t/></td></tr></tbody\n></table>\n"),attributeMap:dojo.mixin(dojo.clone(dijit.form.Button.prototype.attributeMap),{id:"",tabIndex:["focusNode","titleNode"],title:"titleNode"}),optionsTitle:"",baseClass:"dijitComboButton",cssStateNodes:{"buttonNode":"dijitButtonNode","titleNode":"dijitButtonContents","_popupStateNode":"dijitDownArrowButton"},_focusedNode:null,_onButtonKeyPress:function(evt){
if(evt.charOrCode==dojo.keys[this.isLeftToRight()?"RIGHT_ARROW":"LEFT_ARROW"]){
dijit.focus(this._popupStateNode);
dojo.stopEvent(evt);
}
},_onArrowKeyPress:function(evt){
if(evt.charOrCode==dojo.keys[this.isLeftToRight()?"LEFT_ARROW":"RIGHT_ARROW"]){
dijit.focus(this.titleNode);
dojo.stopEvent(evt);
}
},focus:function(_4cc){
if(!this.disabled){
dijit.focus(_4cc=="start"?this.titleNode:this._popupStateNode);
}
}});
dojo.declare("dijit.form.ToggleButton",dijit.form.Button,{baseClass:"dijitToggleButton",checked:false,attributeMap:dojo.mixin(dojo.clone(dijit.form.Button.prototype.attributeMap),{checked:"focusNode"}),_clicked:function(evt){
this.set("checked",!this.checked);
},_setCheckedAttr:function(_4cd,_4ce){
this._set("checked",_4cd);
dojo.attr(this.focusNode||this.domNode,"checked",_4cd);
dijit.setWaiState(this.focusNode||this.domNode,"pressed",_4cd);
this._handleOnChange(_4cd,_4ce);
},setChecked:function(_4cf){
dojo.deprecated("setChecked("+_4cf+") is deprecated. Use set('checked',"+_4cf+") instead.","","2.0");
this.set("checked",_4cf);
},reset:function(){
this._hasBeenBlurred=false;
this.set("checked",this.params.checked||false);
}});
}
if(!dojo._hasResource["dijit.form.ToggleButton"]){
dojo._hasResource["dijit.form.ToggleButton"]=true;
dojo.provide("dijit.form.ToggleButton");
}
if(!dojo._hasResource["dijit.layout.StackController"]){
dojo._hasResource["dijit.layout.StackController"]=true;
dojo.provide("dijit.layout.StackController");
dojo.declare("dijit.layout.StackController",[dijit._Widget,dijit._Templated,dijit._Container],{templateString:"<span role='tablist' dojoAttachEvent='onkeypress' class='dijitStackController'></span>",containerId:"",buttonWidget:"dijit.layout._StackButton",constructor:function(){
this.pane2button={};
this.pane2connects={};
this.pane2watches={};
},buildRendering:function(){
this.inherited(arguments);
dijit.setWaiRole(this.domNode,"tablist");
},postCreate:function(){
this.inherited(arguments);
this.subscribe(this.containerId+"-startup","onStartup");
this.subscribe(this.containerId+"-addChild","onAddChild");
this.subscribe(this.containerId+"-removeChild","onRemoveChild");
this.subscribe(this.containerId+"-selectChild","onSelectChild");
this.subscribe(this.containerId+"-containerKeyPress","onContainerKeyPress");
},onStartup:function(info){
dojo.forEach(info.children,this.onAddChild,this);
if(info.selected){
this.onSelectChild(info.selected);
}
},destroy:function(){
for(var pane in this.pane2button){
this.onRemoveChild(dijit.byId(pane));
}
this.inherited(arguments);
},onAddChild:function(page,_4d0){
var cls=dojo.getObject(this.buttonWidget);
var _4d1=new cls({id:this.id+"_"+page.id,label:page.title,dir:page.dir,lang:page.lang,showLabel:page.showTitle,iconClass:page.iconClass,closeButton:page.closable,title:page.tooltip});
dijit.setWaiState(_4d1.focusNode,"selected","false");
var _4d2=["title","showTitle","iconClass","closable","tooltip"],_4d3=["label","showLabel","iconClass","closeButton","title"];
this.pane2watches[page.id]=dojo.map(_4d2,function(_4d4,idx){
return page.watch(_4d4,function(name,_4d5,_4d6){
_4d1.set(_4d3[idx],_4d6);
});
});
this.pane2connects[page.id]=[this.connect(_4d1,"onClick",dojo.hitch(this,"onButtonClick",page)),this.connect(_4d1,"onClickCloseButton",dojo.hitch(this,"onCloseButtonClick",page))];
this.addChild(_4d1,_4d0);
this.pane2button[page.id]=_4d1;
page.controlButton=_4d1;
if(!this._currentChild){
_4d1.focusNode.setAttribute("tabIndex","0");
dijit.setWaiState(_4d1.focusNode,"selected","true");
this._currentChild=page;
}
if(!this.isLeftToRight()&&dojo.isIE&&this._rectifyRtlTabList){
this._rectifyRtlTabList();
}
},onRemoveChild:function(page){
if(this._currentChild===page){
this._currentChild=null;
}
dojo.forEach(this.pane2connects[page.id],dojo.hitch(this,"disconnect"));
delete this.pane2connects[page.id];
dojo.forEach(this.pane2watches[page.id],function(w){
w.unwatch();
});
delete this.pane2watches[page.id];
var _4d7=this.pane2button[page.id];
if(_4d7){
this.removeChild(_4d7);
delete this.pane2button[page.id];
_4d7.destroy();
}
delete page.controlButton;
},onSelectChild:function(page){
if(!page){
return;
}
if(this._currentChild){
var _4d8=this.pane2button[this._currentChild.id];
_4d8.set("checked",false);
dijit.setWaiState(_4d8.focusNode,"selected","false");
_4d8.focusNode.setAttribute("tabIndex","-1");
}
var _4d9=this.pane2button[page.id];
_4d9.set("checked",true);
dijit.setWaiState(_4d9.focusNode,"selected","true");
this._currentChild=page;
_4d9.focusNode.setAttribute("tabIndex","0");
var _4da=dijit.byId(this.containerId);
dijit.setWaiState(_4da.containerNode,"labelledby",_4d9.id);
},onButtonClick:function(page){
var _4db=dijit.byId(this.containerId);
_4db.selectChild(page);
},onCloseButtonClick:function(page){
var _4dc=dijit.byId(this.containerId);
_4dc.closeChild(page);
if(this._currentChild){
var b=this.pane2button[this._currentChild.id];
if(b){
dijit.focus(b.focusNode||b.domNode);
}
}
},adjacent:function(_4dd){
if(!this.isLeftToRight()&&(!this.tabPosition||/top|bottom/.test(this.tabPosition))){
_4dd=!_4dd;
}
var _4de=this.getChildren();
var _4df=dojo.indexOf(_4de,this.pane2button[this._currentChild.id]);
var _4e0=_4dd?1:_4de.length-1;
return _4de[(_4df+_4e0)%_4de.length];
},onkeypress:function(e){
if(this.disabled||e.altKey){
return;
}
var _4e1=null;
if(e.ctrlKey||!e._djpage){
var k=dojo.keys;
switch(e.charOrCode){
case k.LEFT_ARROW:
case k.UP_ARROW:
if(!e._djpage){
_4e1=false;
}
break;
case k.PAGE_UP:
if(e.ctrlKey){
_4e1=false;
}
break;
case k.RIGHT_ARROW:
case k.DOWN_ARROW:
if(!e._djpage){
_4e1=true;
}
break;
case k.PAGE_DOWN:
if(e.ctrlKey){
_4e1=true;
}
break;
case k.HOME:
case k.END:
var _4e2=this.getChildren();
if(_4e2&&_4e2.length){
_4e2[e.charOrCode==k.HOME?0:_4e2.length-1].onClick();
}
dojo.stopEvent(e);
break;
case k.DELETE:
if(this._currentChild.closable){
this.onCloseButtonClick(this._currentChild);
}
dojo.stopEvent(e);
break;
default:
if(e.ctrlKey){
if(e.charOrCode===k.TAB){
this.adjacent(!e.shiftKey).onClick();
dojo.stopEvent(e);
}else{
if(e.charOrCode=="w"){
if(this._currentChild.closable){
this.onCloseButtonClick(this._currentChild);
}
dojo.stopEvent(e);
}
}
}
}
if(_4e1!==null){
this.adjacent(_4e1).onClick();
dojo.stopEvent(e);
}
}
},onContainerKeyPress:function(info){
info.e._djpage=info.page;
this.onkeypress(info.e);
}});
dojo.declare("dijit.layout._StackButton",dijit.form.ToggleButton,{tabIndex:"-1",buildRendering:function(evt){
this.inherited(arguments);
dijit.setWaiRole((this.focusNode||this.domNode),"tab");
},onClick:function(evt){
dijit.focus(this.focusNode);
},onClickCloseButton:function(evt){
evt.stopPropagation();
}});
}
if(!dojo._hasResource["dijit.layout.StackContainer"]){
dojo._hasResource["dijit.layout.StackContainer"]=true;
dojo.provide("dijit.layout.StackContainer");
dojo.declare("dijit.layout.StackContainer",dijit.layout._LayoutWidget,{doLayout:true,persist:false,baseClass:"dijitStackContainer",buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitLayoutContainer");
dijit.setWaiRole(this.containerNode,"tabpanel");
},postCreate:function(){
this.inherited(arguments);
this.connect(this.domNode,"onkeypress",this._onKeyPress);
},startup:function(){
if(this._started){
return;
}
var _4e3=this.getChildren();
dojo.forEach(_4e3,this._setupChild,this);
if(this.persist){
this.selectedChildWidget=dijit.byId(dojo.cookie(this.id+"_selectedChild"));
}else{
dojo.some(_4e3,function(_4e4){
if(_4e4.selected){
this.selectedChildWidget=_4e4;
}
return _4e4.selected;
},this);
}
var _4e5=this.selectedChildWidget;
if(!_4e5&&_4e3[0]){
_4e5=this.selectedChildWidget=_4e3[0];
_4e5.selected=true;
}
dojo.publish(this.id+"-startup",[{children:_4e3,selected:_4e5}]);
this.inherited(arguments);
},resize:function(){
var _4e6=this.selectedChildWidget;
if(_4e6&&!this._hasBeenShown){
this._hasBeenShown=true;
this._showChild(_4e6);
}
this.inherited(arguments);
},_setupChild:function(_4e7){
this.inherited(arguments);
dojo.replaceClass(_4e7.domNode,"dijitHidden","dijitVisible");
_4e7.domNode.title="";
},addChild:function(_4e8,_4e9){
this.inherited(arguments);
if(this._started){
dojo.publish(this.id+"-addChild",[_4e8,_4e9]);
this.layout();
if(!this.selectedChildWidget){
this.selectChild(_4e8);
}
}
},removeChild:function(page){
this.inherited(arguments);
if(this._started){
dojo.publish(this.id+"-removeChild",[page]);
}
if(this._beingDestroyed){
return;
}
if(this.selectedChildWidget===page){
this.selectedChildWidget=undefined;
if(this._started){
var _4ea=this.getChildren();
if(_4ea.length){
this.selectChild(_4ea[0]);
}
}
}
if(this._started){
this.layout();
}
},selectChild:function(page,_4eb){
page=dijit.byId(page);
if(this.selectedChildWidget!=page){
var d=this._transition(page,this.selectedChildWidget,_4eb);
this._set("selectedChildWidget",page);
dojo.publish(this.id+"-selectChild",[page]);
if(this.persist){
dojo.cookie(this.id+"_selectedChild",this.selectedChildWidget.id);
}
}
return d;
},_transition:function(_4ec,_4ed,_4ee){
if(_4ed){
this._hideChild(_4ed);
}
var d=this._showChild(_4ec);
if(_4ec.resize){
if(this.doLayout){
_4ec.resize(this._containerContentBox||this._contentBox);
}else{
_4ec.resize();
}
}
return d;
},_adjacent:function(_4ef){
var _4f0=this.getChildren();
var _4f1=dojo.indexOf(_4f0,this.selectedChildWidget);
_4f1+=_4ef?1:_4f0.length-1;
return _4f0[_4f1%_4f0.length];
},forward:function(){
return this.selectChild(this._adjacent(true),true);
},back:function(){
return this.selectChild(this._adjacent(false),true);
},_onKeyPress:function(e){
dojo.publish(this.id+"-containerKeyPress",[{e:e,page:this}]);
},layout:function(){
if(this.doLayout&&this.selectedChildWidget&&this.selectedChildWidget.resize){
this.selectedChildWidget.resize(this._containerContentBox||this._contentBox);
}
},_showChild:function(page){
var _4f2=this.getChildren();
page.isFirstChild=(page==_4f2[0]);
page.isLastChild=(page==_4f2[_4f2.length-1]);
page._set("selected",true);
dojo.replaceClass(page.domNode,"dijitVisible","dijitHidden");
return page._onShow()||true;
},_hideChild:function(page){
page._set("selected",false);
dojo.replaceClass(page.domNode,"dijitHidden","dijitVisible");
page.onHide();
},closeChild:function(page){
var _4f3=page.onClose(this,page);
if(_4f3){
this.removeChild(page);
page.destroyRecursive();
}
},destroyDescendants:function(_4f4){
dojo.forEach(this.getChildren(),function(_4f5){
this.removeChild(_4f5);
_4f5.destroyRecursive(_4f4);
},this);
}});
dojo.extend(dijit._Widget,{selected:false,closable:false,iconClass:"",showTitle:true});
}
if(!dojo._hasResource["dijit.layout._TabContainerBase"]){
dojo._hasResource["dijit.layout._TabContainerBase"]=true;
dojo.provide("dijit.layout._TabContainerBase");
dojo.declare("dijit.layout._TabContainerBase",[dijit.layout.StackContainer,dijit._Templated],{tabPosition:"top",baseClass:"dijitTabContainer",tabStrip:false,nested:false,templateString:dojo.cache("dijit.layout","templates/TabContainer.html","<div class=\"dijitTabContainer\">\n\t<div class=\"dijitTabListWrapper\" dojoAttachPoint=\"tablistNode\"></div>\n\t<div dojoAttachPoint=\"tablistSpacer\" class=\"dijitTabSpacer ${baseClass}-spacer\"></div>\n\t<div class=\"dijitTabPaneWrapper ${baseClass}-container\" dojoAttachPoint=\"containerNode\"></div>\n</div>\n"),postMixInProperties:function(){
this.baseClass+=this.tabPosition.charAt(0).toUpperCase()+this.tabPosition.substr(1).replace(/-.*/,"");
this.srcNodeRef&&dojo.style(this.srcNodeRef,"visibility","hidden");
this.inherited(arguments);
},buildRendering:function(){
this.inherited(arguments);
this.tablist=this._makeController(this.tablistNode);
if(!this.doLayout){
dojo.addClass(this.domNode,"dijitTabContainerNoLayout");
}
if(this.nested){
dojo.addClass(this.domNode,"dijitTabContainerNested");
dojo.addClass(this.tablist.containerNode,"dijitTabContainerTabListNested");
dojo.addClass(this.tablistSpacer,"dijitTabContainerSpacerNested");
dojo.addClass(this.containerNode,"dijitTabPaneWrapperNested");
}else{
dojo.addClass(this.domNode,"tabStrip-"+(this.tabStrip?"enabled":"disabled"));
}
},_setupChild:function(tab){
dojo.addClass(tab.domNode,"dijitTabPane");
this.inherited(arguments);
},startup:function(){
if(this._started){
return;
}
this.tablist.startup();
this.inherited(arguments);
},layout:function(){
if(!this._contentBox||typeof (this._contentBox.l)=="undefined"){
return;
}
var sc=this.selectedChildWidget;
if(this.doLayout){
var _4f6=this.tabPosition.replace(/-h/,"");
this.tablist.layoutAlign=_4f6;
var _4f7=[this.tablist,{domNode:this.tablistSpacer,layoutAlign:_4f6},{domNode:this.containerNode,layoutAlign:"client"}];
dijit.layout.layoutChildren(this.domNode,this._contentBox,_4f7);
this._containerContentBox=dijit.layout.marginBox2contentBox(this.containerNode,_4f7[2]);
if(sc&&sc.resize){
sc.resize(this._containerContentBox);
}
}else{
if(this.tablist.resize){
var s=this.tablist.domNode.style;
s.width="0";
var _4f8=dojo.contentBox(this.domNode).w;
s.width="";
this.tablist.resize({w:_4f8});
}
if(sc&&sc.resize){
sc.resize();
}
}
},destroy:function(){
if(this.tablist){
this.tablist.destroy();
}
this.inherited(arguments);
}});
}
if(!dojo._hasResource["dijit._KeyNavContainer"]){
dojo._hasResource["dijit._KeyNavContainer"]=true;
dojo.provide("dijit._KeyNavContainer");
dojo.declare("dijit._KeyNavContainer",dijit._Container,{tabIndex:"0",_keyNavCodes:{},connectKeyNavHandlers:function(_4f9,_4fa){
var _4fb=(this._keyNavCodes={});
var prev=dojo.hitch(this,this.focusPrev);
var next=dojo.hitch(this,this.focusNext);
dojo.forEach(_4f9,function(code){
_4fb[code]=prev;
});
dojo.forEach(_4fa,function(code){
_4fb[code]=next;
});
_4fb[dojo.keys.HOME]=dojo.hitch(this,"focusFirstChild");
_4fb[dojo.keys.END]=dojo.hitch(this,"focusLastChild");
this.connect(this.domNode,"onkeypress","_onContainerKeypress");
this.connect(this.domNode,"onfocus","_onContainerFocus");
},startupKeyNavChildren:function(){
dojo.forEach(this.getChildren(),dojo.hitch(this,"_startupChild"));
},addChild:function(_4fc,_4fd){
dijit._KeyNavContainer.superclass.addChild.apply(this,arguments);
this._startupChild(_4fc);
},focus:function(){
this.focusFirstChild();
},focusFirstChild:function(){
var _4fe=this._getFirstFocusableChild();
if(_4fe){
this.focusChild(_4fe);
}
},focusLastChild:function(){
var _4ff=this._getLastFocusableChild();
if(_4ff){
this.focusChild(_4ff);
}
},focusNext:function(){
var _500=this._getNextFocusableChild(this.focusedChild,1);
this.focusChild(_500);
},focusPrev:function(){
var _501=this._getNextFocusableChild(this.focusedChild,-1);
this.focusChild(_501,true);
},focusChild:function(_502,last){
if(this.focusedChild&&_502!==this.focusedChild){
this._onChildBlur(this.focusedChild);
}
_502.set("tabIndex",this.tabIndex);
_502.focus(last?"end":"start");
this._set("focusedChild",_502);
},_startupChild:function(_503){
_503.set("tabIndex","-1");
this.connect(_503,"_onFocus",function(){
_503.set("tabIndex",this.tabIndex);
});
this.connect(_503,"_onBlur",function(){
_503.set("tabIndex","-1");
});
},_onContainerFocus:function(evt){
if(evt.target!==this.domNode){
return;
}
this.focusFirstChild();
dojo.attr(this.domNode,"tabIndex","-1");
},_onBlur:function(evt){
if(this.tabIndex){
dojo.attr(this.domNode,"tabIndex",this.tabIndex);
}
this.inherited(arguments);
},_onContainerKeypress:function(evt){
if(evt.ctrlKey||evt.altKey){
return;
}
var func=this._keyNavCodes[evt.charOrCode];
if(func){
func();
dojo.stopEvent(evt);
}
},_onChildBlur:function(_504){
},_getFirstFocusableChild:function(){
return this._getNextFocusableChild(null,1);
},_getLastFocusableChild:function(){
return this._getNextFocusableChild(null,-1);
},_getNextFocusableChild:function(_505,dir){
if(_505){
_505=this._getSiblingOfChild(_505,dir);
}
var _506=this.getChildren();
for(var i=0;i<_506.length;i++){
if(!_505){
_505=_506[(dir>0)?0:(_506.length-1)];
}
if(_505.isFocusable()){
return _505;
}
_505=this._getSiblingOfChild(_505,dir);
}
return null;
}});
}
if(!dojo._hasResource["dijit.MenuItem"]){
dojo._hasResource["dijit.MenuItem"]=true;
dojo.provide("dijit.MenuItem");
dojo.declare("dijit.MenuItem",[dijit._Widget,dijit._Templated,dijit._Contained,dijit._CssStateMixin],{templateString:dojo.cache("dijit","templates/MenuItem.html","<tr class=\"dijitReset dijitMenuItem\" dojoAttachPoint=\"focusNode\" role=\"menuitem\" tabIndex=\"-1\"\n\t\tdojoAttachEvent=\"onmouseenter:_onHover,onmouseleave:_onUnhover,ondijitclick:_onClick\">\n\t<td class=\"dijitReset dijitMenuItemIconCell\" role=\"presentation\">\n\t\t<img src=\"${_blankGif}\" alt=\"\" class=\"dijitIcon dijitMenuItemIcon\" dojoAttachPoint=\"iconNode\"/>\n\t</td>\n\t<td class=\"dijitReset dijitMenuItemLabel\" colspan=\"2\" dojoAttachPoint=\"containerNode\"></td>\n\t<td class=\"dijitReset dijitMenuItemAccelKey\" style=\"display: none\" dojoAttachPoint=\"accelKeyNode\"></td>\n\t<td class=\"dijitReset dijitMenuArrowCell\" role=\"presentation\">\n\t\t<div dojoAttachPoint=\"arrowWrapper\" style=\"visibility: hidden\">\n\t\t\t<img src=\"${_blankGif}\" alt=\"\" class=\"dijitMenuExpand\"/>\n\t\t\t<span class=\"dijitMenuExpandA11y\">+</span>\n\t\t</div>\n\t</td>\n</tr>\n"),attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{label:{node:"containerNode",type:"innerHTML"},iconClass:{node:"iconNode",type:"class"}}),baseClass:"dijitMenuItem",label:"",iconClass:"",accelKey:"",disabled:false,_fillContent:function(_507){
if(_507&&!("label" in this.params)){
this.set("label",_507.innerHTML);
}
},buildRendering:function(){
this.inherited(arguments);
var _508=this.id+"_text";
dojo.attr(this.containerNode,"id",_508);
if(this.accelKeyNode){
dojo.attr(this.accelKeyNode,"id",this.id+"_accel");
_508+=" "+this.id+"_accel";
}
dijit.setWaiState(this.domNode,"labelledby",_508);
dojo.setSelectable(this.domNode,false);
},_onHover:function(){
this.getParent().onItemHover(this);
},_onUnhover:function(){
this.getParent().onItemUnhover(this);
this._set("hovering",false);
},_onClick:function(evt){
this.getParent().onItemClick(this,evt);
dojo.stopEvent(evt);
},onClick:function(evt){
},focus:function(){
try{
if(dojo.isIE==8){
this.containerNode.focus();
}
dijit.focus(this.focusNode);
}
catch(e){
}
},_onFocus:function(){
this._setSelected(true);
this.getParent()._onItemFocus(this);
this.inherited(arguments);
},_setSelected:function(_509){
dojo.toggleClass(this.domNode,"dijitMenuItemSelected",_509);
},setLabel:function(_50a){
dojo.deprecated("dijit.MenuItem.setLabel() is deprecated.  Use set('label', ...) instead.","","2.0");
this.set("label",_50a);
},setDisabled:function(_50b){
dojo.deprecated("dijit.Menu.setDisabled() is deprecated.  Use set('disabled', bool) instead.","","2.0");
this.set("disabled",_50b);
},_setDisabledAttr:function(_50c){
dijit.setWaiState(this.focusNode,"disabled",_50c?"true":"false");
this._set("disabled",_50c);
},_setAccelKeyAttr:function(_50d){
this.accelKeyNode.style.display=_50d?"":"none";
this.accelKeyNode.innerHTML=_50d;
dojo.attr(this.containerNode,"colSpan",_50d?"1":"2");
this._set("accelKey",_50d);
}});
}
if(!dojo._hasResource["dijit.PopupMenuItem"]){
dojo._hasResource["dijit.PopupMenuItem"]=true;
dojo.provide("dijit.PopupMenuItem");
dojo.declare("dijit.PopupMenuItem",dijit.MenuItem,{_fillContent:function(){
if(this.srcNodeRef){
var _50e=dojo.query("*",this.srcNodeRef);
dijit.PopupMenuItem.superclass._fillContent.call(this,_50e[0]);
this.dropDownContainer=this.srcNodeRef;
}
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(!this.popup){
var node=dojo.query("[widgetId]",this.dropDownContainer)[0];
this.popup=dijit.byNode(node);
}
dojo.body().appendChild(this.popup.domNode);
this.popup.startup();
this.popup.domNode.style.display="none";
if(this.arrowWrapper){
dojo.style(this.arrowWrapper,"visibility","");
}
dijit.setWaiState(this.focusNode,"haspopup","true");
},destroyDescendants:function(){
if(this.popup){
if(!this.popup._destroyed){
this.popup.destroyRecursive();
}
delete this.popup;
}
this.inherited(arguments);
}});
}
if(!dojo._hasResource["dijit.CheckedMenuItem"]){
dojo._hasResource["dijit.CheckedMenuItem"]=true;
dojo.provide("dijit.CheckedMenuItem");
dojo.declare("dijit.CheckedMenuItem",dijit.MenuItem,{templateString:dojo.cache("dijit","templates/CheckedMenuItem.html","<tr class=\"dijitReset dijitMenuItem\" dojoAttachPoint=\"focusNode\" role=\"menuitemcheckbox\" tabIndex=\"-1\"\n\t\tdojoAttachEvent=\"onmouseenter:_onHover,onmouseleave:_onUnhover,ondijitclick:_onClick\">\n\t<td class=\"dijitReset dijitMenuItemIconCell\" role=\"presentation\">\n\t\t<img src=\"${_blankGif}\" alt=\"\" class=\"dijitMenuItemIcon dijitCheckedMenuItemIcon\" dojoAttachPoint=\"iconNode\"/>\n\t\t<span class=\"dijitCheckedMenuItemIconChar\">&#10003;</span>\n\t</td>\n\t<td class=\"dijitReset dijitMenuItemLabel\" colspan=\"2\" dojoAttachPoint=\"containerNode,labelNode\"></td>\n\t<td class=\"dijitReset dijitMenuItemAccelKey\" style=\"display: none\" dojoAttachPoint=\"accelKeyNode\"></td>\n\t<td class=\"dijitReset dijitMenuArrowCell\" role=\"presentation\">&nbsp;</td>\n</tr>\n"),checked:false,_setCheckedAttr:function(_50f){
dojo.toggleClass(this.domNode,"dijitCheckedMenuItemChecked",_50f);
dijit.setWaiState(this.domNode,"checked",_50f);
this._set("checked",_50f);
},onChange:function(_510){
},_onClick:function(e){
if(!this.disabled){
this.set("checked",!this.checked);
this.onChange(this.checked);
}
this.inherited(arguments);
}});
}
if(!dojo._hasResource["dijit.MenuSeparator"]){
dojo._hasResource["dijit.MenuSeparator"]=true;
dojo.provide("dijit.MenuSeparator");
dojo.declare("dijit.MenuSeparator",[dijit._Widget,dijit._Templated,dijit._Contained],{templateString:dojo.cache("dijit","templates/MenuSeparator.html","<tr class=\"dijitMenuSeparator\">\n\t<td class=\"dijitMenuSeparatorIconCell\">\n\t\t<div class=\"dijitMenuSeparatorTop\"></div>\n\t\t<div class=\"dijitMenuSeparatorBottom\"></div>\n\t</td>\n\t<td colspan=\"3\" class=\"dijitMenuSeparatorLabelCell\">\n\t\t<div class=\"dijitMenuSeparatorTop dijitMenuSeparatorLabel\"></div>\n\t\t<div class=\"dijitMenuSeparatorBottom\"></div>\n\t</td>\n</tr>\n"),buildRendering:function(){
this.inherited(arguments);
dojo.setSelectable(this.domNode,false);
},isFocusable:function(){
return false;
}});
}
if(!dojo._hasResource["dijit.Menu"]){
dojo._hasResource["dijit.Menu"]=true;
dojo.provide("dijit.Menu");
dojo.declare("dijit._MenuBase",[dijit._Widget,dijit._Templated,dijit._KeyNavContainer],{parentMenu:null,popupDelay:500,startup:function(){
if(this._started){
return;
}
dojo.forEach(this.getChildren(),function(_511){
_511.startup();
});
this.startupKeyNavChildren();
this.inherited(arguments);
},onExecute:function(){
},onCancel:function(_512){
},_moveToPopup:function(evt){
if(this.focusedChild&&this.focusedChild.popup&&!this.focusedChild.disabled){
this.focusedChild._onClick(evt);
}else{
var _513=this._getTopMenu();
if(_513&&_513._isMenuBar){
_513.focusNext();
}
}
},_onPopupHover:function(evt){
if(this.currentPopup&&this.currentPopup._pendingClose_timer){
var _514=this.currentPopup.parentMenu;
if(_514.focusedChild){
_514.focusedChild._setSelected(false);
}
_514.focusedChild=this.currentPopup.from_item;
_514.focusedChild._setSelected(true);
this._stopPendingCloseTimer(this.currentPopup);
}
},onItemHover:function(item){
if(this.isActive){
this.focusChild(item);
if(this.focusedChild.popup&&!this.focusedChild.disabled&&!this.hover_timer){
this.hover_timer=setTimeout(dojo.hitch(this,"_openPopup"),this.popupDelay);
}
}
if(this.focusedChild){
this.focusChild(item);
}
this._hoveredChild=item;
},_onChildBlur:function(item){
this._stopPopupTimer();
item._setSelected(false);
var _515=item.popup;
if(_515){
this._stopPendingCloseTimer(_515);
_515._pendingClose_timer=setTimeout(function(){
_515._pendingClose_timer=null;
if(_515.parentMenu){
_515.parentMenu.currentPopup=null;
}
dijit.popup.close(_515);
},this.popupDelay);
}
},onItemUnhover:function(item){
if(this.isActive){
this._stopPopupTimer();
}
if(this._hoveredChild==item){
this._hoveredChild=null;
}
},_stopPopupTimer:function(){
if(this.hover_timer){
clearTimeout(this.hover_timer);
this.hover_timer=null;
}
},_stopPendingCloseTimer:function(_516){
if(_516._pendingClose_timer){
clearTimeout(_516._pendingClose_timer);
_516._pendingClose_timer=null;
}
},_stopFocusTimer:function(){
if(this._focus_timer){
clearTimeout(this._focus_timer);
this._focus_timer=null;
}
},_getTopMenu:function(){
for(var top=this;top.parentMenu;top=top.parentMenu){
}
return top;
},onItemClick:function(item,evt){
if(typeof this.isShowingNow=="undefined"){
this._markActive();
}
this.focusChild(item);
if(item.disabled){
return false;
}
if(item.popup){
this._openPopup();
}else{
this.onExecute();
item.onClick(evt);
}
},_openPopup:function(){
this._stopPopupTimer();
var _517=this.focusedChild;
if(!_517){
return;
}
var _518=_517.popup;
if(_518.isShowingNow){
return;
}
if(this.currentPopup){
this._stopPendingCloseTimer(this.currentPopup);
dijit.popup.close(this.currentPopup);
}
_518.parentMenu=this;
_518.from_item=_517;
var self=this;
dijit.popup.open({parent:this,popup:_518,around:_517.domNode,orient:this._orient||(this.isLeftToRight()?{"TR":"TL","TL":"TR","BR":"BL","BL":"BR"}:{"TL":"TR","TR":"TL","BL":"BR","BR":"BL"}),onCancel:function(){
self.focusChild(_517);
self._cleanUp();
_517._setSelected(true);
self.focusedChild=_517;
},onExecute:dojo.hitch(this,"_cleanUp")});
this.currentPopup=_518;
_518.connect(_518.domNode,"onmouseenter",dojo.hitch(self,"_onPopupHover"));
if(_518.focus){
_518._focus_timer=setTimeout(dojo.hitch(_518,function(){
this._focus_timer=null;
this.focus();
}),0);
}
},_markActive:function(){
this.isActive=true;
dojo.replaceClass(this.domNode,"dijitMenuActive","dijitMenuPassive");
},onOpen:function(e){
this.isShowingNow=true;
this._markActive();
},_markInactive:function(){
this.isActive=false;
dojo.replaceClass(this.domNode,"dijitMenuPassive","dijitMenuActive");
},onClose:function(){
this._stopFocusTimer();
this._markInactive();
this.isShowingNow=false;
this.parentMenu=null;
},_closeChild:function(){
this._stopPopupTimer();
var _519=this.focusedChild&&this.focusedChild.from_item;
if(this.currentPopup){
if(dijit._curFocus&&dojo.isDescendant(dijit._curFocus,this.currentPopup.domNode)){
this.focusedChild.focusNode.focus();
}
dijit.popup.close(this.currentPopup);
this.currentPopup=null;
}
if(this.focusedChild){
this.focusedChild._setSelected(false);
this.focusedChild._onUnhover();
this.focusedChild=null;
}
},_onItemFocus:function(item){
if(this._hoveredChild&&this._hoveredChild!=item){
this._hoveredChild._onUnhover();
}
},_onBlur:function(){
this._cleanUp();
this.inherited(arguments);
},_cleanUp:function(){
this._closeChild();
if(typeof this.isShowingNow=="undefined"){
this._markInactive();
}
}});
dojo.declare("dijit.Menu",dijit._MenuBase,{constructor:function(){
this._bindings=[];
},templateString:dojo.cache("dijit","templates/Menu.html","<table class=\"dijit dijitMenu dijitMenuPassive dijitReset dijitMenuTable\" role=\"menu\" tabIndex=\"${tabIndex}\" dojoAttachEvent=\"onkeypress:_onKeyPress\" cellspacing=\"0\">\n\t<tbody class=\"dijitReset\" dojoAttachPoint=\"containerNode\"></tbody>\n</table>\n"),baseClass:"dijitMenu",targetNodeIds:[],contextMenuForWindow:false,leftClickToOpen:false,refocus:true,postCreate:function(){
if(this.contextMenuForWindow){
this.bindDomNode(dojo.body());
}else{
dojo.forEach(this.targetNodeIds,this.bindDomNode,this);
}
var k=dojo.keys,l=this.isLeftToRight();
this._openSubMenuKey=l?k.RIGHT_ARROW:k.LEFT_ARROW;
this._closeSubMenuKey=l?k.LEFT_ARROW:k.RIGHT_ARROW;
this.connectKeyNavHandlers([k.UP_ARROW],[k.DOWN_ARROW]);
},_onKeyPress:function(evt){
if(evt.ctrlKey||evt.altKey){
return;
}
switch(evt.charOrCode){
case this._openSubMenuKey:
this._moveToPopup(evt);
dojo.stopEvent(evt);
break;
case this._closeSubMenuKey:
if(this.parentMenu){
if(this.parentMenu._isMenuBar){
this.parentMenu.focusPrev();
}else{
this.onCancel(false);
}
}else{
dojo.stopEvent(evt);
}
break;
}
},_iframeContentWindow:function(_51a){
var win=dojo.window.get(this._iframeContentDocument(_51a))||this._iframeContentDocument(_51a)["__parent__"]||(_51a.name&&dojo.doc.frames[_51a.name])||null;
return win;
},_iframeContentDocument:function(_51b){
var doc=_51b.contentDocument||(_51b.contentWindow&&_51b.contentWindow.document)||(_51b.name&&dojo.doc.frames[_51b.name]&&dojo.doc.frames[_51b.name].document)||null;
return doc;
},bindDomNode:function(node){
node=dojo.byId(node);
var cn;
if(node.tagName.toLowerCase()=="iframe"){
var _51c=node,win=this._iframeContentWindow(_51c);
cn=dojo.withGlobal(win,dojo.body);
}else{
cn=(node==dojo.body()?dojo.doc.documentElement:node);
}
var _51d={node:node,iframe:_51c};
dojo.attr(node,"_dijitMenu"+this.id,this._bindings.push(_51d));
var _51e=dojo.hitch(this,function(cn){
return [dojo.connect(cn,this.leftClickToOpen?"onclick":"oncontextmenu",this,function(evt){
dojo.stopEvent(evt);
this._scheduleOpen(evt.target,_51c,{x:evt.pageX,y:evt.pageY});
}),dojo.connect(cn,"onkeydown",this,function(evt){
if(evt.shiftKey&&evt.keyCode==dojo.keys.F10){
dojo.stopEvent(evt);
this._scheduleOpen(evt.target,_51c);
}
})];
});
_51d.connects=cn?_51e(cn):[];
if(_51c){
_51d.onloadHandler=dojo.hitch(this,function(){
var win=this._iframeContentWindow(_51c);
cn=dojo.withGlobal(win,dojo.body);
_51d.connects=_51e(cn);
});
if(_51c.addEventListener){
_51c.addEventListener("load",_51d.onloadHandler,false);
}else{
_51c.attachEvent("onload",_51d.onloadHandler);
}
}
},unBindDomNode:function(_51f){
var node;
try{
node=dojo.byId(_51f);
}
catch(e){
return;
}
var _520="_dijitMenu"+this.id;
if(node&&dojo.hasAttr(node,_520)){
var bid=dojo.attr(node,_520)-1,b=this._bindings[bid];
dojo.forEach(b.connects,dojo.disconnect);
var _521=b.iframe;
if(_521){
if(_521.removeEventListener){
_521.removeEventListener("load",b.onloadHandler,false);
}else{
_521.detachEvent("onload",b.onloadHandler);
}
}
dojo.removeAttr(node,_520);
delete this._bindings[bid];
}
},_scheduleOpen:function(_522,_523,_524){
if(!this._openTimer){
this._openTimer=setTimeout(dojo.hitch(this,function(){
delete this._openTimer;
this._openMyself({target:_522,iframe:_523,coords:_524});
}),1);
}
},_openMyself:function(args){
var _525=args.target,_526=args.iframe,_527=args.coords;
if(_527){
if(_526){
var od=_525.ownerDocument,ifc=dojo.position(_526,true),win=this._iframeContentWindow(_526),_528=dojo.withGlobal(win,"_docScroll",dojo);
var cs=dojo.getComputedStyle(_526),tp=dojo._toPixelValue,left=(dojo.isIE&&dojo.isQuirks?0:tp(_526,cs.paddingLeft))+(dojo.isIE&&dojo.isQuirks?tp(_526,cs.borderLeftWidth):0),top=(dojo.isIE&&dojo.isQuirks?0:tp(_526,cs.paddingTop))+(dojo.isIE&&dojo.isQuirks?tp(_526,cs.borderTopWidth):0);
_527.x+=ifc.x+left-_528.x;
_527.y+=ifc.y+top-_528.y;
}
}else{
_527=dojo.position(_525,true);
_527.x+=10;
_527.y+=10;
}
var self=this;
var _529=dijit.getFocus(this);
function _52a(){
if(self.refocus){
dijit.focus(_529);
}
dijit.popup.close(self);
};
dijit.popup.open({popup:this,x:_527.x,y:_527.y,onExecute:_52a,onCancel:_52a,orient:this.isLeftToRight()?"L":"R"});
this.focus();
this._onBlur=function(){
this.inherited("_onBlur",arguments);
dijit.popup.close(this);
};
},uninitialize:function(){
dojo.forEach(this._bindings,function(b){
if(b){
this.unBindDomNode(b.node);
}
},this);
this.inherited(arguments);
}});
}
if(!dojo._hasResource["dijit.layout.TabController"]){
dojo._hasResource["dijit.layout.TabController"]=true;
dojo.provide("dijit.layout.TabController");
dojo.declare("dijit.layout.TabController",dijit.layout.StackController,{templateString:"<div role='tablist' dojoAttachEvent='onkeypress:onkeypress'></div>",tabPosition:"top",buttonWidget:"dijit.layout._TabButton",_rectifyRtlTabList:function(){
if(0>=this.tabPosition.indexOf("-h")){
return;
}
if(!this.pane2button){
return;
}
var _52b=0;
for(var pane in this.pane2button){
var ow=this.pane2button[pane].innerDiv.scrollWidth;
_52b=Math.max(_52b,ow);
}
for(pane in this.pane2button){
this.pane2button[pane].innerDiv.style.width=_52b+"px";
}
}});
dojo.declare("dijit.layout._TabButton",dijit.layout._StackButton,{baseClass:"dijitTab",cssStateNodes:{closeNode:"dijitTabCloseButton"},templateString:dojo.cache("dijit.layout","templates/_TabButton.html","<div role=\"presentation\" dojoAttachPoint=\"titleNode\" dojoAttachEvent='onclick:onClick'>\n    <div role=\"presentation\" class='dijitTabInnerDiv' dojoAttachPoint='innerDiv'>\n        <div role=\"presentation\" class='dijitTabContent' dojoAttachPoint='tabContent'>\n        \t<div role=\"presentation\" dojoAttachPoint='focusNode'>\n\t\t        <img src=\"${_blankGif}\" alt=\"\" class=\"dijitIcon dijitTabButtonIcon\" dojoAttachPoint='iconNode' />\n\t\t        <span dojoAttachPoint='containerNode' class='tabLabel'></span>\n\t\t        <span class=\"dijitInline dijitTabCloseButton dijitTabCloseIcon\" dojoAttachPoint='closeNode'\n\t\t        \t\tdojoAttachEvent='onclick: onClickCloseButton' role=\"presentation\">\n\t\t            <span dojoAttachPoint='closeText' class='dijitTabCloseText'>[x]</span\n\t\t        ></span>\n\t\t\t</div>\n        </div>\n    </div>\n</div>\n"),scrollOnFocus:false,buildRendering:function(){
this.inherited(arguments);
dojo.setSelectable(this.containerNode,false);
},startup:function(){
this.inherited(arguments);
var n=this.domNode;
setTimeout(function(){
n.className=n.className;
},1);
},_setCloseButtonAttr:function(disp){
this._set("closeButton",disp);
dojo.toggleClass(this.innerDiv,"dijitClosable",disp);
this.closeNode.style.display=disp?"":"none";
if(disp){
var _52c=dojo.i18n.getLocalization("dijit","common");
if(this.closeNode){
dojo.attr(this.closeNode,"title",_52c.itemClose);
}
var _52c=dojo.i18n.getLocalization("dijit","common");
this._closeMenu=new dijit.Menu({id:this.id+"_Menu",dir:this.dir,lang:this.lang,targetNodeIds:[this.domNode]});
this._closeMenu.addChild(new dijit.MenuItem({label:_52c.itemClose,dir:this.dir,lang:this.lang,onClick:dojo.hitch(this,"onClickCloseButton")}));
}else{
if(this._closeMenu){
this._closeMenu.destroyRecursive();
delete this._closeMenu;
}
}
},_setLabelAttr:function(_52d){
this.inherited(arguments);
if(this.showLabel==false&&!this.params.title){
this.iconNode.alt=dojo.trim(this.containerNode.innerText||this.containerNode.textContent||"");
}
},destroy:function(){
if(this._closeMenu){
this._closeMenu.destroyRecursive();
delete this._closeMenu;
}
this.inherited(arguments);
}});
}
if(!dojo._hasResource["dijit.layout.ScrollingTabController"]){
dojo._hasResource["dijit.layout.ScrollingTabController"]=true;
dojo.provide("dijit.layout.ScrollingTabController");
dojo.declare("dijit.layout.ScrollingTabController",dijit.layout.TabController,{templateString:dojo.cache("dijit.layout","templates/ScrollingTabController.html","<div class=\"dijitTabListContainer-${tabPosition}\" style=\"visibility:hidden\">\n\t<div dojoType=\"dijit.layout._ScrollingTabControllerMenuButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_menuBtn\" containerId=\"${containerId}\" iconClass=\"dijitTabStripMenuIcon\"\n\t\t\tdropDownPosition=\"below-alt, above-alt\"\n\t\t\tdojoAttachPoint=\"_menuBtn\" showLabel=\"false\">&#9660;</div>\n\t<div dojoType=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_leftBtn\" iconClass=\"dijitTabStripSlideLeftIcon\"\n\t\t\tdojoAttachPoint=\"_leftBtn\" dojoAttachEvent=\"onClick: doSlideLeft\" showLabel=\"false\">&#9664;</div>\n\t<div dojoType=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_rightBtn\" iconClass=\"dijitTabStripSlideRightIcon\"\n\t\t\tdojoAttachPoint=\"_rightBtn\" dojoAttachEvent=\"onClick: doSlideRight\" showLabel=\"false\">&#9654;</div>\n\t<div class='dijitTabListWrapper' dojoAttachPoint='tablistWrapper'>\n\t\t<div role='tablist' dojoAttachEvent='onkeypress:onkeypress'\n\t\t\t\tdojoAttachPoint='containerNode' class='nowrapTabStrip'></div>\n\t</div>\n</div>\n"),useMenu:true,useSlider:true,tabStripClass:"",widgetsInTemplate:true,_minScroll:5,attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{"class":"containerNode"}),buildRendering:function(){
this.inherited(arguments);
var n=this.domNode;
this.scrollNode=this.tablistWrapper;
this._initButtons();
if(!this.tabStripClass){
this.tabStripClass="dijitTabContainer"+this.tabPosition.charAt(0).toUpperCase()+this.tabPosition.substr(1).replace(/-.*/,"")+"None";
dojo.addClass(n,"tabStrip-disabled");
}
dojo.addClass(this.tablistWrapper,this.tabStripClass);
},onStartup:function(){
this.inherited(arguments);
dojo.style(this.domNode,"visibility","visible");
this._postStartup=true;
},onAddChild:function(page,_52e){
this.inherited(arguments);
dojo.forEach(["label","iconClass"],function(attr){
this.pane2watches[page.id].push(this.pane2button[page.id].watch(attr,dojo.hitch(this,function(name,_52f,_530){
if(this._postStartup&&this._dim){
this.resize(this._dim);
}
})));
},this);
dojo.style(this.containerNode,"width",(dojo.style(this.containerNode,"width")+200)+"px");
},onRemoveChild:function(page,_531){
var _532=this.pane2button[page.id];
if(this._selectedTab===_532.domNode){
this._selectedTab=null;
}
this.inherited(arguments);
},_initButtons:function(){
this._btnWidth=0;
this._buttons=dojo.query("> .tabStripButton",this.domNode).filter(function(btn){
if((this.useMenu&&btn==this._menuBtn.domNode)||(this.useSlider&&(btn==this._rightBtn.domNode||btn==this._leftBtn.domNode))){
this._btnWidth+=dojo._getMarginSize(btn).w;
return true;
}else{
dojo.style(btn,"display","none");
return false;
}
},this);
},_getTabsWidth:function(){
var _533=this.getChildren();
if(_533.length){
var _534=_533[this.isLeftToRight()?0:_533.length-1].domNode,_535=_533[this.isLeftToRight()?_533.length-1:0].domNode;
return _535.offsetLeft+dojo.style(_535,"width")-_534.offsetLeft;
}else{
return 0;
}
},_enableBtn:function(_536){
var _537=this._getTabsWidth();
_536=_536||dojo.style(this.scrollNode,"width");
return _537>0&&_536<_537;
},resize:function(dim){
if(this.domNode.offsetWidth==0){
return;
}
this._dim=dim;
this.scrollNode.style.height="auto";
this._contentBox=dijit.layout.marginBox2contentBox(this.domNode,{h:0,w:dim.w});
this._contentBox.h=this.scrollNode.offsetHeight;
dojo.contentBox(this.domNode,this._contentBox);
var _538=this._enableBtn(this._contentBox.w);
this._buttons.style("display",_538?"":"none");
this._leftBtn.layoutAlign="left";
this._rightBtn.layoutAlign="right";
this._menuBtn.layoutAlign=this.isLeftToRight()?"right":"left";
dijit.layout.layoutChildren(this.domNode,this._contentBox,[this._menuBtn,this._leftBtn,this._rightBtn,{domNode:this.scrollNode,layoutAlign:"client"}]);
if(this._selectedTab){
if(this._anim&&this._anim.status()=="playing"){
this._anim.stop();
}
var w=this.scrollNode,sl=this._convertToScrollLeft(this._getScrollForSelectedTab());
w.scrollLeft=sl;
}
this._setButtonClass(this._getScroll());
this._postResize=true;
return {h:this._contentBox.h,w:dim.w};
},_getScroll:function(){
var sl=(this.isLeftToRight()||dojo.isIE<8||(dojo.isIE&&dojo.isQuirks)||dojo.isWebKit)?this.scrollNode.scrollLeft:dojo.style(this.containerNode,"width")-dojo.style(this.scrollNode,"width")+(dojo.isIE==8?-1:1)*this.scrollNode.scrollLeft;
return sl;
},_convertToScrollLeft:function(val){
if(this.isLeftToRight()||dojo.isIE<8||(dojo.isIE&&dojo.isQuirks)||dojo.isWebKit){
return val;
}else{
var _539=dojo.style(this.containerNode,"width")-dojo.style(this.scrollNode,"width");
return (dojo.isIE==8?-1:1)*(val-_539);
}
},onSelectChild:function(page){
var tab=this.pane2button[page.id];
if(!tab||!page){
return;
}
var node=tab.domNode;
if(this._postResize&&node!=this._selectedTab){
this._selectedTab=node;
var sl=this._getScroll();
if(sl>node.offsetLeft||sl+dojo.style(this.scrollNode,"width")<node.offsetLeft+dojo.style(node,"width")){
this.createSmoothScroll().play();
}
}
this.inherited(arguments);
},_getScrollBounds:function(){
var _53a=this.getChildren(),_53b=dojo.style(this.scrollNode,"width"),_53c=dojo.style(this.containerNode,"width"),_53d=_53c-_53b,_53e=this._getTabsWidth();
if(_53a.length&&_53e>_53b){
return {min:this.isLeftToRight()?0:_53a[_53a.length-1].domNode.offsetLeft,max:this.isLeftToRight()?(_53a[_53a.length-1].domNode.offsetLeft+dojo.style(_53a[_53a.length-1].domNode,"width"))-_53b:_53d};
}else{
var _53f=this.isLeftToRight()?0:_53d;
return {min:_53f,max:_53f};
}
},_getScrollForSelectedTab:function(){
var w=this.scrollNode,n=this._selectedTab,_540=dojo.style(this.scrollNode,"width"),_541=this._getScrollBounds();
var pos=(n.offsetLeft+dojo.style(n,"width")/2)-_540/2;
pos=Math.min(Math.max(pos,_541.min),_541.max);
return pos;
},createSmoothScroll:function(x){
if(arguments.length>0){
var _542=this._getScrollBounds();
x=Math.min(Math.max(x,_542.min),_542.max);
}else{
x=this._getScrollForSelectedTab();
}
if(this._anim&&this._anim.status()=="playing"){
this._anim.stop();
}
var self=this,w=this.scrollNode,anim=new dojo._Animation({beforeBegin:function(){
if(this.curve){
delete this.curve;
}
var oldS=w.scrollLeft,newS=self._convertToScrollLeft(x);
anim.curve=new dojo._Line(oldS,newS);
},onAnimate:function(val){
w.scrollLeft=val;
}});
this._anim=anim;
this._setButtonClass(x);
return anim;
},_getBtnNode:function(e){
var n=e.target;
while(n&&!dojo.hasClass(n,"tabStripButton")){
n=n.parentNode;
}
return n;
},doSlideRight:function(e){
this.doSlide(1,this._getBtnNode(e));
},doSlideLeft:function(e){
this.doSlide(-1,this._getBtnNode(e));
},doSlide:function(_543,node){
if(node&&dojo.hasClass(node,"dijitTabDisabled")){
return;
}
var _544=dojo.style(this.scrollNode,"width");
var d=(_544*0.75)*_543;
var to=this._getScroll()+d;
this._setButtonClass(to);
this.createSmoothScroll(to).play();
},_setButtonClass:function(_545){
var _546=this._getScrollBounds();
this._leftBtn.set("disabled",_545<=_546.min);
this._rightBtn.set("disabled",_545>=_546.max);
}});
dojo.declare("dijit.layout._ScrollingTabControllerButtonMixin",null,{baseClass:"dijitTab tabStripButton",templateString:dojo.cache("dijit.layout","templates/_ScrollingTabControllerButton.html","<div dojoAttachEvent=\"onclick:_onButtonClick\">\n\t<div role=\"presentation\" class=\"dijitTabInnerDiv\" dojoattachpoint=\"innerDiv,focusNode\">\n\t\t<div role=\"presentation\" class=\"dijitTabContent dijitButtonContents\" dojoattachpoint=\"tabContent\">\n\t\t\t<img role=\"presentation\" alt=\"\" src=\"${_blankGif}\" class=\"dijitTabStripIcon\" dojoAttachPoint=\"iconNode\"/>\n\t\t\t<span dojoAttachPoint=\"containerNode,titleNode\" class=\"dijitButtonText\"></span>\n\t\t</div>\n\t</div>\n</div>\n"),tabIndex:"",isFocusable:function(){
return false;
}});
dojo.declare("dijit.layout._ScrollingTabControllerButton",[dijit.form.Button,dijit.layout._ScrollingTabControllerButtonMixin]);
dojo.declare("dijit.layout._ScrollingTabControllerMenuButton",[dijit.form.Button,dijit._HasDropDown,dijit.layout._ScrollingTabControllerButtonMixin],{containerId:"",tabIndex:"-1",isLoaded:function(){
return false;
},loadDropDown:function(_547){
this.dropDown=new dijit.Menu({id:this.containerId+"_menu",dir:this.dir,lang:this.lang});
var _548=dijit.byId(this.containerId);
dojo.forEach(_548.getChildren(),function(page){
var _549=new dijit.MenuItem({id:page.id+"_stcMi",label:page.title,iconClass:page.iconClass,dir:page.dir,lang:page.lang,onClick:function(){
_548.selectChild(page);
}});
this.dropDown.addChild(_549);
},this);
_547();
},closeDropDown:function(_54a){
this.inherited(arguments);
if(this.dropDown){
this.dropDown.destroyRecursive();
delete this.dropDown;
}
}});
}
if(!dojo._hasResource["dijit.layout.TabContainer"]){
dojo._hasResource["dijit.layout.TabContainer"]=true;
dojo.provide("dijit.layout.TabContainer");
dojo.declare("dijit.layout.TabContainer",dijit.layout._TabContainerBase,{useMenu:true,useSlider:true,controllerWidget:"",_makeController:function(_54b){
var cls=this.baseClass+"-tabs"+(this.doLayout?"":" dijitTabNoLayout"),_54c=dojo.getObject(this.controllerWidget);
return new _54c({id:this.id+"_tablist",dir:this.dir,lang:this.lang,tabPosition:this.tabPosition,doLayout:this.doLayout,containerId:this.id,"class":cls,nested:this.nested,useMenu:this.useMenu,useSlider:this.useSlider,tabStripClass:this.tabStrip?this.baseClass+(this.tabStrip?"":"No")+"Strip":null},_54b);
},postMixInProperties:function(){
this.inherited(arguments);
if(!this.controllerWidget){
this.controllerWidget=(this.tabPosition=="top"||this.tabPosition=="bottom")&&!this.nested?"dijit.layout.ScrollingTabController":"dijit.layout.TabController";
}
}});
}
dojo.i18n._preloadLocalizations("dojo.nls.jbrowse_dojo",["ROOT","ar","ca","cs","da","de","de-de","el","en","en-gb","en-us","es","es-es","fi","fi-fi","fr","fr-fr","he","he-il","hu","it","it-it","ja","ja-jp","ko","ko-kr","nb","nl","nl-nl","pl","pt","pt-br","pt-pt","ru","sk","sl","sv","th","tr","xx","zh","zh-cn","zh-tw"]);
