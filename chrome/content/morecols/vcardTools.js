// Why is not used the native thundebird support to convert cards <--> vCard?
// Because it's not complete, with it some fields are lost

var moreColsPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
var tbGeneratedVcard;

var vcardToolsGlobals = {
	strBundleService : Components.classes["@mozilla.org/intl/stringbundle;1"].getService	
(Components.interfaces.nsIStringBundleService),

	charDefaultExport : "",
	charDefaultImport: "",
	needUserHelp : true,

	getMultipleValue : function(card, property, mylinevalue) {
		var sep = moreColsPrefs.getCharPref("morecols.contact.fields_separator");
		var oldValue =  card.getProperty(property, "");
		var retValue;
		if (oldValue)
			var retValue = oldValue + sep + " " + mylinevalue;
		else
			var retValue = mylinevalue;
		return retValue;
	},

	setMultipleValueElement : function(el, mylinevalue) {
		var sep = moreColsPrefs.getCharPref("morecols.contact.fields_separator");
		if (el.value.length > 0)
			el.value +=  sep + " " + mylinevalue;
		else
			el.value = mylinevalue;
	},
	
	// Regexp to test the lines of the vcard (some of them are not used)
	// From 0.5.4.2 version, new regexps to match also "grouping" fields	

	begin : new RegExp(/^BEGIN/),
	version : new RegExp(/^VERSION/),
	names : new RegExp(/^N/),
	fname : new RegExp(/^FN/),
	nickname : new RegExp(/^NICKNAME/),
	org : new RegExp(/^(.+\.)?ORG/),
	telhome : new RegExp(/^(.+\.)?TEL.*HOME/),
	telcell : new RegExp(/^(.+\.)?TEL.*CELL/),
	telfax : new RegExp(/^(.+\.)?TEL.*FAX/),
	pager : new RegExp(/^(.+\.)?TEL.*PAGER/),
	telwork : new RegExp(/^(.+\.)?TEL.*WORK/),
	telgeneric : new RegExp(/^(.+\.)?TEL.*/),
	adrhome : new RegExp(/^(.+\.)?(ADR|LABEL).*HOME/),
	adrwork : new RegExp(/^(.+\.)?(ADR|LABEL).*WORK/),
	adr : new RegExp(/^(.+\.)?(ADR|LABEL).*/),
	urlhome : new RegExp(/^(.+\.)?URL.*HOME/),
	urlwork : new RegExp(/^(.+\.)?URL.*WORK/),
	emailpref : new RegExp(/^(.+\.)?EMAIL.*PREF/),
	email : new RegExp(/^(.+\.)?EMAIL/),
	title : new RegExp(/^(.+\.)?TITLE/),
	bday : new RegExp(/^(.+\.)?BDAY/),
	categories : new RegExp(/^(.+\.)?CATEGORIES/),
	notes : new RegExp(/^(.+\.)?NOTE/),
	photo : new RegExp(/^(.+\.)?PHOTO/),
	end : new RegExp(/^END/)
};	
	
vcardToolsGlobals.bundle = vcardToolsGlobals.strBundleService.createBundle("chrome://morecols/locale/morecols.properties");

function GetSelectedContacts(alsoLists) {
	var start = new Object();
	var end = new Object();
	var cardslist = [];
	var index = 0;
	var card;
	var treeSelection = gAbView.selection;
	var numRanges = treeSelection.getRangeCount();

	for (var t=0; t<numRanges; t++) {
		treeSelection.getRangeAt(t,start,end);
		for (var v=start.value; v<=end.value; v++) {
			card = gAbView.getCardFromRow(v);
			if (! card.isMailList || alsoLists) {
				cardslist[index] = card;
				index++;
			}
		}
	}

	return cardslist;
}

function exportAddressbookAsVCF(addrBook,ipodFormat,file) {
	if (! addrBook) {
		var getSelDir = GetSelectedDirectory();
		addrBook = GetDirectoryFromURI(getSelDir);
		var addrName = addrBook.dirName;
		var filename= normalizeFileName(addrName);
		filename=filename+".vcf";
		file = getFileFromFilePicker(vcardToolsGlobals.bundle.GetStringFromName("expcard"),"Save","*vcf", filename);
		if (! file)
			return;
	}
	else {
		var filename= normalizeFileName(addrBook.dirName);
		filename=filename+".vcf";
		file.append(filename);
		file.createUnique(0,0644);
	}
	/*filename= normalizeFileName(addrName);
	filename=filename+".vcf";*/
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]	
		.createInstance(Components.interfaces.nsIFileOutputStream);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
        		  .createInstance(Components.interfaces.nsIConverterOutputStream);
	os.init(foStream, vcardToolsGlobals.charDefaultExport, 0, 0x0000);
	var cards = addrBook.childCards;
	var arr = []
	// In TB3 cards is a nsISimpleEnumerator
	while (cards.hasMoreElements()) {
		var next = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
		if (! next.isMailList) {
			arr.push(next);
		}
	}
	var exported = 0;
	var total = arr.length;
	write(arr[0]);
	
	function write(card) {
		var card = arr[0];
		if (card) {
			var vcard = MFFABcard2vcard(card,ipodFormat);
			os.writeString(vcard);
			exported++;
			MFFAButils.progressMeter(exported,total);
			arr.shift();
			setTimeout(function() {write(arr[0]);}, 10);
		}
		else {
			os.close();
			foStream.close();
			MFFAButils.progressMeter(null,null);				
		}
	}
}

function exportVCF(isAddrBook,write,ipodFormat) {
	var filename;
	// If the "write" flag is false, we must just send the vCard
	if (! write) {
		var selcards = GetSelectedContacts(false);
		sendCardAsAttach(selcards);
		return;
	}

	if (! isAddrBook) {
		var file = getFileFromFilePicker(vcardToolsGlobals.bundle.GetStringFromName("expcard"),"GetFolder","all",null);
		if (! file)
			return;
	}
		
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]	
		.createInstance(Components.interfaces.nsIFileOutputStream);

	if (moreColsPrefs.getBoolPref("morecols.export.always_use_quotedprintable") ||
	    moreColsPrefs.getBoolPref("morecols.export.always_use_quotedprintable_utf8") )
		vcardToolsGlobals.charDefaultExport = "UTF-8";
	else
		vcardToolsGlobals.charDefaultExport = moreColsPrefs.getCharPref("morecols.vcard_export_charset");

	if (isAddrBook) {
		 exportAddressbookAsVCF(null,ipodFormat,null);
	}
	else {
		// Since this operation can be slow, it must be performed before writing
		var vcardsarray = new Array;
		var selcards = GetSelectedContacts(true);
		for (var i=0; i<selcards.length; i++) {
			if (selcards[i].isMailList)
				vcardsarray[i] = "";
			else
				vcardsarray[i] = MFFABcard2vcard(selcards[i]);
		}
		var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
			.createInstance(Components.interfaces.nsIConverterOutputStream);
		var len = vcardsarray.length;

		for (var i=0; i<len; i++) {
			var clone = file.clone();
			var card = selcards[i];
			if (card.isMailList) {
				var uri = card.mailListURI;
				var addrBook = GetDirectoryFromURI(uri);
				exportAddressbookAsVCF(addrBook,ipodFormat,file)
			}
			else {
				var vcard = vcardsarray[i];
				var filename =  getFilenameByCard(card);
				var newfilename = findGoodName(filename,clone,".vcf");
				clone.append(newfilename);
				foStream.init(clone, 0x02 | 0x08 | 0x20, 0664, 0);
				os.init(foStream, vcardToolsGlobals.charDefaultExport, 0, 0x0000);
				os.writeString(vcard);
				os.close();
				foStream.close();
				MFFAButils.progressMeter(i+1, len);
			}
		}
		MFFAButils.progressMeter(null, null);
	}
}

function sendCardAsAttach(cards) {
	var MsgAttachmentComponent = Components.classes["@mozilla.org/messengercompose/attachment;1"];
        var MsgAttachment = MsgAttachmentComponent.createInstance(Components.interfaces.nsIMsgAttachment);
        var MsgCompFieldsComponent = Components.classes["@mozilla.org/messengercompose/composefields;1"];
        var MsgCompFields = MsgCompFieldsComponent.createInstance(Components.interfaces.nsIMsgCompFields);
	
	// TB 3.1 has many bugs in displaying inline attachments with the vcard content/type,
	// so it can be better to send them as unknown type (application/octet-stream)
	if (moreColsPrefs.getBoolPref("morecols.vcard_send.octet_stream_type"))
		var contentType = "application/octet-stream";
	else
		var contentType = "text/x-vcard";

	if (moreColsPrefs.getBoolPref("morecols.export.always_use_quotedprintable") ||
	    moreColsPrefs.getBoolPref("morecols.export.always_use_quotedprintable_utf8") )
		vcardToolsGlobals.charDefaultExport = "UTF-8";
	else
		vcardToolsGlobals.charDefaultExport = moreColsPrefs.getCharPref("morecols.vcard_export_charset");

	var list=[];
	// Get the vCard code
	for (var i=0;i<cards.length;i++) {
		var card = cards[i];
		var attachBody = MFFABcard2vcard(card,false);
		var filename =  card.getProperty("DisplayName", "") ?  card.getProperty("DisplayName", "") : card.getProperty("PrimaryEmail", "");
		if (filename != "")  
			// To avoid encoding problems with the attachment name, it's forced to ascii chars only
			filename =  filename.replace(/\W/g, "_") + ".vcf";
		else
			filename = "unknown.vcf";
		// Create the attachment and open the compose window 
		MsgAttachmentComponent = Components.classes["@mozilla.org/messengercompose/attachment;1"];
		MsgAttachment = MsgAttachmentComponent.createInstance(Components.interfaces.nsIMsgAttachment);
		MsgAttachment.name = filename;
		var vCardAttach = "data:"+contentType+";CHARSET=UTF-8,"+ encodeURIComponent(attachBody);
		MsgAttachment.url = vCardAttach;
		list[i] = MsgAttachment;
	}

	for (var j=0;j<list.length;j++) 
		MsgCompFields.addAttachment(list[j]);

	var MsgComposeParamsComponent = Components.classes["@mozilla.org/messengercompose/composeparams;1"];
	var MsgComposeParams = MsgComposeParamsComponent
		.createInstance(Components.interfaces.nsIMsgComposeParams);
	MsgComposeParams.composeFields = MsgCompFields;
	var MsgCompFormat = Components.interfaces.nsIMsgCompFormat;
	var MsgCompType = Components.interfaces.nsIMsgCompType;
	MsgComposeParams.type = MsgCompType.New;
	var MsgComposeServiceComponent = Components.classes["@mozilla.org/messengercompose;1"];
	var MsgComposeService = MsgComposeServiceComponent.getService().QueryInterface(Components.interfaces.nsIMsgComposeService);
	setTimeout(function() {MsgComposeService.OpenComposeWindowWithParams(null, MsgComposeParams);}, 500*j);
}

// Function to open a vcard with the new card dialog
// If you open a vcf with multiple vcards inside, you'll open just the first one
function openVcard(selectedAB) {
	var file = getFileFromFilePicker(vcardToolsGlobals.bundle.GetStringFromName("impcont"),"Open","*vcf",null);
	if (! file)
		return;
	var lines = fillFromVcard(file,false);
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	// Open the new card dialog, we pass the nsifile to the new window
	var cardDialog = window.openDialog("chrome://messenger/content/addressbook/abNewCardDialog.xul", "", "chrome,resizable=no,titlebar,centerscreen",{selectedAB:selectedAB},file);
	// After a short delay, we fill the dialog with the data read from the vcf file
	setTimeout(function() {
		cardDialog.document.getElementById("listTopIcon").hidden = true;
		cardDialog.document.getElementById("abListTab").hidden = true;
		vcard2editWindow(cardDialog,lines,false,false);
	}, 1000);
}

// Fill the new card dialog with the data of the vcf file
function fillFromVcard(file,isCmdLine) {
	var i = 0;
	// Open the nsifile
	var streamObject = openStreamForVcard(file);	
	var lineData = {}, lines = [], hasmore;
	do {
		var stream = streamObject.firstStream;
		hasmore = stream.readLine(lineData);
		var line = lineData.value;
		lines[i]  = line;
		if ( vcardToolsGlobals.end.test(line.toUpperCase()))
			break;
		i++;
	} while(hasmore);
	streamObject.firstStream.close();
	if (streamObject.secondStream)
		streamObject.secondStream.close();
	if (isCmdLine)
		vcard2editWindow(null,lines, false, isCmdLine);
	return lines;
}

function vcard2editWindow(win,lines,forceUTF8,isCmdLine) {
try {	

	if (win)
		var doc = win.document;
	else
		var doc = document;
	vcardToolsGlobals.charDefaultImport= "";
	var charset =  moreColsPrefs.getCharPref("morecols.vcard_import_charset");
	vcardToolsGlobals.needUserHelp = (charset == "none"); 
	
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	// Variables needed to fill the email fields
	var myline = "";
	var myfirstemail = "";
	var otherEmails = [];

	var mylinetemp="";
	var mylinevalue_escaped;
	var is30 = false;
	var is40 = false;
	var photo = false;
	tbGeneratedVcard = false;
	
	var adr_default_work = prefs.getBoolPref("morecols.vcard.adr_default_work");
	var cell_fax_default = prefs.getIntPref("morecols.vcard.cell_fax_default");

	doc.getElementById("showMFFABstyleLabel").hidden =  "true";
	doc.getElementById("BirthBox").removeAttribute("hidden");
	win.sizeToContent();
	
	for (var j=0;j<lines.length;j++) {
		if (lines[j].toUpperCase().indexOf("VERSION:") == 0 && lines[j].indexOf("3.0") > -1)
			is30 = true;
		else if (lines[j].toUpperCase().indexOf("VERSION:") == 0 && lines[j].indexOf("4.0") > -1)
			is40 = true;

		// The personal vcard generated by Thunderbird from account window seems not to be
		// standard compliant, because it uses "quoted-printable" format and UTF8 encoding
		// without the parameter "CHARSET=UTF-8", that should be mandatory. In fact according
		// vCard 2.1 pseudo-rfc, the default value for CHARSET is "ascii". To work around this
		// it's checked if the first line is just "begin:vcard" and nothing else; if it is, very likely
		// it's a generated Thunderbird vCard and so we will use UTF8 encoding anyway.
		if (! tbGeneratedVcard &&  (lines[j] == "begin:vcard" && lines[j].length == 11) )
			tbGeneratedVcard = true;

		var mylinevalue="";
		// In the line the leading spaces/tabs are deleted
		if (mylinetemp == "")
			var myline = lines[j].replace(/^\s+/g,"");
		else {
			var myline = mylinetemp + lines[j].replace(/^\s+/g,"");
			mylinetemp = "";
		}
		// If the following line begins with a space/tab, we should have a multiline field
		if (lines[j+1] && lines[j+1].substring(0,1).match(/^\s/) ) {
			mylinetemp = myline;
			continue;			
		}
		// Find the value of the line, we use substring+indexOf instead
		// split, because there could be value with : inside (es. urls)
		mylinevalue = myline.substring(myline.indexOf(":")+1);
		// If the value of the field ends with a "=" and is in QUOTED-PRINTABLE format, this
		// means that the value continues on the following line. So we store the line value in temp variable
		// and restart the for cycle, to add the following line
		if ( mylinevalue.substring(mylinevalue.length -1) == "=" && myline.toUpperCase().indexOf("QUOTED-PRINTABLE") > -1) {
			myline = myline.replace(/(.*)=$/, "$1");
			mylinetemp = mylinetemp+myline;
			continue;
		}
		var mylineinit = myline.split(":");
		mylineinit[0] = mylineinit[0].toUpperCase();
		
		// Quoted-Printable format accepts just two charsets: ANSI and UTF8
		if (myline.toUpperCase().indexOf("QUOTED-PRINTABLE") > -1) {
			if (forceUTF8)
				var qtUTF8 = true;
			else
				var qtUTF8 = (mylineinit[0].indexOf("CHARSET=UTF-8") > -1);
			mylinevalue = MCconvertFromQuotedPrintable(mylinevalue,qtUTF8);
		}
		else {
			// Try to detect charset from vCard field
			if (mylineinit[0].indexOf("CHARSET=") > -1) {
				charset = mylineinit[0];
				charset = charset.substring((charset.indexOf("CHARSET=")+8));
				if (charset.indexOf(";") > -1)
					charset = charset.substring(0,charset.indexOf(";"));
			}
			// If it's impossible and the line has characters in range 128-255 ascii (extended ascii)
			else if (mylinevalue.match(/[\x80-\xFF]/) && vcardToolsGlobals.needUserHelp) {
				window.openDialog("chrome://morecols/content/charsetDialog.xul", "",  "chrome,resizable=no,modal,titlebar,centerscreen", mylinevalue);
				vcardToolsGlobals.needUserHelp = false;
				charset = vcardToolsGlobals.charDefaultImport;
			}
			try {
				var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        	               	.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
				converter.charset = charset;
				mylinevalue = converter.ConvertToUnicode(mylinevalue);
			}
			catch(e) {}
		}

		// Replace backslash+commas with commas
		mylinevalue = mylinevalue.replace(/\\,/g, ",");

		if (vcardToolsGlobals.notes.test(mylineinit[0]) ) {
			var noteText = mylinevalue.replace(/\\;/g, ";");
			if (is30)
				noteText = noteText.replace(/\\n/g, "\n");
			doc.getElementById("Notes").value = noteText;
			continue;
		}
	
		// Cancel the newlines, the Notes field is the only one that supports them
		mylinevalue = mylinevalue.replace(/\r?\n/g," ");
		mylinevalue = mylinevalue.replace(/\\n/g," ");

		// Skip line if it has just blank spaces
		if (! mylinevalue.match(/[^ ]/) )
			continue;

		for (var i=1;i<5;i++) {
			if (mylineinit[0] == prefs.getCharPref("morecols.custom"+i+".vcard_field").toUpperCase())
				doc.getElementById("Custom"+i).value = mylinevalue;
		}

		for (var i=1;i<11;i++) {
			if (prefs.getPrefType("morecols.MFFABcustom"+i+".vcard_field") > 0
			    && mylineinit[0] == prefs.getCharPref("morecols.MFFABcustom"+i+".vcard_field").toUpperCase() )
				doc.getElementById("extraCustom"+i).value = mylinevalue;
		}

		if ( myline.toUpperCase().substring(0,2) == "N;" || myline.toUpperCase().substring(0,2) == "N:") {
			// Split the value of N: to have the lastname and the firstname
			mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
			var nameentries = mylinevalue_escaped.split(";");
			var cognome = nameentries[0];
			var nome = nameentries[1];
			if (nome) 
				doc.getElementById("FirstName").value = nome.replace("^#@#^", ";");
			if (cognome)
				doc.getElementById("LastName").value = cognome.replace("^#@#^", ";");
		}
		else if (mylineinit[0].indexOf(prefs.getCharPref("morecols.spouse.vcard_field").toUpperCase()) > -1)
			doc.getElementById("SpouseName").value = mylinevalue;
		else if ( vcardToolsGlobals.fname.test(mylineinit[0]) ) 
			doc.getElementById("DisplayName").value = mylinevalue;
		else if ( vcardToolsGlobals.nickname.test(mylineinit[0]) ) 
			doc.getElementById("NickName").value = mylinevalue;
		else if ( vcardToolsGlobals.org.test(mylineinit[0]) ) {
			mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
			var orgentries = mylinevalue_escaped.split(";");
			var orgcompany = orgentries[0];
			var orgdepart = orgentries[1];
			if (orgcompany) 
				doc.getElementById("Company").value = orgcompany.replace("^#@#^", ";");
			if (orgdepart)
				doc.getElementById("Department").value = orgdepart.replace("^#@#^", ";");
		}

		else if ( vcardToolsGlobals.telhome.test(mylineinit[0]) && mylineinit[0].indexOf("CELL") < 0 && mylineinit[0].indexOf("FAX") < 0  && mylineinit[0].indexOf("PAGER") < 0 ) 
			vcardToolsGlobals.setMultipleValueElement(doc.getElementById("HomePhone"), mylinevalue);
		else if ( vcardToolsGlobals.telcell.test(mylineinit[0]) &&
				(cell_fax_default == 0 || 
				(cell_fax_default == 1 && mylineinit[0].indexOf("WORK") < 0) ||
				(cell_fax_default == 2 && mylineinit[0].indexOf("HOME") < 0) ) )
			vcardToolsGlobals.setMultipleValueElement(doc.getElementById("CellularNumber"), mylinevalue);
		else if ( vcardToolsGlobals.telfax.test(mylineinit[0]) &&
				(cell_fax_default == 0 || 
				(cell_fax_default == 1 && mylineinit[0].indexOf("WORK") < 0) ||
				(cell_fax_default == 2 && mylineinit[0].indexOf("HOME") < 0) ) )
			vcardToolsGlobals.setMultipleValueElement(doc.getElementById("FaxNumber"), mylinevalue);
		else if ( vcardToolsGlobals.pager.test(mylineinit[0]) &&
				(cell_fax_default == 0 || 
				(cell_fax_default == 1 && mylineinit[0].indexOf("WORK") < 0) ||
				(cell_fax_default == 2 && mylineinit[0].indexOf("HOME") < 0) ) )
			vcardToolsGlobals.setMultipleValueElement(doc.getElementById("PagerNumber"), mylinevalue);
		else if ( vcardToolsGlobals.telwork.test(mylineinit[0]) && mylineinit[0].indexOf("CELL") < 0 && mylineinit[0].indexOf("FAX") < 0 && mylineinit[0].indexOf("PAGER") < 0 ) 
			vcardToolsGlobals.setMultipleValueElement(doc.getElementById("WorkPhone"), mylinevalue);
		else if ( vcardToolsGlobals.telgeneric.test(mylineinit[0])) {
			if (cell_fax_default == 1)
				vcardToolsGlobals.setMultipleValueElement(doc.getElementById("WorkPhone"), mylinevalue);
			else
				vcardToolsGlobals.setMultipleValueElement(doc.getElementById("HomePhone"), mylinevalue);
		}

		// According to the standard, the default value for "ADR" field should be ADRWORK, but many people
		// prefer ADRHOME, so there is a preference controlling this (default is against standard)		
		else if (vcardToolsGlobals.adr.test(mylineinit[0])) {
			if (vcardToolsGlobals.adrwork.test(mylineinit[0]) || (adr_default_work && ! vcardToolsGlobals.adrhome.test(mylineinit[0])) ) {
				mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
				var adrentries2 = mylinevalue_escaped.split(";");
				var indirizzo2 = adrentries2[2];
				var citta2 = adrentries2[3];
				var stato2 = adrentries2[4];
				var zipcode2 = adrentries2[5];
				var country2 = adrentries2[6];
				if (! is40 && (adrentries2[0] || adrentries2[1])) {
					// merging PO BOX and EXTENDED ADDR in a single value
					if (adrentries2[0] && adrentries2[1])
						var pre_indirizzo2 = adrentries2[0]+" "+adrentries2[1];
					else if (adrentries2[0])
						var pre_indirizzo2 = adrentries2[0];
					else if (adrentries2[1])
						var pre_indirizzo2 = adrentries2[1];
					doc.getElementById("WorkAddress").value = pre_indirizzo2.replace("^#@#^", ";");
					if (indirizzo2)
						doc.getElementById("WorkAddress2").value = indirizzo2.replace("^#@#^", ";");
				}
				else if (indirizzo2)
					doc.getElementById("WorkAddress").value = indirizzo2.replace("^#@#^", ";");
				if (citta2)
					doc.getElementById("WorkCity").value = citta2.replace("^#@#^", ";");
				if (stato2)
					doc.getElementById("WorkState").value = stato2.replace("^#@#^", ";");
				if (zipcode2)
					doc.getElementById("WorkZipCode").value = zipcode2.replace("^#@#^", ";");
				if (country2)
					doc.getElementById("WorkCountry").value = country2.replace("^#@#^", ";");
			}
			else if (vcardToolsGlobals.adrhome.test(mylineinit[0]) || (! adr_default_work && ! vcardToolsGlobals.adrwork.test(mylineinit[0])) ) {
				mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
				var adrentries = mylinevalue_escaped.split(";");
				var indirizzo = adrentries[2];
				var citta = adrentries[3];
				var stato = adrentries[4];
				var zipcode = adrentries[5];
				var country = adrentries[6];
				if (! is40 && (adrentries[0] || adrentries[1])) {
					// merging PO BOX and EXTENDED ADDR in a single value
					if (adrentries[0] && adrentries[1])
						var pre_indirizzo = adrentries[0]+" "+adrentries[1];
					else if (adrentries[0])
						var pre_indirizzo = adrentries[0];
					else if (adrentries[1])
						var pre_indirizzo = adrentries[1];
					doc.getElementById("HomeAddress").value = pre_indirizzo.replace("^#@#^", ";");
					if (indirizzo)
						doc.getElementById("HomeAddress2").value = indirizzo.replace("^#@#^", ";");
				}
				else if (indirizzo)
					doc.getElementById("HomeAddress").value = indirizzo.replace("^#@#^", ";");
				if (citta)
					doc.getElementById("HomeCity").value = citta.replace("^#@#^", ";");
				if (stato)
					doc.getElementById("HomeState").value = stato.replace("^#@#^", ";");
				if (zipcode)
					doc.getElementById("HomeZipCode").value = zipcode.replace("^#@#^", ";");
				if (country)
					doc.getElementById("HomeCountry").value = country.replace("^#@#^", ";");
			}
		}	
		
		// With the email address, we must check if exists a label with the PREF parameters
		// we will write the values after
		else if ( vcardToolsGlobals.emailpref.test(mylineinit[0]) ) 
			myfirstemail = mylinevalue;
		else if ( ! vcardToolsGlobals.emailpref.test(mylineinit[0]) && vcardToolsGlobals.email.test(mylineinit[0]) ) 
			otherEmails.push(mylinevalue);
		else if ( vcardToolsGlobals.urlhome.test(mylineinit[0]) ) 
			doc.getElementById("WebPage2").value = mylinevalue;
		else if ( vcardToolsGlobals.urlwork.test(mylineinit[0]) ) 
			doc.getElementById("WebPage1").value = mylinevalue;
		else if ( mylineinit[0] == "URL" ) 
			doc.getElementById("WebPage2").value = mylinevalue;
		else if ( vcardToolsGlobals.title.test(mylineinit[0]) ) 
			doc.getElementById("JobTitle").value = mylinevalue;
		else if ( vcardToolsGlobals.categories.test(mylineinit[0]) ) {
			doc.getElementById("Category").value = mylinevalue;
			if (moreColsPrefs.getBoolPref("morecols.category.advanced_view")) 
				fillCategoryField(doc,mylinevalue);
		}
		else if (mylineinit[0] == prefs.getCharPref("morecols.anniversary.vcard_field").toUpperCase()) {
			if (mylinevalue.indexOf("-") > -1) {
				// regular rfc2426 format
				var annparts = mylinevalue.split("-");
				var annyear = annparts[0];
				var annmonth = annparts[1];
				// Don't import the time, because TB can't handle it
				var annday = annparts[2].split("T")[0];		
			}
			else {
				// microsoft style...
				var annyear = mylinevalue.substring(0,4);
				var annmonth = mylinevalue.substring(4,6);
				var annday = mylinevalue.substring(6,8);
			}
			doc.getElementById("AnniversaryYear").value = annyear;
			doc.getElementById("AnniversaryMonth").value = annmonth;
			doc.getElementById("AnniversaryDay").value = annday;
		}
		else if( vcardToolsGlobals.bday.test(mylineinit[0]) ) {
			if (mylinevalue.indexOf("-") > -1) {
				// regular rfc2426 format
				bdayparts = mylinevalue.split("-");
				var byear = bdayparts[0];
				var bmonth = bdayparts[1];
				// Don't import the time, because TB can't handle it
				var bday = bdayparts[2].split("T")[0];		
			}
			else {
				// microsoft style...
				var byear = mylinevalue.substring(0,4);
				var bmonth = mylinevalue.substring(4,6);
				var bday = mylinevalue.substring(6,8);
			}
			doc.getElementById("BirthYear2").value = byear;
			doc.getElementById("BirthMonth2").value = bmonth;
			doc.getElementById("BirthDay2").value = bday;
			var birthdayElement = doc.getElementById("Birthday");
			if (birthdayElement) {
				doc.getElementById("BirthYear").value = byear;
				birthdayElement.month = bmonth-1;
				birthdayElement.date = bday;
				// calculateAge(null, doc.getElementById("BirthYear")); 
			}			
		}
		else if ( vcardToolsGlobals.photo.test(mylineinit[0]) ) {
			// online photo has VALUE attribute with the url
			// in this version there is no support for this kind of photo
			if (mylineinit[0].indexOf("VALUE") <0) {
				photo = mylinevalue;
				if (is40) {
					photo = photo.substring(photo.indexOf(",")+1);	
					if (mylineinit[0].indexOf("image/gif") > -1)
						var photoExt = ".gif";
					else if (mylineinit[0].indexOf("image/png") > -1)
						var photoExt = ".gif";
					else
						var photoExt = ".jpg";
				}
				else {
					if (mylineinit[0].indexOf("TYPE=GIF") > -1)
						var photoExt = ".gif";
					else if (mylineinit[0].indexOf("TYPE=PNG") > -1)
						var photoExt = ".png";
					else
						var photoExt = ".jpg";
				}
				setTempPhotoForWin(photo,photoExt,isCmdLine);
			}
			else {
				if (isCmdLine) {
					doc.getElementById("pic").setAttribute("src", mylinevalue.substring(mylinevalue.indexOf("uri:")));
					doc.getElementById("imgpath").setAttribute("hidden", "true");
				}
				else {
					doc.getElementById("PhotoURI").value = mylinevalue.substring(mylinevalue.indexOf("uri:"));
					updatePhoto("web");
				}
			}
		}
		// At the first END line, the function stops
		else if (vcardToolsGlobals.end.test(mylineinit[0]) ) 
			break;
	} 

	if (myfirstemail != "") {
		// So there is an address with the PREF property
		doc.getElementById("PrimaryEmail").value = myfirstemail;
		if (otherEmails[0]) {
			doc.getElementById("SecondEmail").value = otherEmails[0];
			for (var i=1;i<otherEmails.length;i++) {
				if (i>4)
					break;
				if (otherEmails[i] && doc.getElementById("extraEmail"+i))
					doc.getElementById("extraEmail"+i).value = otherEmails[i];
			}
		}
	}
	else if (otherEmails[0]) {
		// There isn't an address with the PREF property
		doc.getElementById("PrimaryEmail").value = otherEmails[0];
		if (otherEmails[1]) {
			doc.getElementById("SecondEmail").value = otherEmails[1];
			for (var i=2;i<otherEmails.length;i++) {
				if (i>5)
					break;
				if (otherEmails[i] && doc.getElementById("extraEmail"+(i-1)))
					doc.getElementById("extraEmail"+(i-1)).value = otherEmails[i];
			}
		}
	}

	if (doc.getElementById("DisplayName").value == "") {
		var dn = doc.getElementById("FirstName").value + " " + doc.getElementById("LastName").value;
		if (dn.length > 1)
			doc.getElementById("DisplayName").value = dn;
	}
}
catch(e) {alert(e)}
}

function setTempPhotoForWin(str,photoExt,isCmdLine) {
	try {
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("TmpD", Components.interfaces.nsIFile);
		var filename = new String(Math.random()).replace("0.", "") + photoExt;
		file.append(filename);
		var photoCode = atob(str);
		var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"]
                       .createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(file, 0x04 | 0x08 | 0x20, 0600, 0);
		stream.write(photoCode, photoCode.length);
		if (stream instanceof Components.interfaces.nsISafeOutputStream) {
			stream.finish();
		} else {
			stream.close();
		}
		if (isCmdLine) {
			document.getElementById("pic").setAttribute("src", "file:///"+file.path);
			document.getElementById("imgpath").setAttribute("hidden", "true");
		}
		else {
			document.getElementById("PhotoFile").file = file;
        		updatePhoto("file");
		}
	}
	catch(e) {}
}


function setTB3photo(str,photoExt,card) {
	try {
		var photoDir = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		photoDir.append("Photos");
		var file = photoDir.clone();
		var filename = new String(Math.random()).replace("0.", "") + photoExt;
		file.append(filename);
		card.setProperty("PhotoType", "file");
		card.setProperty("PhotoURI", "file:///"+file.path);
		card.setProperty("PhotoName", file.leafName);
		var photoCode = atob(str);
		var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"]
                       .createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(file, 0x04 | 0x08 | 0x20, 0600, 0);
		stream.write(photoCode, photoCode.length);
		if (stream instanceof Components.interfaces.nsISafeOutputStream) {
			stream.finish();
		} else {
			stream.close();
		}
	}
	catch(e) {}
}

// Function to import directly the vcard, without open it/them
// It supports also vcf with multiple vcards inside and multiple vCards
function MFFABimportFromVcard(selectedAB) {
	var files = getFileFromFilePicker(vcardToolsGlobals.bundle.GetStringFromName("impcont"),"OpenMultiple","*vcf",null);
	if (! files)
		return;
	var fileArray = [];
	while(files.hasMoreElements()) {
		var file = files.getNext();
		fileArray.push(file);
	}
	MFFABrunVimport(selectedAB, fileArray);
}

function MFFABrunVimport(selectedAB,fileArray) {
	var listener = {
		onStartRequest: function (aRequest, aContext) {
			this.mData = "";
		},
	
		onDataAvailable: function (aRequest, aContext, aStream, aSourceOffset, aLength) {
			var scriptableInputStream =  Components.classes["@mozilla.org/scriptableinputstream;1"]
				.createInstance(Components.interfaces.nsIScriptableInputStream);
			scriptableInputStream.init(aStream);
			var data = scriptableInputStream.read(aLength);
			this.mData += data;
		},

		onStopRequest: function (aRequest, aContext, aStatus) {
			if (this.mData.indexOf("\r\n") > -1)
				var arr = this.mData.split("\r\n");
			else
				var arr = this.mData.split("\n");
			var vcardLines = [];
			var len = arr.length;
			for (var i=0; i<len; i++) {
				var line = arr[i];
				vcardLines.push(line);
				if (vcardToolsGlobals.end.test(line.toUpperCase()) ) {
					var card = vcf2nsIabCard(vcardLines);
					addVcardToAb(selectedAB, card);
					vcardLines = [];
					MFFAButils.progressMeter(i+1,len);
				}
			}
			fileArray.shift();
			MFFABrunVimport(selectedAB,fileArray,this.total,this.imported+1);
		}
	};
	var file = fileArray[0];
	if (! file) {
		MFFAButils.progressMeter(null,null);
		return;
	}
	MFFAButils.progressMeter(0,100);
	var ios = Components.classes["@mozilla.org/network/io-service;1"]
             .getService(Components.interfaces.nsIIOService);
	var fileURI = ios.newFileURI(file);
	var channel = ios.newChannelFromURI(fileURI);
	channel.asyncOpen(listener, null);
}
	

function addVcardToAb(uri,card) {
	var getSelDir = GetSelectedDirectory();
	var dir = GetDirectoryFromURI(getSelDir);
	var addedCard = MFFAButils.addCard(dir,card);
	var insertCreateDate = moreColsPrefs.getBoolPref("morecols.newcontact.insert_date");
	if (addedCard && insertCreateDate) {
		// Inserts the creation date in card
		var now = new Date();
		var createdate = now.getTime();
		addedCard.setProperty("LastModifiedDate", parseInt(createdate/1000000) * 1000);
	}
}

function vcf2nsIabCard(lines) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
		.createInstance(Components.interfaces.nsIAbCard);  
	
	// Variables needed to fill the email fields
	var myfirstemail = "";
	var otherEmails = [];
	
	var mylinetemp="";
	var mylinevalue_escaped;
	var fn = false;
	var is30 = false;
	var is40 = false;
	var photo = false;
	tbGeneratedVcard = false;
	
	var adr_default_work = prefs.getBoolPref("morecols.vcard.adr_default_work");
	var cell_fax_default = prefs.getIntPref("morecols.vcard.cell_fax_default");
	
	for (var i=0;i<lines.length;i++) {
		if (lines[i].toUpperCase().indexOf("VERSION:") == 0 && lines[i].indexOf("3.0") > -1)
			is30 = true;
		else if (lines[i].toUpperCase().indexOf("VERSION:") == 0 && lines[i].indexOf("4.0") > -1)
			is40 = true;		

		// The personal vcard generated by Thunderbird from account window seems not to be
		// standard compliant, because it uses "quoted-printable" format and UTF8 encoding
		// without the parameter "CHARSET=UTF-8", that should be mandatory. In fact according
		// vCard 2.1 pseudo-rfc, the default value for CHARSET is "ascii". To work around this
		// it's checked if the first line is just "begin:vcard" and nothing else; if it is, very likely
		// it's a generated Thunderbird vCard and so we will use UTF8 encoding anyway.
		if (! tbGeneratedVcard &&  (lines[i] == "begin:vcard" && lines[i].length == 11) )
			tbGeneratedVcard = true;
		
		var mylinevalue="";
		// In the line the leading spaces/tabs are stripped
		if (mylinetemp == "") 
			var myline = lines[i].replace(/^\s+/g,"");
		else {
			var myline = mylinetemp + lines[i].replace(/^\s+/g,"");
			mylinetemp = "";
		}
		// If the following line begins with a space/tab, we should have a multiline field
		if (lines[i+1] && lines[i+1].substring(0,1).match(/^\s/) ) {
			mylinetemp = myline;
			continue;			
		}

		// Find the value of the line, we use substring+indexOf instead
		// split, because there could be value with : inside (es. urls)
		mylinevalue = myline.substring(myline.indexOf(":")+1);
		// If the value of the field ends with a "=" and is in QUOTED-PRINTABLE format, this
		// means that the value continues on the following line. So we store the line value in temp variable
		// and restart the for cycle, to add the following line
		if ( mylinevalue.substring(mylinevalue.length -1) == "=" && myline.toUpperCase().indexOf("QUOTED-PRINTABLE") > -1) {
			myline = myline.replace(/(.*)=$/, "$1");
			mylinetemp = mylinetemp+myline;
			continue;
		}

		var mylineinit = myline.split(":");
		mylineinit[0] = mylineinit[0].toUpperCase();
		if (myline.toUpperCase().indexOf("QUOTED-PRINTABLE") > -1) {
			var qtUTF8 = (mylineinit[0].indexOf("CHARSET=UTF-8") > -1);
			mylinevalue = MCconvertFromQuotedPrintable(mylinevalue,qtUTF8);
		}
		else {
			var charset = vcardToolsGlobals.charDefaultImport;
			if (mylineinit[0].indexOf("CHARSET=") > -1) {
				charset = mylineinit[0];
				charset = charset.substring((charset.indexOf("CHARSET=")+8));
				if (charset.indexOf(";") > -1)
					charset = charset.substring(0,charset.indexOf(";"));
			}
			else if (mylinevalue.match(/[\x80-\xFF]/) && vcardToolsGlobals.needUserHelp) {
				window.openDialog("chrome://morecols/content/charsetDialog.xul", "",                    "chrome,resizable=no,modal,titlebar,centerscreen", mylinevalue);
				vcardToolsGlobals.needUserHelp = false;
				charset = vcardToolsGlobals.charDefaultImport;
			}
			try {
				var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        	               		 .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
				converter.charset = charset;
				mylinevalue = converter.ConvertToUnicode(mylinevalue);
			}
			catch(e) {}
		}

		mylinevalue = mylinevalue.replace(/\\,/g, ",");
			
		if (vcardToolsGlobals.notes.test(mylineinit[0]) ) {
			var noteText = mylinevalue.replace(/\\;/g, ";");
			if (is30)
				noteText = noteText.replace(/\\n/g, "\n");
			card.setProperty("Notes", noteText);
		}
	
		// Cancel the newlines, the Notes field is the only one that supports them
		mylinevalue = mylinevalue.replace(/\r?\n/g," ");
		mylinevalue = mylinevalue.replace(/\\n/g," ");

		// Skip line if it has just blank spaces
		if (! mylinevalue.match(/[^ ]/) )
			continue;
		
		for (var tempVar=1;tempVar<5;tempVar++) {
			if (mylineinit[0] == prefs.getCharPref("morecols.custom"+tempVar+".vcard_field").toUpperCase())
				card.setProperty("Custom"+tempVar, mylinevalue);
		}

		for (var tempVar=1;tempVar<11;tempVar++) {
			if (prefs.getPrefType("morecols.MFFABcustom"+tempVar+".vcard_field") > 0
			   && mylineinit[0] == prefs.getCharPref("morecols.MFFABcustom"+tempVar+".vcard_field").toUpperCase() )
				card.setProperty("MFFABcustom"+tempVar, mylinevalue);
		}
		
		if ( myline.toUpperCase().substring(0,2) == "N;" || myline.toUpperCase().substring(0,2) == "N:") {
			// Split the value of N: to have the lastname and the firstname
			mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
			var nameentries = mylinevalue_escaped.split(";");
			var cognome = nameentries[0];
			var nome = nameentries[1];
			if (nome)
				card.setProperty("FirstName", nome.replace("^#@#^", ";"));
			if (cognome)
				card.setProperty("LastName", cognome.replace("^#@#^", ";"));
		}
		else if ( vcardToolsGlobals.fname.test(mylineinit[0]) ) {
			card.setProperty("DisplayName", mylinevalue);
			fn = true;			
		}
		else if ( vcardToolsGlobals.nickname.test(mylineinit[0]) ) 
			card.setProperty("NickName", mylinevalue);
		else if ( vcardToolsGlobals.org.test(mylineinit[0]) ) {
			mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
			var orgentries = mylinevalue_escaped.split(";");
			var orgcompany = orgentries[0];
			var orgdepart = orgentries[1];
			if (orgcompany) 
				card.setProperty("Company", orgcompany.replace("^#@#^", ";"));
			if (orgdepart)
				card.setProperty("Department", orgdepart.replace("^#@#^", ";"));
		}
		else if ( vcardToolsGlobals.telhome.test(mylineinit[0]) && mylineinit[0].indexOf("CELL") < 0 && mylineinit[0].indexOf("FAX") < 0 && mylineinit[0].indexOf("PAGER") < 0) {
			mylinevalue = vcardToolsGlobals.getMultipleValue(card, "HomePhone", mylinevalue);
			card.setProperty("HomePhone", mylinevalue);
		}
		else if ( vcardToolsGlobals.telcell.test(mylineinit[0]) &&
				(cell_fax_default == 0 || 
				(cell_fax_default == 1 && mylineinit[0].indexOf("WORK") < 0) ||
				(cell_fax_default == 2 && mylineinit[0].indexOf("HOME") < 0) ) ) {
			mylinevalue = vcardToolsGlobals.getMultipleValue(card, "CellularNumber", mylinevalue);
			card.setProperty("CellularNumber", mylinevalue);
		}
		else if ( vcardToolsGlobals.telfax.test(mylineinit[0]) &&
				(cell_fax_default == 0 || 
				(cell_fax_default == 1 && mylineinit[0].indexOf("WORK") < 0) ||
				(cell_fax_default == 2 && mylineinit[0].indexOf("HOME") < 0) ) ) {
			mylinevalue = vcardToolsGlobals.getMultipleValue(card, "FaxNumber", mylinevalue);
			card.setProperty("FaxNumber", mylinevalue);
		}
		else if ( vcardToolsGlobals.pager.test(mylineinit[0]) &&
				(cell_fax_default == 0 || 
				(cell_fax_default == 1 && mylineinit[0].indexOf("WORK") < 0) ||
				(cell_fax_default == 2 && mylineinit[0].indexOf("HOME") < 0) ) ) {
			mylinevalue = vcardToolsGlobals.getMultipleValue(card, "PagerNumber", mylinevalue);
			card.setProperty("PagerNumber", mylinevalue);
		}
		else if ( vcardToolsGlobals.telwork.test(mylineinit[0]) && mylineinit[0].indexOf("CELL") < 0 && mylineinit[0].indexOf("FAX") < 0 && mylineinit[0].indexOf("PAGER") < 0)  {
			mylinevalue = vcardToolsGlobals.getMultipleValue(card, "WorkPhone", mylinevalue);
			card.setProperty("WorkPhone", mylinevalue);
		}
		else if ( vcardToolsGlobals.telgeneric.test(mylineinit[0])) {
			if (cell_fax_default == 1) {
				mylinevalue = vcardToolsGlobals.getMultipleValue(card, "WorkPhone", mylinevalue);
				card.setProperty("WorkPhone", mylinevalue);
			}
			else {
				mylinevalue = vcardToolsGlobals.getMultipleValue(card, "HomePhone", mylinevalue);
				card.setProperty("HomePhone", mylinevalue);
			}
		}
		
		else if ( vcardToolsGlobals.categories.test(mylineinit[0]) ) 
			card.setProperty("Category", mylinevalue);
		// According to the standard, the default value for "ADR" field should be ADRWORK, but many people
		// prefer ADRHOME, so there is a preference controlling this (default is against standard)		
		else if (vcardToolsGlobals.adr.test(mylineinit[0])) {
			if (vcardToolsGlobals.adrwork.test(mylineinit[0]) || (adr_default_work && ! vcardToolsGlobals.adrhome.test(mylineinit[0])) ) {
				mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
				var adrentries2 = mylinevalue_escaped.split(";");
				var indirizzo2 = adrentries2[2];
				var citta2 = adrentries2[3];
				var stato2 = adrentries2[4];
				var zipcode2 = adrentries2[5];
				var country2 = adrentries2[6];
				var indirizzo2 = adrentries2[2];
				var citta2 = adrentries2[3];
				var stato2 = adrentries2[4];
				var zipcode2 = adrentries2[5];
				var country2 = adrentries2[6];
				if ( ! is40 && (adrentries2[0] || adrentries2[1])) {
					// merging PO BOX and EXTENDED ADDR in a single value
					if (adrentries2[0] && adrentries2[1])
						var pre_indirizzo2 = adrentries2[0]+" "+adrentries2[1];
					else if (adrentries2[0])
						var pre_indirizzo2 = adrentries2[0];
					else if (adrentries2[1])
						var pre_indirizzo2 = adrentries2[1];
					card.setProperty("WorkAddress", pre_indirizzo2.replace("^#@#^", ";"));
					if (indirizzo2)
						card.setProperty("WorkAddress2", indirizzo2.replace("^#@#^", ";"));
				}
				else if (indirizzo2)
					card.setProperty("WorkAddress", indirizzo2.replace("^#@#^", ";"));
				if (citta2)
					card.setProperty("WorkCity", citta2.replace("^#@#^", ";"));
				if (stato2)
					card.setProperty("WorkState", stato2.replace("^#@#^", ";"));
				if (zipcode2)
					card.setProperty("WorkZipCode", zipcode2.replace("^#@#^", ";"));
				if (country2)
					card.setProperty("WorkCountry", country2.replace("^#@#^", ";"));
			}
			else if (vcardToolsGlobals.adrhome.test(mylineinit[0]) || (! adr_default_work && ! vcardToolsGlobals.adrhome.test(mylineinit[0])) ) {
				mylinevalue_escaped = mylinevalue.replace(/\\;/g, "^#@#^");
				var adrentries = mylinevalue_escaped.split(";");
				var indirizzo = adrentries[2];
				var citta = adrentries[3];
				var stato = adrentries[4];
				var zipcode = adrentries[5];
				var country = adrentries[6];
				if ( ! is40 && (adrentries[0] || adrentries[1])) {
					// merging PO BOX and EXTENDED ADDR in a single value
					if (adrentries[0] && adrentries[1])
						var pre_indirizzo = adrentries[0]+" "+adrentries[1];
					else if (adrentries[0])
						var pre_indirizzo = adrentries[0];
					else if (adrentries[1])
						var pre_indirizzo = adrentries[1];
					card.setProperty("HomeAddress", pre_indirizzo.replace("^#@#^", ";"));
					if (indirizzo)
						card.setProperty("HomeAddress2", indirizzo.replace("^#@#^", ";"));
				}
				else if (indirizzo)
					card.setProperty("HomeAddress", indirizzo.replace("^#@#^", ";"));
				if (citta)
					card.setProperty("HomeCity", citta.replace("^#@#^", ";"));
				if (stato)
					card.setProperty("HomeState", stato.replace("^#@#^", ";"));
				if (zipcode)
					card.setProperty("HomeZipCode", zipcode.replace("^#@#^", ";"));
				if (country)
					card.setProperty("HomeCountry", country.replace("^#@#^", ";"));
			}
		}
		
		// With the email address, we must check if exists a label with the PREF parameters
		// we will write the values after
		else if ( vcardToolsGlobals.emailpref.test(mylineinit[0]) ) 
			myfirstemail = mylinevalue;
		else if ( ! vcardToolsGlobals.emailpref.test(mylineinit[0]) && vcardToolsGlobals.email.test(mylineinit[0]) ) 
			// myemail = mylinevalue;
			otherEmails.push(mylinevalue);
		else if ( vcardToolsGlobals.urlhome.test(mylineinit[0]) ) 
			card.setProperty("WebPage2", mylinevalue);
		else if ( vcardToolsGlobals.urlwork.test(mylineinit[0]) ) 
			card.setProperty("WebPage1", mylinevalue);
		else if ( mylineinit[0] == "URL" ) 
			card.setProperty("WebPage2", mylinevalue);
		else if ( vcardToolsGlobals.title.test(mylineinit[0]) ) 
			card.setProperty("JobTitle", mylinevalue);
		else if (mylineinit[0].indexOf(prefs.getCharPref("morecols.spouse.vcard_field").toUpperCase()) > -1)
			card.setProperty("SpouseName", mylinevalue);
		else if ( vcardToolsGlobals.bday.test(mylineinit[0]) ) {
			// rfc 2426 provides that the format of BDAY field is "YYYY-MM-DD"
			// but some programs (ex.OE) wrongly create vcard with the BDAY
			// in the form "YYYYMMDD". Anyway the extension can import from both formats
			if (mylinevalue.indexOf("-") > -1) {
				// regular rfc2426 format
				var bdayparts = mylinevalue.split("-");
				card.setProperty("BirthYear", bdayparts[0]);
				card.setProperty("BirthMonth", bdayparts[1]);
				// cancel the time, that is an optional field in vcard
				card.setProperty("BirthDay", bdayparts[2].split("T")[0]);
			}
			else {
				// microsoft style...
				card.setProperty("BirthYear", mylinevalue.substring(0,4));
				card.setProperty("BirthMonth", mylinevalue.substring(4,6));
				card.setProperty("BirthDay", mylinevalue.substring(6,8));
			}
		}
		else if (mylineinit[0] == prefs.getCharPref("morecols.anniversary.vcard_field").toUpperCase()) {
			// rfc 2426 provides that the format of BDAY field is "YYYY-MM-DD"
			// but some programs (ex.OE) wrongly create vcard with the BDAY
			// in the form "YYYYMMDD". Anyway the extension can import from both formats
			if (mylinevalue.indexOf("-") > -1) {
				// regular rfc2426 format
				var annparts = mylinevalue.split("-");
				card.setProperty("AnniversaryYear", annparts[0]);
				card.setProperty("AnniversaryMonth", annparts[1]);
				// cancel the time, that is an optional field in vcard
				card.setProperty("AnniversaryDay", annparts[2].split("T")[0]);
			}
			else {
				// microsoft style...
				card.setProperty("AnniversaryYear", mylinevalue.substring(0,4));
				card.setProperty("AnniversaryMonth", mylinevalue.substring(4,6));
				card.setProperty("AnniversaryDay", mylinevalue.substring(6,8));
			}
		}
		else if ( vcardToolsGlobals.photo.test(mylineinit[0]) ) {
			// online photo has VALUE attribute with the url
			// in this version there is no support for this kind of photo
			if (mylineinit[0].indexOf("VALUE") <0) {
				photo = mylinevalue;
				if (is40) {
					photo = photo.substring(photo.indexOf(",")+1);	
					if (mylineinit[0].indexOf("image/gif") > -1)
						var photoExt = ".gif";
					else if (mylineinit[0].indexOf("image/png") > -1)
						var photoExt = ".gif";
					else
						var photoExt = ".jpg";
				}
				else {
					if (mylineinit[0].indexOf("TYPE=GIF") > -1)
						var photoExt = ".gif";
					else if (mylineinit[0].indexOf("TYPE=PNG") > -1)
						var photoExt = ".png";
					else
						var photoExt = ".jpg";
				}			
				setTB3photo(photo,photoExt,card);			
			}
			else {
				card.setProperty("PhotoType", "web");
				card.setProperty("PhotoURI", mylinevalue.substring(mylinevalue.indexOf("uri:")));
			}
		}
	}

	if (myfirstemail != "") {
		// So there is an address with the PREF property
		card.setProperty("PrimaryEmail", myfirstemail);
		if (otherEmails[0]) {
			card.setProperty("SecondEmail", otherEmails[0]);
			for (var i=1;i<otherEmails.length;i++) {
				if (i>4)
					break;
				if (otherEmails[i])
					card.setProperty("MFFABemail"+i, otherEmails[i]);
			}
		}
	}
	else if (otherEmails[0]) {
		// There isn't an address with the PREF property
		card.setProperty("PrimaryEmail", otherEmails[0]);
		if (otherEmails[1]) {
			card.setProperty("SecondEmail", otherEmails[1]);
			for (var i=2;i<otherEmails.length;i++) {
				if (i>5)
					break;
				if (otherEmails[i])
					card.setProperty("MFFABemail"+i, otherEmails[i]);
			}
		}
	}

	if (! fn && (card.getProperty("FirstName","") || card.getProperty("LastName","") ))
		card.setProperty("DisplayName", card.getProperty("FirstName","") + " " + card.getProperty("LastName",""));

	return card;
}

function MFFABcard2vcard(card,ipodFormat) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var data = "";
	var vCard = "";
	var charset = "";
	var fieldSep = prefs.getCharPref("morecols.contact.fields_separator");
	var alwaysQP = prefs.getBoolPref("morecols.export.always_use_quotedprintable");
	if (alwaysQP)
		var useUTF8 = prefs.getBoolPref("morecols.export.always_use_quotedprintable_utf8");
	else
		var useUTF8 = true;
	var adr_merge_lines = prefs.getBoolPref("morecols.vcard_export.adr_merge_lines");
	var version30 =  prefs.getBoolPref("morecols.vcard_export.version_3");
	if (prefs.getIntPref("morecols.vcard.export_date_format") == 0)
		var dateSep = "-";
	else
		var dateSep = "";
	
	if (version30)
		data = "BEGIN:VCARD\r\nVERSION:3.0\r\n";
	else
		data = "BEGIN:VCARD\r\nVERSION:2.1\r\n";
	vCard = vCard + data;
	if (card.lastName != "" || card.firstName != "") {
		data = card.lastName.replace(/;/g, "\\;") + ";" + card.firstName.replace(/;/g, "\\;");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		data = setFieldFormat(data,"N",alwaysQP,useUTF8,false);
		vCard = vCard + data+ "\r\n";
	}
	if (card.displayName != "")	{
		data = card.displayName.replace(/;/g, "\\;");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		data = setFieldFormat(data,"FN",alwaysQP,useUTF8,false);
		vCard = vCard + data +"\r\n";
	}
	if (card.getProperty("Company", "") || card.getProperty("Department","") ) {
		data = card.getProperty("Company","").replace(/;/g, "\\;")+";"+card.getProperty("Department","").replace(/;/g, "\\;");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		data = setFieldFormat(data,"ORG",alwaysQP,useUTF8,false);		
		vCard = vCard + data+"\r\n";
	}
	if (card.getProperty("NickName", "")) {
		data = card.getProperty("NickName", "");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		data = setFieldFormat(data,"NICKNAME",alwaysQP,useUTF8,false);
		vCard = vCard + data+"\r\n";
	}
	
	var cwa = card.getProperty("WorkAddress", "");
	var cwa2 =card.getProperty("WorkAddress2", "");
	var cwc = card.getProperty("WorkCity", "");
	var cws = card.getProperty("WorkState", "");
	var cwz = card.getProperty("WorkZipCode", "");
	var cwn = card.getProperty("WorkCountry", "");

	if (cwa || cwa2 || cwc || cws || cwz || cwn) {
		// If both address lines are not-null, we map them in this way:
		// First line --> Extended address  Second line --> Street
		if (cwa2) {
			if (! adr_merge_lines) 
				data = ";"+ cwa.replace(/;/g, "\\;")+";"+cwa2.replace(/;/g, "\\;")+";"+cwc.replace(/;/g, "\\;")+";"+cws.replace(/;/g, "\\;")+";"+cwz.replace(/;/g, "\\;")+";"+cwn.replace(/;/g, "\\;");
			else
				data = ";;"+cwa.replace(/;/g, "\\;")+" - "+cwa2.replace(/;/g, "\\;")+";"+cwc.replace(/;/g, "\\;")+";"+cws.replace(/;/g, "\\;")+";"+cwz.replace(/;/g, "\\;")+";"+cwn.replace(/;/g, "\\;");
		}
		// Otherwise we choose this other mapping:
		// First line --> Street
		else
			data = ";;"+cwa.replace(/;/g, "\\;")+";"+cwc.replace(/;/g, "\\;")+";"+cws.replace(/;/g, "\\;")+";"+cwz.replace(/;/g, "\\;")+";"+cwn.replace(/;/g, "\\;");

		if (version30) {
			data = data.replace(/,/g, "\\,"); 
			data = setFieldFormat(data,"ADR;TYPE=WORK,POSTAL",alwaysQP,useUTF8, false);
		}
		else
			data = setFieldFormat(data,"ADR;WORK;POSTAL",alwaysQP,useUTF8, false);
		vCard = vCard + data+"\r\n";
	}

	var cha = card.getProperty("HomeAddress", "");
	var cha2 =card.getProperty("HomeAddress2", "");
	var chc = card.getProperty("HomeCity", "");
	var chs = card.getProperty("HomeState", "");
	var chz = card.getProperty("HomeZipCode", "");
	var chn = card.getProperty("HomeCountry", "");

	if (cha || cha2 || chc || chs || chz || chn) {
		// If both address lines are not-null, we map them in this way:
		// First line --> Extended address  Second line --> Street
		if (cha2) {
			if (! adr_merge_lines) 
				data = ";"+ cha.replace(/;/g, "\\;")+";"+cha2.replace(/;/g, "\\;")+";"+chc.replace(/;/g, "\\;")+";"+chs.replace(/;/g, "\\;")+";"+chz.replace(/;/g, "\\;")+";"+chn.replace(/;/g, "\\;");
			else
				data = ";;"+cha.replace(/;/g, "\\;")+" - "+cha2.replace(/;/g, "\\;")+";"+chc.replace(/;/g, "\\;")+";"+chs.replace(/;/g, "\\;")+";"+chz.replace(/;/g, "\\;")+";"+chn.replace(/;/g, "\\;");
		}
		// Otherwise we choose this other mapping:
		// First line --> Street
		else
			data = ";;"+cha.replace(/;/g, "\\;")+";"+chc.replace(/;/g, "\\;")+";"+chs.replace(/;/g, "\\;")+";"+chz.replace(/;/g, "\\;")+";"+chn.replace(/;/g, "\\;");

		if (version30) {
			data = data.replace(/,/g, "\\,"); 
			data = setFieldFormat(data,"ADR;TYPE=HOME,POSTAL",alwaysQP,useUTF8, false);
		}
		else
			data = setFieldFormat(data,"ADR;HOME;POSTAL",alwaysQP,useUTF8, false);
		vCard = vCard + data+"\r\n";
	}

	if (card.getProperty("WorkPhone", "")) {
		var wp = card.getProperty("WorkPhone","").split(fieldSep);
		for (var i=0;i<wp.length;i++) {
			if (version30) 
				data = "TEL;TYPE=WORK,VOICE:"+ wp[i]+"\r\n";
			else
				data = "TEL;WORK;VOICE:"+ wp[i]+"\r\n";
			vCard = vCard + data;
		}
	}
	if (card.getProperty("HomePhone", "")) {
		var hp = card.getProperty("HomePhone","").split(fieldSep);
		for (var i=0;i<hp.length;i++) {
			if (version30) 
			data = "TEL;TYPE=HOME,VOICE:"+ hp[i]+"\r\n";
			else
				data = "TEL;HOME;VOICE:"+ hp[i] +"\r\n";
			vCard = vCard + data;
		}
	}
	if (card.getProperty("CellularNumber","")) {
		var cn = card.getProperty("CellularNumber","").split(fieldSep);
		for (var i=0;i<cn.length;i++) {
			if (version30) 
				data = "TEL;TYPE=CELL,VOICE:"+ cn[i] +"\r\n";
			else
				data = "TEL;CELL;VOICE:"+ cn[i] +"\r\n";
			vCard = vCard + data;
		}
	}
	if (card.getProperty("FaxNumber","")) {
		var fn = card.getProperty("FaxNumber","").split(fieldSep);
		for (var i=0;i<fn.length;i++) {
			if (version30) 
				data = "TEL;TYPE=FAX:"+ fn[i] +"\r\n";
			else
				data = "TEL;FAX:"+ fn[i] +"\r\n";
			vCard = vCard + data;
		}
	}
	if (card.getProperty("PagerNumber","")) {
		var pn = card.getProperty("PagerNumber","").split(fieldSep);
		for (var i=0;i<pn.length;i++) {
			if (version30) 
				data = "TEL;TYPE=PAGER:"+ pn[i] +"\r\n";
			else
				data = "TEL;PAGER:"+ pn[i] +"\r\n";
			vCard = vCard + data;
		}
	}
	if (card.getProperty("PrimaryEmail","")) {
		if (version30)
			data = "EMAIL;TYPE=PREF,INTERNET:"+ card.getProperty("PrimaryEmail","")+"\r\n";
		else
			data = "EMAIL;PREF;INTERNET:"+ card.getProperty("PrimaryEmail","")+"\r\n";
		vCard = vCard + data;
	}
	if (card.getProperty("SecondEmail", "")) {
		if (version30)
			data = "EMAIL;TYPE=INTERNET:"+ card.getProperty("SecondEmail","")+"\r\n";
		else
			data = "EMAIL;INTERNET:"+ card.getProperty("SecondEmail","")+"\r\n";
		vCard = vCard + data;
	}
	for (var i=1;i<6;i++) {
		if (card.getProperty("MFFABemail"+i,"")) {
			if (version30)
				data = "EMAIL;TYPE=INTERNET:"+ card.getProperty("MFFABemail"+i,"")+"\r\n";
			else
				data = "EMAIL;INTERNET:"+ card.getProperty("MFFABemail"+i,"")+"\r\n";
			vCard = vCard + data;
		}
	  }

	if (card.getProperty("WebPage2", "")) {
		if (version30)
			data = "URL;TYPE=HOME:"+ card.getProperty("WebPage2","")+"\r\n";
		else
			data = "URL;HOME:"+ card.getProperty("WebPage2","")+"\r\n";
		vCard = vCard + data;
	}
	if (card.getProperty("JobTitle", "")) {
		data = card.getProperty("JobTitle","").replace(/;/g, "\\;");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		data = setFieldFormat(data,"TITLE",alwaysQP,useUTF8,false);
		vCard = vCard + data+"\r\n";
	}
	if (card.getProperty("WebPage1", "")) {
		if (version30)
			data = "URL;TYPE=WORK:"+ card.getProperty("WebPage1","")+"\r\n";
		else
			data = "URL;WORK:"+ card.getProperty("WebPage1","")+"\r\n";
		vCard = vCard + data;
	}
	if (card.getProperty("Category", "")) {
		data = card.getProperty("Category","");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		data = setFieldFormat(data,"CATEGORIES",alwaysQP,useUTF8,false);
		vCard = vCard + data+"\r\n";
	}
	if (card.getProperty("SpouseName", "")) {
		data = card.getProperty("SpouseName", "");
		var spField = prefs.getCharPref("morecols.spouse.vcard_field");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		data = spField+":"+ card.getProperty("SpouseName","")+"\r\n";
		vCard = vCard + data;
	}
	if (card.getProperty("BirthYear", "") && card.getProperty("BirthMonth", "") && card.getProperty("BirthDay","") ) {
			try {
			var day = card.getProperty("BirthDay", "");
			if (! isNaN(day) && day.length == 1)
				day = "0"+day;
			var month = card.getProperty("BirthMonth", "");
			if (! isNaN(month) && month.length == 1)
				month = "0"+month;
			data = "BDAY:"+card.getProperty("BirthYear","")+dateSep+month+dateSep+day+"\r\n";
		}
		catch(e) {
			data = "BDAY:"+card.getProperty("BirthYear","")+dateSep+card.getProperty("BirthMonth","")+dateSep+card.getProperty("BirthDay", "")+"\r\n";
		}
		vCard = vCard + data;
	}
	if (card.getProperty("AnniversaryYear", "") && card.getProperty("AnniversaryMonth", "") && card.getProperty("AnniversaryDay","") ) {
		var annField = prefs.getCharPref("morecols.anniversary.vcard_field");
		try {
			var day = card.getProperty("AnniversaryDay", "");
			if (! isNaN(day) && day.length == 1)
				day = "0"+day;
			var month = card.getProperty("AnniversaryMonth", "");
			if (! isNaN(month) && month.length == 1)
				month = "0"+month;
			data = annField+":"+card.getProperty("AnniversaryYear","")+dateSep+month+dateSep+day+"\r\n";
		}
		catch(e) {
			data = annField+":"+card.getProperty("AnniversaryYear","")+dateSep+card.getProperty("AnniversaryMonth", "")+dateSep+card.getProperty("AnniversaryDay", "")+"\r\n";
		}
		vCard = vCard + data;
	}
	if (card.getProperty("Notes", "")) {
		data = card.getProperty("Notes", "");
		data = data.replace(/;/g, "\\;");
		if (version30) {
			data = data.replace(/,/g, "\\,"); 
			data = data.replace(/\n/g, "\\n");
			data = setFieldFormat(data,"NOTE",false,useUTF8,false);
		}
		else if (data.indexOf("\n") < 0)
			data = setFieldFormat(data,"NOTE",alwaysQP,useUTF8,false);
		else
			data = setFieldFormat(data,"NOTE",true,useUTF8,false);
		vCard = vCard + data +"\r\n";
	}
	
	for (var i=1;i<5;i++) {
			if (card.getProperty("Custom"+i, "") && prefs.getCharPref("morecols.custom"+i+".vcard_field") != "") {
				data = prefs.getCharPref("morecols.custom"+i+".vcard_field")+":"+card.getProperty("Custom"+i,"");
			if (version30)
				data = data.replace(/,/g, "\\,"); 
			vCard = vCard + data +"\r\n";
		}
	}
	
	for (var i=1;i<11;i++) {
		if (card.getProperty("MFFABcustom"+i, "") && prefs.getPrefType("morecols.MFFABcustom"+i+".vcard_field") > 0) {
			data = prefs.getCharPref("morecols.MFFABcustom"+i+".vcard_field")+":"+card.getProperty("MFFABcustom"+i,"");
		if (version30)
			data = data.replace(/,/g, "\\,"); 
		vCard = vCard + data +"\r\n";
		}	
	}

	var photoURI = card.getProperty("PhotoURI", "");
	var photoFile = null;
	var photoType = card.getProperty("PhotoType", "");
	if (photoType == "file")
		photoFile = MFFAButils.getPhotoFile(card);
	
	if (photoFile) {
		var maxSize = prefs.getIntPref("morecols.vcard_export.photo_max_kb");
		var warn = prefs.getBoolPref("morecols.vcard_export.photo_too_large_warning");
		if (photoFile.fileSize/1024 > maxSize) {
			if (warn) {
				var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
        		                .getService(Components.interfaces.nsIPromptService);
				var check = {value: false};
				var result = prompts.alertCheck(null, vcardToolsGlobals.bundle.GetStringFromName("toolargetitle"), vcardToolsGlobals.bundle.GetStringFromName("toolargewarn"), vcardToolsGlobals.bundle.GetStringFromName("dontshowagain") , check);
				prefs.setBoolPref("morecols.vcard_export.photo_too_large_warning", ! check.value);
			}
		}
		else {
			var photoBASE64 = convertPhotoFileBase64(photoFile);
			var ext= photoFile.leafName.substring(photoFile.leafName.lastIndexOf(".")+1).toUpperCase();
			if (ext == "JPG") 
				ext = "JPEG";
			if (version30)
				data = "PHOTO;ENCODING=b;TYPE="+ext+":"+photoBASE64;
			else
				data = "PHOTO;ENCODING=BASE64;TYPE="+ext+":"+photoBASE64;
			for (var i=1;true;i++) {
				data = data.substring(0,70*i)+"\n "+ data.substring(70*i);
				if (data.substring(70*i+1).length < 70)
					break;
			}
			vCard = vCard + data +"\r\n";
		}
	}
	else if ( photoType == "web") {
		data = "PHOTO;VALUE=uri:"+ photoURI;
		vCard = vCard + data +"\r\n";
	}

	if (ipodFormat)
		data = "END:VCARD\r\n";
	else
		data = "END:VCARD\r\n\r\n";
	return vCard + data;
}

// Function to convert from QUOTED PRINTABLE to plain text. Note that
// this is needed for the displayed name: Thunderbird wants it in QUOTEDPRINTABLE
// format in 7bit, otherwise it won't display correctly the special chars.
// It's a strange beahviour because there seems to be just for this field.
// This function is not perfect, but works quite well, I hope...

function MCconvertFromQuotedPrintable(str,convertToUTF8) {
	str = str.replace(/\=/g, "%");
	str = unescape(str);
	if (convertToUTF8 || tbGeneratedVcard) {
		try {
			var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        	 		 .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			converter.charset = "UTF-8";
			var str8 = converter.ConvertToUnicode(str);
			return str8;
		}
		catch(e) {
			return str;
		}
	}
	else
		return str;
}

function MCconvertToQuotedPrintable(str,useUTF8) {
	// First of all replace the real "=" char with hex value 3D
	str = str.replace(/=/g, "=3D");
	// then escape the string
	if (useUTF8)
		str = encodeURIComponent(str);
	else
		str = escape(str);

	// now replace all % with a = if the following char is equal 8,9,A,B,C,D,E,F
	// this because Quoted-Printable wants escaped just the chars ascii > 126 i.e hex 80
	str = str.replace(/%([A-F8-9])/g, "=$1");
	// unescape the string, so that all the escaped chars ascii < 127 are restored
	if (useUTF8)
		str = decodeURIComponent(str);
	else
		str = unescape(str);
	return str;
}

// Quoted-Printable must not excede 76 chars for line
function MCsplitStringAt74chars(str) {
	// encode the newline and tab chars with their hex value
	str = str.replace(/\n/g, "=0D=0A");
	str = str.replace(/\r/g, "");
	str = str.replace(/\t/g, "=09");
	if (str.length > 71) {
		var parts = parseInt(str.length/70)+1;
		var start = 0;
		var end = 70;
		var splittedstr = "";
		var chunk = "";
		for (i=0;i<parts;i++) {
			chunk = str.substring(start,end);
			if (chunk) {
				splittedstr = splittedstr + chunk;
				if (i < parts-1)
					splittedstr = splittedstr + "="+"§§§§§"; 
			}
			start = end;
			end = end + 70;
		}
	}
	else
		var splittedstr = str;
	splittedstr = splittedstr.replace(/§§§§§/g, "\r\n");
	return splittedstr;
}

// Added in 0.3.5.1 version
function openStreamForVcard(file) {
	//
	// First of all we try with a UTF-16 stream.
	// This is because Mac OSX vcards are encoded in UTF-16
	// For the following code, see http://developer.mozilla.org/en/docs/index.php?title=Reading_textual_data
	//
	var streamObj = {};
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                        .createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	var charset = /* Need to find out what the character encoding is */  "UTF-16";
	var is = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
		.createInstance(Components.interfaces.nsIConverterInputStream);
	is.init(istream, charset, 1024, 0xFFFD);
	is.QueryInterface(Components.interfaces.nsIUnicharLineInputStream);
	var line1 = {};
	var linetest = is.readLine(line1);
	// The function return the stream as object, because in this way we can
	// know if we have to close 2 streams or 1 stream at the end
	if (linetest) {
		streamObj.firstStream=is;
		streamObj.secondStream=istream;
		return streamObj;
	}
	// It's not a UTF16 file, so we open a "normal" stream
	else {
		is.close();
		istream.close();
		var fis = Components.classes["@mozilla.org/network/file-input-stream;1"]
                    .createInstance(Components.interfaces.nsIFileInputStream);
		fis.init(file, -1, -1, 0);
		var lis = fis.QueryInterface(Components.interfaces.nsILineInputStream);
		streamObj.firstStream=lis;
		streamObj.secondStream=null;	
		return streamObj;
	}
}

function setFieldFormat(data,fieldname,alwaysQP,useUTF8,isAddr) {
	var sep = ":";
	var header = fieldname;
	if (useUTF8)
		header =  fieldname+";CHARSET="+vcardToolsGlobals.charDefaultExport;
	if (alwaysQP) {
		data = MCconvertToQuotedPrintable(data,useUTF8);
		data = header +";ENCODING=QUOTED-PRINTABLE"+sep+data;
		data = MCsplitStringAt74chars(data);
	}
	else
		data = header + sep +data;
	return data;
}
