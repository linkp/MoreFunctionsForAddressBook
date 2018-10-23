var gAddressBookBundle = document.getElementById("bundle_addressBook");

var MFFABimportRawFile =  {
	start : function() {
		var file = getFileFromFilePicker(vcardToolsGlobals.bundle.GetStringFromName("impcont"),"Open","*",null);
		if (file) {
			var ios=Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
			var fileURI=ios.newFileURI(file);
			var channel = ios.newChannelFromURI(fileURI);
			channel.asyncOpen(this, null);
		}
	},
	onStartRequest: function (aRequest, aContext) {
		 this.mData = "";
	},
	onDataAvailable: function (aRequest, aContext, aStream, aSourceOffset, aLength) {
		var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                               .createInstance(Components.interfaces.nsIScriptableInputStream);
		scriptableInputStream.init(aStream); 
		var chunk = scriptableInputStream.read(aLength);
		this.mData += chunk;
	},
	onStopRequest: function (aRequest, aContext, aStatus) {
		var data = this.mData;
		var addresses = data.match( /([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)/g);
		var abAddressCollectorProgID = "@mozilla.org/addressbook/services/addressCollector;1";
		var abAddressCollector = Components.classes[abAddressCollectorProgID].getService(Components.interfaces.nsIAbAddressCollector);
	        var backup = MFFAButils.prefs.getCharPref("mail.collect_addressbook");
		var skip = MFFAButils.prefs.getBoolPref("morecols.import.skip_first_email_exist");
		MFFAButils.prefs.setCharPref("mail.collect_addressbook", GetSelectedDirectory());
		for (let i=0;i<addresses.length;i++) {
			abAddressCollector.collectSingleAddress(addresses[i],addresses[i],true,0, !skip);
		}
		MFFAButils.prefs.setCharPref("mail.collect_addressbook", backup);
	}
};
		
function exportABCVS(sel) {
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]  
                         .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);  
	converter.charset =  moreColsPrefs.getCharPref("morecols.csv_export_charset");  
	var getSelDir = GetSelectedDirectory();
	var addrBook = GetDirectoryFromURI(getSelDir);
	var file = getFileFromFilePicker(MCbundle.GetStringFromName("csvDialogTitle"),"Save","*csv", addrBook.dirName+".csv");
	if (! file)
		return;
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		.createInstance(Components.interfaces.nsIFileOutputStream);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	if (moreColsPrefs.getIntPref("morecols.export.csv_separator") == 0)
		var sep = ",";
	else
		var sep = ";";
	var firstline = "";
	for (var j=2100;j<2136;j++) {
		var field = MCbundle2.GetStringFromID(j);
		firstline = firstline + field + sep;
		if (j == 2105) {
			// this is the "Screen name", that goes after "Secondary email"
			field = MCbundle2.GetStringFromID(2136);
			// fix for wrong german translation
			if (field == "Anzeigename")
				field = "Messenger-name";
			firstline = firstline + field + sep;
		}	
	}
	firstline = firstline + MCbundle.GetStringFromName("AnniversaryYear") + sep + MCbundle.GetStringFromName("AnniversaryMonth") + sep + MCbundle.GetStringFromName("AnniversaryDay") + sep + MCbundle.GetStringFromName("Category") + sep + MCbundle.GetStringFromName("SpouseName")+sep;
	for (var k=1;k<10;k++) {
		firstline = firstline + MCbundle.GetStringFromName("extraField")+" "+ k.toString() + sep;
	}
	firstline = firstline + MCbundle.GetStringFromName("extraField")+ " 10"+"\r\n";
	try {
		var str = converter.ConvertFromUnicode(firstline);  
		foStream.write(str, str.length);
	}
	catch(e) {
		foStream.write(firstline, firstline.length);
	}
	
	if (! sel) {
		var cards = [];
		var ABcards = addrBook.childCards;
		while (ABcards.hasMoreElements()) {
			var next = ABcards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
			if (! next.isMailList)
				cards.push(next);
		}
	}
	else
		var cards = GetSelectedContacts();
	
	var len = cards.length;
	for (var i=0;i<len;i++) {
		var data = card2csv(cards[i],sep);
		try {
			var str = converter.ConvertFromUnicode(data);  
			foStream.write(str, str.length);
		}
		catch(e) {
			foStream.write(data, data.length);
		}
		MFFAButils.progressMeter(i+1,len);
	}
	
	foStream.close();
	MFFAButils.progressMeter(null,null);
}


function card2csv(card,sep) {
	var data = escapeFieldForCSV(card.getProperty("FirstName", ""),sep)+sep+escapeFieldForCSV(card.getProperty("LastName", ""),sep)+sep+escapeFieldForCSV(card.getProperty("DisplayName", ""),sep)+sep+escapeFieldForCSV(card.getProperty("NickName", ""),sep)+sep+escapeFieldForCSV(card.getProperty("PrimaryEmail", ""),sep)+sep+escapeFieldForCSV(card.getProperty("SecondEmail", ""),sep)+sep+escapeFieldForCSV(card.getProperty("_AimScreenName", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WorkPhone", ""),sep)+sep+escapeFieldForCSV(card.getProperty("HomePhone", ""),sep)+sep+escapeFieldForCSV(card.getProperty("FaxNumber", ""),sep)+sep+escapeFieldForCSV(card.getProperty("PagerNumber", ""),sep)+sep+escapeFieldForCSV(card.getProperty("CellularNumber", ""),sep)+sep+escapeFieldForCSV(card.getProperty("HomeAddress", ""),sep)+sep+escapeFieldForCSV(card.getProperty("HomeAddress2", ""),sep)+sep+escapeFieldForCSV(card.getProperty("HomeCity", ""),sep)+sep+escapeFieldForCSV(card.getProperty("HomeState", ""),sep)+sep+escapeFieldForCSV(card.getProperty("HomeZipCode", ""),sep)+sep+escapeFieldForCSV(card.getProperty("HomeCountry", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WorkAddress", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WorkAddress2", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WorkCity", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WorkState", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WorkZipCode", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WorkCountry", ""),sep)+sep+escapeFieldForCSV(card.getProperty("JobTitle", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Department", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Company", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WebPage1", ""),sep)+sep+escapeFieldForCSV(card.getProperty("WebPage2", ""),sep)+sep+escapeFieldForCSV(card.getProperty("BirthYear", ""),sep)+sep+escapeFieldForCSV(card.getProperty("BirthMonth", ""),sep)+sep+escapeFieldForCSV(card.getProperty("BirthDay", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Custom1", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Custom2", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Custom3", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Custom4", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Notes", ""),sep)+sep+escapeFieldForCSV(card.getProperty("AnniversaryYear", ""),sep)+sep+escapeFieldForCSV(card.getProperty("AnniversaryMonth", ""),sep)+sep+escapeFieldForCSV(card.getProperty("AnniversaryDay", ""),sep)+sep+escapeFieldForCSV(card.getProperty("Category", ""),sep)+sep+escapeFieldForCSV(card.getProperty("SpouseName", ""),sep);
	for (var i=1;i<11;i++) 
		data = data+sep+escapeFieldForCSV(card.getProperty("MFFABcustom"+i, ""),sep);
	for (var i=1;i<6;i++) 
		data = data+sep+escapeFieldForCSV(card.getProperty("MFFABemail"+i, ""),sep);
	data = data + "\r\n";
	return data;
}


function escapeFieldForCSV(data, sep) {
	data = data.replace(/\"/g, '""');
	if (data.indexOf("\n") > -1 || data.indexOf('"') > -1 || data.indexOf(",") > -1  || data.indexOf(sep) > -1)
		data = '"'+data+'"';
	return data;
}

function exportListOrAB() {
	var ABtree = document.getElementById("abResultsTree");
	var addrBook = GetDirectoryFromURI(GetSelectedDirectory());
	if (addrBook.isMailList) {
		var file = getFileFromFilePicker(MCbundle.GetStringFromName("expcard"),"GetFolder","all");
		if (! file)
			return;
		exportList(addrBook,file);
	}
	else
		exportABasMab();
}

function exportElement() {
	var file = getFileFromFilePicker(MCbundle.GetStringFromName("expcard"),"GetFolder","all");
	if (! file)
		return;
	var cards = GetSelectedContacts(true);
	var len = cards.length;
	for (var j=0;j<len;j++) {
		var card = cards[j];
		MFFAButils.progressMeter(j+1,len);
		if (card.isMailList) {
			var addrBook = GetDirectoryFromURI(card.mailListURI);
			exportList(addrBook,file);
		}
		else 
			exportCard(card,file);
	}
	MFFAButils.progressMeter(null,null);
}

function exportCard(card,file) {
	var data;
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		.createInstance(Components.interfaces.nsIFileOutputStream);
	var charset = "UTF-8"; // Can be any character encoding name that Mozilla supports
	var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
		.createInstance(Components.interfaces.nsIConverterOutputStream);
	data = "";
	var clone = file.clone();
	// The name of the .tha file is taken from the display name, replacing the spaces with underscores
	var filename =  getFilenameByCard(card);
	var newfilename = findGoodName(filename, clone,".tha");
	clone.append(newfilename);
	// Open the streamto write the data of the card into the file .tha
	// We write all the properties of the card object, except the functions
	// Not all of them are useful, but it's a quick code!
	for (var i=0;i<kMFABprops.length;i++) 
		data = data+kMFABprops[i]+"\t"+card.getProperty(kMFABprops[i],"")+"\r\n";
	var lsm = card.getProperty("LastModifiedDate",0);
	data = data + "LastModifiedDate" + "\t" + lsm+"\r\n";
	data = data + "PreferMailFormat" + "\t" + card.getProperty("PreferMailFormat",0)+"\r\n";
	data = data + "AllowRemoteContent" + "\t" + card.getProperty("AllowRemoteContent","")+"\r\n";
	for (var i=1; i<11; i++) 
		data += "extraCustom"+i + "\t" +card.getProperty("MFFABcustom"+i.toString(), "") + "\r\n";		
	foStream.init(clone, 0x02 | 0x08 | 0x20, 0664, 0);
	os.init(foStream, charset, 0, 0x0000);
	os.writeString(data);
	os.close();
	foStream.close();
}

function exportList(list,file) {
	var data="";
	// We take the list as object
	var displayName = list.dirName;
	if (displayName == "")
		var filename = "unknown";
	else
		var filename =  normalizeFileName(displayName);
	var newfilename = findGoodName(filename,file,".thm");
        file.append(newfilename);
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		.createInstance(Components.interfaces.nsIFileOutputStream);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	var charset = "UTF-8"; // Can be any character encoding name that Mozilla supports
	var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
             .createInstance(Components.interfaces.nsIConverterOutputStream);
	os.init(foStream, charset, 0, 0x0000);
	// The first parameter are list.dirName (list name)
	// list.listNickName (list nickname)
	// list.description (list description)
	// We write this data in the file, the first field is the "id" in the list window
	data = "ListName\t"+list.dirName+"\r\n"+"ListNickName\t"+list.listNickName+"\r\n"+"ListDescription\t"+ list.description+"\r\n";
	data = data + getAllCardsFromList(list);
	os.writeString(data);
	os.close();
	foStream.close();
}

function getAllCardsFromList(list) {
	var data = "";
	var cards = list.childCards;
	var headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
	// In TB3 cards is a nsISimpleEnumerator
	while (cards.hasMoreElements()) {
		var card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
		if (card.displayName == "" && (card.firstName != "" && card.lastName != "")) {
			if (card.lastName != "")
				var cardname = card.firstName + " " + card.lastName;
			else
				var cardname = card.firstName;
		}
		else
			var cardname = card.displayName;
		if (headerParser.makeFullAddress)
			var address = headerParser.makeFullAddress(cardname, card.primaryEmail);
		else
			var address = headerParser.makeMailboxObject(cardname, card.primaryEmail).toString();
		data += address + "\r\n";
	}
	return data;
}

function preImportList1() {
	preImportList2('dirTree');
}

function preImportList2(abListItem) {
	importList(GetSelectedDirectory());
}

function importList(selectedAB) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var delay = prefs.getIntPref("morecols.delay.open_window");
	var file = getFileFromFilePicker(MCbundle.GetStringFromName("implist"), "Open","*thm");
	if (! file)
		return;
	// Open the new card dialog, we pass the nsifile to the new window
	// var listDialog = window.openDialog("chrome://messenger/content/addressbook/abMailListDialog.xul", "","chrome,resizable=no,titlebar,centerscreen", {selectedAB:selectedAB}, file);
	// After a short delay, we fill the dialog with the data read from the .thm file
	setTimeout(function(){parseTHMfile(selectedAB,file);}, 100);
}

function parseTHMfile(selectedAB,file) {
	var addresses = new Array;
	var index = 0;
	// Open the nsifile
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                        .createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);
	var lineData = {}, lines = [], hasmore;
	do {
		hasmore = istream.readLine(lineData);
		try {
			var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                       		 .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			converter.charset = "UTF-8";
			var line = converter.ConvertToUnicode(lineData.value);
		}
		// If the UTF8 converter fails, we make no conversion
		catch(e) {
			var line = lineData.value;
		}
		index++;
		// For the first 3 lines, we must split the line in two parts, in the first one 
		// there's the id of the element, in the second one the value of the element
		if (index == 1) {
			var field = line.split("\t");
			var dirName = field[1];
			continue;
		}
		else if (index == 2 || index == 3)
			 continue;
		// From the 4th line, we will have just addresses
		var myline = line;
		if (myline != "") 
			addresses.push(myline);
	}  while(hasmore);
	istream.close();
	MFFAButils.createListWithAddress(dirName, addresses, selectedAB);
}


function copyABaddress(string) {
	var cards = GetSelectedContacts(false);
	var data = "";
	if (string == "primaryEmail" || string == "secondEmail")
		var sep = ",";
	else
		var sep = "\r\n";
	for (var i=0;i<cards.length;i++) {
		var card = cards[i];
		string = string.substring(0,1).toUpperCase() + string.substring(1);
		data += card.getProperty(string,"") + sep;
	}
	if (sep == ",")
		data = data.replace(/\,$/, "");
	copyABdata(data);
}

function copyABdata(data) {
	MFFAButils.copy(data);
}

function copyABall() {
	var allfields = "";
	var cards = GetSelectedContacts(true);
	for (var j=0;j<cards.length;j++) {
		var card = cards[j];
		if (card.isMailList) {
			var list = GetDirectoryFromURI(card.mailListURI);
			allfields +=  getAllCardsFromList(list);
		}
		else {			
			// Copy all the important field of the card
			allfields += MCbundle.GetStringFromName("name") + " : "+ card.generateName(MFFAButils.prefs.getIntPref("mail.addr_book.lastnamefirst")) + "\r\n";
			allfields += MCbundle.GetStringFromName("email") + " : "+ card.getProperty("PrimaryEmail", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("email2") + " : "+ card.getProperty("SecondEmail", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("aim") + " : "+ card.getProperty("AimScreenName", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("hometel") + " : "+ card.getProperty("HomePhone", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("worktel") + " : "+ card.getProperty("WorkPhone", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("faxnumber") + " : "+ card.getProperty("FaxNumber", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("celltel") + " : "+ card.getProperty("CellularNumber", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("pager") + " : "+ card.getProperty("PagerNumber", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("homeweb") + " : "+ card.getProperty("WebPage2", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("workweb") + " : "+ card.getProperty("WebPage1", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("homeaddress") + " " + homeAddress(false,card) + "\r\n";
			allfields += MCbundle.GetStringFromName("workaddress") +  " " + workAddress(false,card) + "\r\n";
			allfields += MCbundle.GetStringFromName("workcompany") + " "+ card.getProperty("JobTitle", "")+" "+ card.getProperty("Department","")+" "+card.getProperty("Company", "") + "\r\n";
			allfields += MCbundle.GetStringFromName("BirthDate") + " : "+   formatDayMonthYear(card.getProperty("BirthDay",""), card.getProperty("BirthMonth", ""), card.getProperty("BirthYear", "") ) + "\r\n";
			allfields += MCbundle.GetStringFromName("Category") + " : "+ card.getProperty("Category", "") + "\r\n";
	
			for (var i=1; i<5; i++) 
				allfields += "Custom"+i+" : "+ card.getProperty("Custom"+i.toString(), "") + "\r\n";
			for (var i=1; i<11; i++) 
				allfields += MCbundle.GetStringFromName("extraField")+i+" : "+ card.getProperty("MFFABcustom"+i.toString(), "") + "\r\n";
			for (var i=1;i<6;i++) 
				allfields += MCbundle.GetStringFromName("AdditionalEmail")+i+" : "+ card.getProperty("MFFABemail"+i.toString(), "") + "\r\n";
		
			allfields += MCbundle.GetStringFromName("Notes") + " : "+ card.getProperty("Notes", "")+ "\r\n";
		}
	}
	var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"];
	clipboard = clipboard.getService(Components.interfaces.nsIClipboardHelper);
	clipboard.copyString(allfields);
}

function addressFormat() {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var addrformat = prefs.getIntPref("morecols.address.format");
	if (addrformat > 1)
		addrformat = 0;
	return addrformat;
}	

// In these two functions the flag parameter is used to select the format of the data.
// It's "true" if we want a pretty format, "false" if we want a raw format

function homeAddress(flag,card) {
	// Create the home address, with 5 fields
	var sep = flag ? "\r\n" : " ";
	var string = "";
	var HomeAddress = "";
	// Choose format for address (european or american)
	var addrformat = addressFormat();
	if (addrformat == 0) 
		HomeAddress = card.getProperty("HomeAddress","") + " " + card.getProperty("HomeAddress2","") +  sep + card.getProperty("HomeZipCode","") + " " + card.getProperty("HomeCity","") + " " + card.getProperty("HomeState","") + " " + card.getProperty("HomeCountry","");
	else
		HomeAddress = card.getProperty("HomeAddress","") + " " + card.getProperty("HomeAddress2","") +  sep + card.getProperty("HomeCity","") + ", " + card.getProperty("HomeState","") + " " + card.getProperty("HomeZipCode","") + " " + card.getProperty("HomeCountry","");
	if (HomeAddress.length > 7)
		return HomeAddress;
	else
		return "";
}	

function workAddress(flag,card) {
	// Create the home address, with 5 fields
	var sep = flag ? "\r\n" : " ";
	var string = "";
	var WorkAddress = "";
	// Choose format for address (european or american)
	var addrformat = addressFormat();
	if (addrformat == 0) 
		WorkAddress = card.getProperty("WorkAddress","") + " " + card.getProperty("WorkAddress2","") +  sep + card.getProperty("WorkZipCode","") + " " + card.getProperty("WorkCity","") + " " + card.getProperty("WorkState","") + " " + card.getProperty("WorkCountry","");
	else
		WorkAddress = card.getProperty("WorkAddress","") + " " + card.getProperty("WorkAddress2","") +  sep + card.getProperty("WorkCity","") + ", " + card.getProperty("WorkState","") + " " + card.getProperty("WorkZipCode","") + " " + card.getProperty("WorkCountry","");
	WorkAddress = WorkAddress.replace(/\s+/g, " ");
	WorkAddress = WorkAddress.replace(/ $/g, "");
	if (WorkAddress.length > 0)
		return WorkAddress;
	else
		return "";
}

function copyHomeAddress(flag) {
	var cards = GetSelectedContacts(false);
	var data = "";
	for (var i=0;i<cards.length;i++) {
		var card = cards[i];
		var HomeAddress = homeAddress(flag,card);
		data += card.firstName+" "+card.lastName+"\r\n" + HomeAddress +"\r\n";
	}
	copyABdata(data);
}

function copyWorkAddress(flag) {
	var cards = GetSelectedContacts(false);
	var data = "";
	for (var i=0;i<cards.length;i++) {
		var card = cards[i];
		var Work = "";
		var WorkAddress = workAddress(flag,card);
		Work += card.firstName+" "+card.lastName+"\r\n";
		if (card.getProperty("JobTitle","") != "")
			Work += card.getProperty("JobTitle","") +"\r\n";
		if (card.getProperty("Department","")  != "")
			Work += +card.getProperty("Department","") +"\r\n";
		if (card.getProperty("Company","")  != "")
			Work += card.getProperty("Company","") +"\r\n";
		data = data + Work + WorkAddress +"\r\n";
	}
	copyABdata(data);
}


function preImportCard1(vcard) {
	var dir = GetSelectedDirectory();
	if (vcard == 0)
		openVcard(dir);
	else	if (vcard == 1)
		MFFABimportFromVcard(dir);
	else if (vcard == 2)
		importCard(dir);
}


function importCard(selectedAB) {
	var file = getFileFromFilePicker(MCbundle.GetStringFromName("impcont"),"Open","*tha");
	if (! file)
		return;
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var delay = prefs.getIntPref("morecols.delay.open_window");
	// Open the new card dialog, we pass the nsifile to the new window
	var cardDialog = window.openDialog("chrome://messenger/content/addressbook/abNewCardDialog.xul", "", "chrome,resizable=no,titlebar,centerscreen",{selectedAB:selectedAB},file,true);
	// After a short delay, we fill the dialog with the data read from the .tha file
	setTimeout(function(){cardDialog.fill4import();}, delay);
}


function fill4import() {
	// Open the nsifile
	var file = window.arguments[1];
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                        .createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);
	var lineData = {}, lines = [], hasmore;
	do {
		// We set the elements' values of the dialog according the data read from the file, line by line
		// Note that the name of the elements are the same of the properties of the nsiabcard (except one)
		// but the first letter is capital
		hasmore = istream.readLine(lineData);
		try {
			var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                       		 .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			converter.charset = "UTF-8";
			var line = converter.ConvertToUnicode(lineData.value);
		}
		// If the UTF8 converter fails, we make no conversion
		catch(e) {
			var line = lineData.value;
		}
		var cardvalue = line.split("\t");
		var ab = cardvalue[0];
		if (ab.indexOf("extraCustom") < 0)
			ab = ab.replace(ab.substring(0,1), ab.substring(0,1).toUpperCase());
	if (ab.indexOf("MFFABemail") > -1) 
			ab = "extraEmail" + ab[10].toString();
		if (ab.indexOf("Category") > -1) {
			document.getElementById(ab).value = cardvalue[1];
			if (moreColsPrefs.getBoolPref("morecols.category.advanced_view")) {
				fillCategoryField(document,cardvalue[1]);
			}
			else  {
				doc.getElementById("catStandardView").removeAttribute("hidden");
				doc.getElementById("catAdvancedView").setAttribute("hidden", "true");
			}
		}
		else if (ab == "PreferMailFormat")
			// It's the property with a different name 
			document.getElementById('PreferMailFormatPopup').selectedIndex = cardvalue[1];
		else if (ab == "AllowRemoteContent") {
			if (cardvalue[1].indexOf("1") > -1)
				document.getElementById('allowRemoteContent').checked = true;
			else
				document.getElementById('allowRemoteContent').checked = false;
		}
		else if (ab != "LastModifiedDate" ) {
			try { document.getElementById(ab).value = cardvalue[1]; }
			catch(e) {}
	   	}
	} while(hasmore);
	istream.close();
}

function editAsNewCard() {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var delay = prefs.getIntPref("morecols.delay.open_editasnew");
	var card = GetSelectedCard();
	var selectedAB = GetSelectedDirectory();
	// Open the new card dialog, we pass the nsiabcard to the new window
	var cardDialog = window.openDialog("chrome://messenger/content/addressbook/abNewCardDialog.xul",
                    "", "chrome,resizable=no,titlebar,centerscreen",{selectedAB:selectedAB}, card,true);
	// After a short delay, we fill the dialog with the data of the opened card
	setTimeout(function(){cardDialog.fill4edit();}, delay);
}

function fill4edit() {
	// We copy the properties of nsiabcard in elements' values of the dialog
	var card = window.arguments[1];
    	
	document.getElementById('PreferMailFormatPopup').selectedIndex = card.getProperty('PreferMailFormat', 0);
	if (document.getElementById('allowRemoteContent'))
		document.getElementById('allowRemoteContent').checked = card.getProperty('AllowRemoteContent', false);

	for (var i=0;i<kMFABprops.length;i++) {
		try {
			if (kMFABprops[i] == "BirthYear") {
				document.getElementById("BirthYear").value = card.getProperty(kMFABprops[i],"");
				document.getElementById("BirthYear2").value = card.getProperty(kMFABprops[i],"");
			}
			else if (kMFABprops[i] == "BirthMonth")
				document.getElementById("BirthMonth2").value = card.getProperty(kMFABprops[i],"");
			else if (kMFABprops[i] == "BirthDay")
				document.getElementById("BirthDay2").value = card.getProperty(kMFABprops[i],""); 
			else
				document.getElementById(kMFABprops[i]).value = card.getProperty(kMFABprops[i],""); 
		}
		catch(e) {}
	}

	if (moreColsPrefs.getBoolPref("morecols.category.advanced_view")) 
		fillCategoryField(document, card.getProperty("Category",""));
			
	var PhotoType = card.getProperty("PhotoType", "");
	var PhotoName = card.getProperty("PhotoName", "");
	var file = MFFAButils.getPhotoFile(card);
	
	switch (PhotoType) {
		case "file":
			if (file) {
				document.getElementById("PhotoFile").file = file;
				updatePhoto("file");
			}
   			else
				updatePhoto("generic");
			break;
		case "web":
			document.getElementById("PhotoURI").value = PhotoURI;
			updatePhoto("web");
			break;
		default:
			break;
	}
	
	var birthdayElement = document.getElementById("Birthday");
	if (card.getProperty("BirthMonth",""))
		birthdayElement.month = card.getProperty("BirthMonth","")-1; 
	if (card.getProperty("BirthDay",""))
		birthdayElement.date = card.getProperty("BirthDay",""); 
	calculateAge(null, document.getElementById("BirthYear"));
}

function exportABasMab() {
	var dirTree = document.getElementById("dirTree");
	// This is the uri of the AB
	var dirsel = GetSelectedDirectory();
	// Find the AB displayed name (works just on TB 1.5 or higher)
	if (dirTree.columns)
		var dirDisplayedName = dirTree.view.getCellText(dirTree.currentIndex, dirTree.columns.getFirstColumn());
	// Extract the .mab filename
	var dirname = dirsel.substring(dirsel.indexOf("//")+2);
	var dirfile = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
	// AB file as nsIFile
	dirfile.append(dirname);
	var file = getFileFromFilePicker(MCbundle.GetStringFromName("expmab"),"GetFolder","all");
	if (! file)
		return;
	if (dirDisplayedName) {
		var exportedName = normalizeFileName(dirDisplayedName);
		exportedName = findGoodName(exportedName, file, ".mab");
		dirfile.copyTo(file, exportedName);
	}
	else {
		// On TB 1.0 the exported file has the original name (for ex. abook.mab)
		var exportedName = findGoodName(dirname, file, ".mab");
		dirfile.copyTo(file, exportedName);
	}
}

function openDialogForMabImport() {
	var aName = prompt(MCbundle.GetStringFromName("impmabname")+":","");
	aName = aName.replace(/^\s+|\s+$/g, "");
	setTimeout(importMabFile, 1000, aName, null);
}

function importMabFile(aName,aFile) {
	var deleteFile = false;
	
	if (! aFile) {
		var file = getFileFromFilePicker(MCbundle.GetStringFromName("impmab"), "Open","*mab");
		if (! file)
			return;
	}
	else {
		var file = aFile;
		deleteFile = true;
	}

	var ABman = Components.classes["@mozilla.org/abmanager;1"]
               .getService(Components.interfaces.nsIAbManager)
	var ABid = ABman.newAddressBook(aName, "", 2);
	var ABs = ABman.directories;
	var aBook = null;

	while (ABs.hasMoreElements()) {  
		aBook = ABs.getNext();  
		if (aBook instanceof Components.interfaces.nsIAbDirectory) {
			var id = aBook.dirPrefId;
			if (id == ABid)
				break;
		}
	}
	if (! aBook)
		return;
	var addname = aBook.fileName;

	var profdir = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
	// Find the new empty AB as nsIFile and...
	profdir.append(addname);

	// ...write in it the content of mab file to import
	// In versions 0.6.4.2 and lower, it was sufficient to replace the .mab file with the .mab file to import
	// but this will fail on Windows and Thunderbird 5 or higher
	var data = "";
	var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
             .createInstance(Components.interfaces.nsIFileInputStream);
	var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
              .createInstance(Components.interfaces.nsIScriptableInputStream);
	fstream.init(file, -1, 0, 0);
	sstream.init(fstream); 
	var str = sstream.read(4096);
	while (str.length > 0) {
		data += str;
		str = sstream.read(4096);
	}
	sstream.close();
	fstream.close();	
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);

	// use 0x02 | 0x10 to open file for appending.
	foStream.init(profdir, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
	foStream.write(data, data.length);
	foStream.close();
	
	if (deleteFile)
		file.remove(false);
	if (Array.isArray)
		alert(MCbundle.GetStringFromName("importMABwarning2"));
	else	
		alert(MCbundle.GetStringFromName("importMABwarning"));
}

function recoverAddrBook() {
	var goon = confirm(MCbundle.GetStringFromName("recover"));
	if (! goon)
		return;
	// This is the uri of the AB
	var dirsel = GetSelectedDirectory();
	// Extract the .mab filename
	var dirname = dirsel.substring(dirsel.indexOf("//")+2);
	var dirfile = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
	var dirfile2 = dirfile.clone();
	// AB file as nsIFile
	dirfile.append(dirname);
	var randnum = 10000+Math.round(Math.random()*99999);
	dirfile2.append(randnum.toString());
	dirfile2.createUnique(0,0644);
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                        .createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(dirfile, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);

	var mylines = "";
	var chunk = "";
	var flag = false;
	// read lines into array
	var line = {}, lines = [], hasmore;
	do {
		var bad = false;
		hasmore = istream.readLine(line);
		var linecontent = line.value;
		if (linecontent.indexOf("@$${") == 0) {
			flag = true;
			chunk = chunk + line.value+"\r\n";
		}
		else if (linecontent.indexOf("@$$}") == 0) {
			var emailregex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}/;
			var test = chunk.toUpperCase().match(emailregex);
			if (test)
				mylines = mylines+chunk+linecontent+"\r\n";
			else
				bad = true;
			chunk = "";
			flag = false;
		}
		else if (flag)
			chunk = chunk + line.value + "\r\n";
		else if (! flag && ! bad)
			mylines = mylines+line.value+"\r\n";
	} while(hasmore);
	istream.close();
	
	// file is nsIFile, data is a string
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);

	// use 0x02 | 0x10 to open file for appending.
	foStream.init(dirfile2, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
	foStream.write(mylines, mylines.length);
	foStream.close();
	var filename = dirfile2.leafName.replace(".mab","");
	importMabFile(filename,dirfile2)
}

function openPhotoByPopup(event) {
	var url = document.getElementById("cvPhoto").getAttribute("src");
	if (! url) {
		var card = GetSelectedContacts()[0];
		url = card.getProperty("PhotoURI", "");
	}
	if (url != "" && url.indexOf("chrome") < 0)
		window.openDialog(url,"","resizable=no,height=500,width=500,chrome=yes,centerscreen");
}
	
function abContentPopupShowing() {
	if (! document.getSelection || document.getSelection() == "")
		document.getElementById("abContentPopupItem1").disabled = true;
	else
		document.getElementById("abContentPopupItem1").disabled = false;
	var photoURL = document.getElementById("cvPhoto").getAttribute("src");
	if (photoURL.length == 0 || photoURL.indexOf("chrome") > -1)
		document.getElementById("abContentPopupItem2").setAttribute("disabled","true");
	else
		document.getElementById("abContentPopupItem2").removeAttribute("disabled");
}

function openEditMultipleCards() {
	var cards = GetSelectedContacts();
	var ABuri = GetSelectedDirectory();
	var dir = GetDirectoryFromURI(ABuri);
	openDialog("chrome://morecols/content/editMultipleCards.xul","","chrome,modal,centerscreen", cards, dir);
}

function modifyCardsProperty() {
	// Store selected items indexes in an array, to be able to restore the selection at the end
	var start = new Object();
	var end = new Object();
	var sel = [];
	var tree =  opener.document.getElementById("abResultsTree");
	var numRanges = tree.view.selection.getRangeCount();  
	for (var t = 0; t < numRanges; t++) {
		tree.view.selection.getRangeAt(t,start,end);
		for (var v = start.value; v <= end.value; v++) {
			sel.push(v);
		}
	}

	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	var cards = window.arguments[0];
	var dir = window.arguments[1];
	
	for (i=0;i<cards.length;i++) {
		if (! cards[i].isMailList) {

			if (document.getElementById("catCheck").checked) {
				var mode = document.getElementById("mode").selectedIndex;
				var sep = prefs.getCharPref("morecols.category.separator");
				var catArray = [];
				if (prefs.getBoolPref("morecols.category.advanced_view")) {
					for (var j=1;j<25;j++) {
						var x = document.getElementById("Category"+(j).toString()).value;
						if (x == "")
							continue;
						else 
							catArray.push(x);
					}
				}
				else
					var catArray = document.getElementById("Category").value.split(sep);
				
				if (mode == 2)
					// in "Assign" mode, the value must set to null
					var cardCat = "";
				else
					var cardCat = cards[i].getProperty("Category", "");
							
				for (var z=0;z<catArray.length;z++) {
					switch(mode) {
						case 0 : // Add
							var regExp1 = new RegExp("(\\b|\\,)\\s*"+catArray[z]+"\\s*\\b", "i");
							if (cardCat.search(regExp1) > -1)
								continue;
							if (cardCat != "")
								cardCat += sep + " " + catArray[z];
							else
								cardCat = catArray[z];		
							break;
						case 1 :  // delete
							var regExp1 = new RegExp("(\\b|\\,)\\s*"+catArray[z]+"\\s*\\b", "i");
							cardCat = cardCat.replace(regExp1, "");
							// delete spaces and comma at the beginning - it happens when is deleted the first item
							cardCat = cardCat.replace(/^\s*\,\s/g, "");
							break;						
						default: // Assign 
							if (cardCat != "")
								cardCat += sep + " " + catArray[z];
							else
								cardCat = catArray[z];		
					}
				}
				
				cards[i].setProperty("Category", cardCat);
			}		

			if (document.getElementById("compCheck").checked)
				cards[i].setProperty("Company", document.getElementById("comp").value);
			if (document.getElementById("cust1.label").checked)
				cards[i].setProperty("Custom1", document.getElementById("cust1").value);
			if (document.getElementById("cust2.label").checked)
				cards[i].setProperty("Custom2", document.getElementById("cust2").value);
			if (document.getElementById("cust3.label").checked)
				cards[i].setProperty("Custom3", document.getElementById("cust3").value);
			if (document.getElementById("cust4.label").checked)
				cards[i].setProperty("Custom4", document.getElementById("cust4").value);
			if (document.getElementById("preferMailFormatCheck").checked)
				cards[i].setProperty("PreferMailFormat", document.getElementById("preferMailFormatList").value);
			if (document.getElementById("allowRemoteContentCheck").checked) {
				if (document.getElementById("allowRemoteContentList").value == "0")
					cards[i].setProperty("AllowRemoteContent", false);
				else
					cards[i].setProperty("AllowRemoteContent", true);
			}
			if (document.getElementById("faxCheck").checked)
				cards[i].setProperty("FaxNumber", document.getElementById("fax").value);
			if (document.getElementById("titleCheck").checked)
				cards[i].setProperty("JobTitle", document.getElementById("title").value);
			if (document.getElementById("departCheck").checked)
				cards[i].setProperty("Department", document.getElementById("depart").value);
			if (document.getElementById("waddressCheck").checked)
				cards[i].setProperty("WorkAddress", document.getElementById("waddress").value);
			if (document.getElementById("wcityCheck").checked)
				cards[i].setProperty("WorkCity", document.getElementById("wcity").value);
			if (document.getElementById("wstateCheck").checked)
				cards[i].setProperty("WorkState", document.getElementById("wstate").value);
			if (document.getElementById("wcodeCheck").checked)
				cards[i].setProperty("WorkZipCode", document.getElementById("wcode").value);
			if (document.getElementById("wcountryCheck").checked)
				cards[i].setProperty("WorkCountry", document.getElementById("wcountry").value);
			if (document.getElementById("wwebCheck").checked)
				cards[i].setProperty("WebPage1", document.getElementById("wweb").value);
			if (document.getElementById("wtelCheck").checked)
				cards[i].setProperty("WorkPhone", document.getElementById("wtel").value);
			MFFAButils.getRealDir(dir,cards[i]).modifyCard(cards[i]);
		}
	}

	// Restore selection
	for (var i=0;i<sel.length;i++)
		tree.view.selection.rangedSelect(sel[i],sel[i],true);
}

function MFFABgetDir(card) {
	Components.utils.import("resource:///modules/mailServices.js");
	var dirId = card.directoryId.substring(0, card.directoryId.indexOf("&"));
	return MailServices.ab.getDirectoryFromId(dirId);
}



