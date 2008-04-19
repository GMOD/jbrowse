if(!dojo._hasResource["dojox.validate.isbn"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.validate.isbn"] = true;
dojo.provide("dojox.validate.isbn");

dojox.validate.isValidIsbn = function(/* String */value) {
	// summary: Vadlidate ISBN-10 or ISBN-13 based on the length of value
	// returns: Boolean
	var len, sum, weight;
	if(typeof value!='string'){
		value = String(value);
	}
	value = value.replace(/[- ]/g,''); //ignore dashes and whitespaces
	len = value.length;
	sum = 0;
	if(len == 10){
		weight = 10;
		// ISBN-10 validation algorithm
		for(var i = 0; i< 9; i++){
			sum += parseInt(value.charAt(i)) * weight;
			weight --;
		}
		var t = value.charAt(9).toUpperCase();
		sum += t == 'X' ? 10 : parseInt(t);
		return sum % 11 == 0;
	}else if(len == 13) {
		weight = -1;
		for(var i=0; i< len; i++){
			sum += parseInt(value.charAt(i)) * (2 + weight);
			weight *= -1;
		}
		return sum % 10 == 0;
	}else{
		return false;
	}
}

}
