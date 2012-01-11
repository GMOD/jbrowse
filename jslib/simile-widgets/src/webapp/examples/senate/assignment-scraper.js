// to be run against http://www.senate.gov/general/committee_assignments/assignments.htm

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
var rdfs = 'http://www.w3.org/2000/01/rdf-schema#';
var dc = 'http://purl.org/dc/elements/1.1/';
var foaf = 'http://xmlns.com/foaf/0.1/';
var sns = 'http://simile.mit.edu/2007/05/senate-ns#';
var sd = 'http://simile.mit.edu/2007/05/senate#';

var namespace = document.documentElement.namespaceURI;
var nsResolver = namespace ? function(prefix) {
  return (prefix == 'x') ? namespace : null;
} : null;

var getNode = function(document, contextNode, xpath, nsResolver) {
  return document.evaluate(xpath, contextNode, nsResolver, XPathResult.ANY_TYPE,null).iterateNext();
}

var cleanString = function(s) {
  return utilities.trimString(s);
}

var i = 1;
var xpath = '//div[@id="contentArea"]/table[@class="contenttext"]/tbody/tr/td[1]/table/tbody/tr[3]/td[2][@class="contenttext"]/table/tbody/tr[count(td)=2]';
var elements = utilities.gatherElementsOnXPath(document, document, xpath, nsResolver);
for each (var element in elements) {  
  var uri = sd + 'senator' + i;
  
  data.addStatement(uri, rdf + 'type', sns + 'Senator', false);
   
  try {
    data.addStatement(uri, rdfs + 'label', function(input) {
      var fidx = input.indexOf(',');
      var lidx = input.lastIndexOf(',');
      if (fidx == lidx)
        output = input.substring(fidx+2) + " " + input.substring(0, fidx);
      else
        output = input.substring(fidx+2, lidx) + " " + input.substring(0, fidx) + ", " + input.substring(lidx+2);
      return output;
    }(getNode(document, element, './TD[1]/SPAN[1]/A[1]/text()[1]', nsResolver).nodeValue), true);
  } catch (e) { log(e); }
  
  try {
    data.addStatement(uri, foaf + 'familyName', function(input) {
      var fidx = input.indexOf(',');
      output = input.substring(0, fidx);
      return output;
    }(getNode(document, element, './TD[1]/SPAN[1]/A[1]/text()[1]', nsResolver).nodeValue), true);
  } catch (e) { log(e); }

  try {
    data.addStatement(uri, foaf + 'givenName', function(input) {
      var fidx = input.indexOf(',');
      var lidx = input.lastIndexOf(',');
      if (fidx == lidx)
        output = input.substring(fidx+2);
      else
        output = input.substring(fidx+2, lidx);
      return output;
    }(getNode(document, element, './TD[1]/SPAN[1]/A[1]/text()[1]', nsResolver).nodeValue), true);
  } catch (e) { log(e); }


  try {
    data.addStatement(uri, foaf + 'homepage', function(input) {
      var idx = input.indexOf('\'');
      output = input.substring(idx+1,input.length-3);
      return output;
    }(getNode(document, element, './TD[1]/SPAN[1]/A[1]', nsResolver).href), true);
  } catch (e) { log(e); }

  try {
    var state = function(input) {
      var idx = input.indexOf('-');
      output = input.substr(idx+1,2);
      return output;
    }(getNode(document, element, './TD[1]/SPAN[2]/text()[1]', nsResolver).nodeValue);
    data.addStatement(uri, sns + 'state', state, true); 
    data.addStatement(uri, sns + 'stateLatLng', stateLookup(state), true);
  } catch (e) { log(e); }

  try {
    data.addStatement(uri, sns + 'party', function(input) {
      var idx = input.indexOf('-');
      output = input.substring(2,idx);
      return output;
    }(getNode(document, element, './TD[1]/SPAN[2]/text()[1]', nsResolver).nodeValue), true);
  } catch (e) { log(e); }

  var committees = utilities.gatherElementsOnXPath(document, element, './TD[2]/SPAN', nsResolver);
  for each (var committee in committees) {
    var curi = cleanString(getNode(document, committee, './A', nsResolver).href);
    data.addStatement(uri, sns + 'committeeMember', curi, false);
    data.addStatement(curi, rdf + 'type', sns + 'Committee', false);
    data.addStatement(curi, sns + 'hasMember', uri, false);
    try {
      data.addStatement(curi, rdfs + 'label', cleanString(getNode(document, committee, './A/text()[1]', nsResolver).nodeValue), true);
    } catch (e) { log(e); }
  }
  
  i++;
}

function stateLookup(state) {
  var ll;
  switch(state) {
  case 'AK':
	ll = '58.301944,-134.419722';
	break;
  case 'AL':
	ll = '32.352704,-86.260228';
	break;
  case 'AR':
	ll = '34.728334,-92.361401';
	break;
  case 'AZ':
	ll = '33.547704,-112.074063';
	break;
  case 'CA':
	ll = '38.561787,-121.436583';
	break;
  case 'CO':
	ll = '39.725024,-104.945061';
	break;
  case 'CT':
	ll = '41.765867,-72.685175';
	break;
  case 'DE':
	ll = '39.160804,-75.539025';
	break;
  case 'FL':
	ll = '30.468455,-84.266335';
	break;
  case 'GA':
	ll = '33.774215,-84.427846';
	break;
  case 'HI':
	ll = '21.390551,-157.919177';
	break;
  case 'IA':
	ll = '41.592129,-93.615203';
	break;
  case 'ID':
	ll = '43.603854,-116.23404';
	break;
  case 'IL':
	ll = '39.783356,-89.651944';
	break;
  case 'IN':
	ll = '39.798881,-86.138501';
	break;
  case 'KS':
	ll = '39.038988,-95.708156';
	break;
  case 'KY':
	ll = '38.210509,-84.875859';
	break;
  case 'LA':
	ll = '30.439688,-91.099496';
	break;
  case 'MA':
	ll = '42.321035,-71.090999';
	break;
  case 'MD':
	ll = '38.987359,-76.503978';
	break;
  case 'ME':
	ll = '44.347103,-69.756133';
	break;
  case 'MI':
	ll = '42.714798,-84.551712';
	break;
  case 'MN':
	ll = '45.007404,-93.104992';
	break;
  case 'MO':
	ll = '38.59869,-92.167326';
	break;
  case 'MS':
	ll = '32.323264,-90.214811';
	break;
  case 'MT':
	ll = '46.592778,-112.035278';
	break;
  case 'NC':
	ll = '35.826542,-78.646372';
	break;
  case 'ND':
	ll = '46.823789,-100.762014';
	break;
  case 'NE':
	ll = '40.803157,-96.677313';
	break;
  case 'NH':
	ll = '43.241756,-71.569744';
	break;
  case 'NJ':
	ll = '40.234385,-74.715664';
	break;
  case 'NM':
	ll = '35.684954,-105.993856';
	break;
  case 'NV':
	ll = '39.16593,-119.762375';
	break;
  case 'NY':
	ll = '40.714167,-74.006389';
	break;
  case 'OH':
	ll = '40.00218,-82.988826';
	break;
  case 'OK':
	ll = '35.498394,-97.513292';
	break;
  case 'OR':
	ll = '44.980957,-123.103183';
	break;
  case 'PA':
	ll = '40.296156,-76.824793';
	break;
  case 'RI':
	ll = '41.827309,-71.422653';
	break;
  case 'SC':
	ll = '34.052298,-80.978488';
	break;
  case 'SD':
	ll = '44.369514,-100.321057';
	break;
  case 'TN':
	ll = '36.145046,-86.756604';
	break;
  case 'TX':
	ll = '30.302137,-97.782301';
	break;
  case 'UT':
	ll = '40.697046,-111.89946';
	break;
  case 'VA':
	ll = '37.585241,-77.497343';
	break;
  case 'VT':
	ll = '44.26,-72.575833';
	break;
  case 'WA':
	ll = '47.028357,-122.898076';
	break;
  case 'WI':
	ll = '43.070762,-89.395286';
	break;
  case 'WV':
	ll = '38.378003,-81.647401';
	break;
  case 'WY':
	ll = '41.133333,-104.816667';
	break;
  default:
	ll = '0,0';
  }
  return ll;
}