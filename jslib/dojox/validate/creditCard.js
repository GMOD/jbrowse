if(!dojo._hasResource["dojox.validate.creditCard"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.validate.creditCard"] = true;
dojo.provide("dojox.validate.creditCard");

dojo.require("dojox.validate._base");

/*
	Validates Credit Cards using account number rules in conjunction with the Luhn algorigthm
	
 */

dojox.validate.isValidCreditCard = function(/*String|Int*/value, /*String*/ccType){
	//Summary:
	//  checks if ccType matches the # scheme in value, and if Luhn checksum is accurate (unless its an Enroute card, the checkSum is skipped)
	
	//Value: Boolean
	return ((ccType.toLowerCase() == 'er' || dojox.validate.isValidLuhn(value)) &&
			dojox.validate.isValidCreditCardNumber(value,ccType.toLowerCase())); //Boolean
}

dojox.validate.isValidCreditCardNumber = function(/*String|Int*/value,/*String?*/ccType){
	// summary:
	//  checks if value matches the pattern for that card or any card types if none is specified
	//
	// value: Boolean
	// CC #, white spaces and dashes are ignored
	//
	// ccType: String?
	// one of the values in cardinfo -- if Omitted it it returns a | delimited string of matching card types, or false if no matches found

	value = String(value).replace(/[- ]/g,''); //ignore dashes and whitespaces

	/* 	FIXME: not sure on all the abbreviations for credit cards,below is what each stands for atleast to my knowledge
		mc: Mastercard
		ec: Eurocard
		vi: Visa
		ax: American Express
		dc: Diners Club
		bl: Carte Blanch
		di: Discover
		jcb: JCB
		er: Enroute
	 */
	var cardinfo = {
		'mc':'5[1-5][0-9]{14}','ec':'5[1-5][0-9]{14}','vi':'4(?:[0-9]{12}|[0-9]{15})',
		'ax':'3[47][0-9]{13}', 'dc':'3(?:0[0-5][0-9]{11}|[68][0-9]{12})',
		'bl':'3(?:0[0-5][0-9]{11}|[68][0-9]{12})','di':'6011[0-9]{12}',
		'jcb':'(?:3[0-9]{15}|(2131|1800)[0-9]{11})','er':'2(?:014|149)[0-9]{11}'
	};
	if(ccType){
		var expr = cardinfo[ccType.toLowerCase()];
		return expr ? !!(value.match(cardinfo[ccType.toLowerCase()])) : false; // boolean
	}
	var results=[];
	for(var p in cardinfo){
		if(value.match('^'+cardinfo[p]+'$')){
			results.push(p);
		}
	}
	return results.length ? results.join('|') : false; // string | boolean
}

dojox.validate.isValidCvv = function(/*String|Int*/value, /*String*/ccType) {
	//Summary:
	//  returns true if the security code (CCV) matches the correct format for supplied ccType
	
	//Value: Boolean
	
	if(typeof value!='string'){
		value=String(value);
	}
	var format;
	switch (ccType.toLowerCase()){
		case 'mc':
		case 'ec':
		case 'vi':
		case 'di':
			format = '###';
			break;
		case 'ax':
			format = '####';
			break;
		default:
			return false; //Boolean
	}
	var flags = {format:format};
	//FIXME? Why does isNumberFormat take an object for flags when its only parameter is either a string or an array inside the object?
	//FIXME: um... just check value.length?
	return (value.length == format.length && dojox.validate.isNumberFormat(value, flags)); //Boolean
}

}
