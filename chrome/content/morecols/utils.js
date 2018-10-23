Components.utils.import("resource:///modules/mailServices.js");
var MCgABuri = "moz-abdirectory://?";
var MCstrBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                .getService(Components.interfaces.nsIStringBundleService);
var MCbundle = MCstrBundleService.createBundle("chrome://morecols/locale/morecols.properties");
var MCbundle2 = MCstrBundleService.createBundle("chrome://messenger/locale/importMsgs.properties");
var kMFABprops = ["FirstName", "LastName", "DisplayName", "NickName", "SpouseName", "Category", "PrimaryEmail", "SecondEmail", "HomeAddress", "HomeAddress2", "HomeCity", "HomeState", "HomeZipCode", "HomeCountry", "HomePhone", "WorkAddress", "WorkAddress2", "WorkCity", "WorkState", "WorkZipCode", "WorkCountry", "WorkPhone", "FaxNumber", "PagerNumber", "CellularNumber", "JobTitle", "Department", "Company", "AnniversaryYear", "AnniversaryMonth", "AnniversaryDay","BirthYear", "BirthMonth", "BirthDay", "WebPage1", "WebPage2", "Custom1", "Custom2", "Custom3", "Custom4", "Notes"];


function fillListDialog(addresses) { 
	// Clone the original widget
	var listbox = document.getElementById('addressingWidget');
	var newListBoxNode = listbox.cloneNode(false);
	var templateNode = listbox.getElementsByTagName("listitem")[0];
	// Pass the nodes to the function
	createNewListBox(newListBoxNode, templateNode,addresses);
	// Replace the empty original node, with the new one filled
	var parent = listbox.parentNode;
	parent.replaceChild(newListBoxNode, listbox);
	setTimeout(AppendLastRow, 0);
}


function createNewListBox(newListBoxNode, templateNode, addresses) {
	// Fill the cloned node with the addresses and the ids
	for (i=0;i<addresses.length;i++) {
		var newNode = templateNode.cloneNode(true);
		newListBoxNode.appendChild(newNode);
		newNode.getElementsByTagName("textbox")[0].value = addresses[i];
		newNode.getElementsByTagName("textbox")[0].setAttribute("value", addresses[i]);
		newNode.getElementsByTagName("textbox")[0].setAttribute("id", "addressCol1#" + (i+1));		
	}
}

function getFilenameByCard(card) {
	var filename =  card.getProperty("DisplayName", "") ?  card.getProperty("DisplayName", "") : card.getProperty("PrimaryEmail", "");
	if (filename != "")
		filename = normalizeFileName(filename);
	else
		filename = "unknown";
	return filename;
}


function getFileFromFilePicker(title,mode,filter,filename) {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	if (mode == "GetFolder")
		fp.init(window, title, nsIFilePicker.modeGetFolder );
	else if (mode == "Open")
		fp.init(window, title, nsIFilePicker.modeOpen );
	else if (mode == "OpenMultiple")
		fp.init(window, title, nsIFilePicker.modeOpenMultiple);
	else if (mode == "Save") {
		fp.defaultString = filename;
		fp.init(window, title, nsIFilePicker.modeSave);
	}
	else
		return false;
	if (filter == "all")
		fp.appendFilters(nsIFilePicker.filterAll);
	else 
		fp.appendFilter(filter,filter);
	if (fp.show)
		var rv = fp.show();
	else
		var rv = MFFABopenFPsync(fp);
	if (rv == nsIFilePicker.returnOK && mode == "OpenMultiple")
		return fp.files;
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace)
		return fp.file;
	else
		return false;
}

// credit for this code to Jorg K
// see https://bugzilla.mozilla.org/show_bug.cgi?id=1427722
function MFFABopenFPsync(fp) {
	let done = false;
	let rv, result;
	fp.open(result => {
		rv = result;
		done = true;
	});
	let thread = Components.classes["@mozilla.org/thread-manager;1"].getService().currentThread;
	while (!done) {
		thread.processNextEvent(true);
	}
	return rv;
}

function disableABitems() {
	var ABtree = document.getElementById("abResultsTree");
	var alsoLists = false;
	var start = new Object();
	var end = new Object();
	var treeSelection = ABtree.view.selection;
	var numRanges = treeSelection.getRangeCount();
	for (var t=0; t<numRanges; t++) {
		treeSelection.getRangeAt(t,start,end);
		for (var v=start.value; v<=end.value; v++) {
			var card = gAbView.getCardFromRow(v);
			if (card.isMailList) {
				alsoLists = true;
				break;
			}
		}
	}

	var nodes = document.getElementById("abMenuCopyOther").getElementsByTagName("menuitem");
	
	if (numRanges >1) {
		document.getElementById("abEditAsNewCard").setAttribute("disabled", "true");
		document.getElementById("cmd_multiple_properties").removeAttribute("disabled");
	}
	else if (! alsoLists) {
		document.getElementById("abEditAsNewCard").removeAttribute("disabled");
		document.getElementById("cmd_multiple_properties").setAttribute("disabled", "true");
	}

	if (alsoLists) {
		document.getElementById("abEditAsNewCard").setAttribute("disabled", "true");
		document.getElementById("abResultsTreeContext-copyAddress1").setAttribute("disabled", "true");
		document.getElementById("abResultsTreeContext-copyAddress2").setAttribute("disabled", "true");
		document.getElementById("abForwardVcard").setAttribute("disabled", "true");
		document.getElementById("cmd_multiple_properties").setAttribute("disabled", "true");
		for (var k=0;k<(nodes.length-1);k++)
			nodes[k].setAttribute("disabled", "true");
	}
	else  {
		for (var k=0;k<(nodes.length-1);k++)
			nodes[k].removeAttribute("disabled");
		document.getElementById("abResultsTreeContext-copyAddress1").removeAttribute("disabled");
		document.getElementById("abResultsTreeContext-copyAddress2").removeAttribute("disabled");
		document.getElementById("abForwardVcard").removeAttribute("disabled", "true");	
		document.getElementById("cmd_multiple_properties").removeAttribute("disabled");	
	}
}

function disableABitems2() {
	var abURI = GetSelectedDirectory();
	if (abURI == MCgABuri) {
		document.getElementById("abDirTreeContextRecover").setAttribute("disabled", "true");
		document.getElementById("abDirTreeContextABexport").setAttribute("disabled", "true");
		return;
	}
	else
		document.getElementById("abDirTreeContextABexport").removeAttribute("disabled");
	var addrBook = GetDirectoryFromURI(abURI);
	if (addrBook.isMailList) {
		document.getElementById("abDirTreeContextRecover").setAttribute("disabled", "true");
		document.getElementById("abDirTreeContextExpMab").setAttribute("collapsed", "true");
		document.getElementById("abDirTreeContextExpList").removeAttribute("collapsed");
	}
	else {
		document.getElementById("abDirTreeContextRecover").removeAttribute("disabled");
		document.getElementById("abDirTreeContextExpList").setAttribute("collapsed", "true");
		document.getElementById("abDirTreeContextExpMab").removeAttribute("collapsed");
	}
}

function normalizeFileName(filename) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	filename = filename.replace(/[\/\\:,<>*\?\"\|\']/g,"_");
	if (prefs.getBoolPref("morecols.export.use_original_name"))
		return filename;
	// replaces spaces with underscores
	filename = filename.replace(/ /g,"_");
	// replace with a "_" all the characters differents from aA-zZ0-9
	filename = filename.replace(/\W/g, "_");
	return filename;
}


function findGoodName(filename,file,ext) {
	var fileclone = file.clone();
	var suffix = 0;
	var newfilename = filename+ext;
        fileclone.append(newfilename);
        while (fileclone.exists()) {
                suffix++;
                newfilename = filename + "-"+suffix.toString()+ext;
                fileclone = file.clone();
                fileclone.append(newfilename);
        }
	return newfilename;
}

function getNowParsed() {
	var now = new Date();
	var createdate = now.getTime();
	var nag = parseInt(createdate/1000000) * 1000;
	return nag;
}

function checkCustomFields() {
	for (i=1;i<5;i++) {
		var custom = getCustomizedLabelForIndex(i);
		if (custom != "") {
			var id = "cust"+i+".label";
			document.getElementById(id).label =  custom +":";
		}
	}
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	if (prefs.getBoolPref("morecols.category.advanced_view")) {
		document.getElementById("catStandardView").setAttribute("hidden", "true");
		document.getElementById("catAdvancedView").removeAttribute("hidden");
	}
	else  {
		document.getElementById("catStandardView").removeAttribute("hidden");
		document.getElementById("catAdvancedView").setAttribute("hidden", "true");
	}
	setCatAdvancedViewBox();
}

function formatDayMonthYear(day,month,year) {
	if (! day || ! month || ! year)
		return day;
	var form = "";
	try {
		var SDF = Components.classes["@mozilla.org/intl/scriptabledateformat;1"]
                 .getService(Components.interfaces.nsIScriptableDateFormat);
		var form = SDF.FormatDate("", SDF.dateFormatShort, year, month, day);
		if (form == "--" || form == gSearchDateSeparator+gSearchDateSeparator)
			form = "";
	}
	catch(e) {}
	return form;
}
	

function getCustomizedLabelForIndex(index) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	try {
		if (index < 100) 
			var prefName = "morecols.custom"+index+".label";
		else 
			var prefName = "morecols.MFFABcustom"+(index-100)+".label";
		return prefs.getComplexValue(prefName,Components.interfaces.nsISupportsString).data;
	}
	catch(e) {
		return "";
	}
}

function openCatDialog() {
	var cats = "";
	if (document.getElementById("Category"))
		cats = document.getElementById("Category").value;
	var catDialog = window.openDialog("chrome://morecols/content/catDialog.xul", "", "chrome,resizable=no,titlebar,centerscreen", cats);
}

function openSkipAbDialog(type) {
	var key = null;
	if (type == 1) 
		key = getCurrentIdentity().key;
	else {
		if (typeof gIdentity == "undefined")
			key = top.currentAccount.defaultIdentity.key;
		else
			key = gIdentity.key
	}
	if (key)
		window.openDialog("chrome://morecols/content/skipABdialog.xul", "", "chrome,resizable=no,titlebar,centerscreen", key);
	else
		alert(MCbundle.GetStringFromName("skipAbAbort"));
}

function fillCategoryField(doc, catValue) {
	try {
	doc.getElementById("catStandardView").setAttribute("hidden", "true");
	var moreColsPrefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	var vbox = doc.getElementById("catAdvancedViewVbox");
	var hbox = vbox.lastChild;
	var catFields = moreColsPrefs.getIntPref("morecols.category.advanced_view_box");
	var sep = moreColsPrefs.getCharPref("morecols.category.separator");
	var cats = catValue.split(sep);
	var ratio = (cats.length)/8;
	if (ratio > catFields)
		catFields = Math.ceil(ratio);
	if (catFields > 6) 
		catFields = 6;
	for (var i=1; i<catFields;i++) {
		var newHbox = hbox.cloneNode(true);
		vbox.appendChild(newHbox);
		newHbox = hbox.cloneNode(true);
		vbox.appendChild(newHbox);
	}
	doc.getElementById("catAdvancedView").removeAttribute("hidden");
	var fields = doc.getElementsByClassName("advCat");
	for (var i=0;i<cats.length;i++) {
		var cat = cats[i].replace(/^\s+/,"");
		cat = cat.replace(/\s+$/,"");
		fields[i].value = cat;
	}	
	}
	catch(e) {}
}

var MFFAButils = {

	prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),

	setComplexPref : function(prefname,value) {
		if (MFFAButils.prefs.setStringPref) {
			MFFAButils.prefs.setStringPref(prefname,value);
		}
		else {
			var str = Components.classes["@mozilla.org/supports-string;1"]
				.createInstance(Components.interfaces.nsISupportsString);
			str.data = value;
			MFFAButils.prefs.setComplexValue(prefname, Components.interfaces.nsISupportsString, str);
		}
	},	

	getComplexPref : function(prefname) {
		var value;
		if (MFFAButils.prefs.getStringPref) 
			value = MFFAButils.prefs.getStringPref(prefname);
		else
			value = MFFAButils.prefs.getComplexValue(prefname,Components.interfaces.nsISupportsString).data;
		return value;
	},	

	refreshDirTree : function(index) {
		try {
			var dirTree = opener.document.getElementById("dirTree");
			var index = dirTree.currentIndex;
			dirTree.view.selection.select(-1);
			dirTree.view.selection.select(index);
		}
		catch(e) {}
	},

	getRealDir : function (dir,card) {
		try {
			if (dir.URI == MCgABuri) {
				var dirId = card.directoryId.substring(0, card.directoryId.indexOf("&"));
				return MailServices.ab.getDirectoryFromId(dirId);
			}
		}
		catch(e) {}
		return dir;
	},

	addCard  : function(dir,card) {
		var skip = MFFAButils.prefs.getBoolPref("morecols.import.skip_first_email_exist");
		var test = null;
		if (skip) {
			let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
			let allAddressBooks = abManager.directories; 
			while (!test && allAddressBooks.hasMoreElements()) {
				let ab = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
				var test = ab.getCardFromProperty("PrimaryEmail", card.primaryEmail, false); 
			}
		}
		if (! test) {
			var addedCard = dir.addCard(card);
			return addedCard;
		}
		else
			return null;
	},

	getPhotoFile : function(card) {
		var file = null;
		var uri = card.getProperty("PhotoURI", "");
		if (uri) {
			try {
				var ios = Components.classes["@mozilla.org/network/io-service;1"]
					.getService(Components.interfaces.nsIIOService);
				var URL =  ios.newURI(uri,null,null);
				file = URL.QueryInterface(Components.interfaces.nsIFileURL).file;
				if (! file.exists())
					file = null;
			}
			catch(e) {
				file = null;
			}
		}
		else
			file = existsPhotoForCard(card);
		return file;
	},

	getUncertainCharPref : function(pref) {
		var value = "";
		try {
			 value = MFFAButils.prefs.getComplexValue(pref, Components.interfaces.nsISupportsString).data;
		}
		catch(e) {}
		return value;
	},

	progressMeter : function(val1, val2) {
		var meter = document.getElementById("MFAABmeter");
		if (val1) {
			meter.removeAttribute("hidden");
			var val = (val1/val2)*100;
			meter.setAttribute("value", val);
		}
		else {
			meter.setAttribute("value", 100);
			setTimeout(function() {meter.setAttribute("hidden", "true")}, 2000);		
		}
	},

	searchAB : function(card) {
		var addresses = [card.primaryEmail, card.secondEmail];
		for (var i=1;i<6;i++) {
			var addEmail = card.getProperty("MFFABemail"+i, "");
			if (addEmail)
				addresses.push(addEmail);
		}
		var books = Components.classes["@mozilla.org/abmanager;1"]
			.getService(Components.interfaces.nsIAbManager).directories;
		var dirs = [];
		var listsArray = [];
		while (books.hasMoreElements()) {
			var ab = books.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
			for (var k=0;k<addresses.length;k++) {
				var emailAddress = addresses[k];
				var foundCard = ab.cardForEmailAddress(emailAddress);
			
				if (! foundCard) {
					for (var i=1;i<6;i++) {
						var foundCard = ab.getCardFromProperty("MFFABemail"+i,emailAddress,false);
						if (foundCard) 
							break;
					}
				}
			
				if (foundCard) {
					var lists = scanLists(ab.addressLists,emailAddress);
					var record = ab.dirName+"§§§"+lists;
					listsArray.push(record);
					break;
				}
			}
		}
		
		return listsArray;
		
		function scanLists(lists, addresses) {
			var lArray = [];
			for (var i=0;i<lists.length;i++) {
				var list = lists.queryElementAt(i,Components.interfaces.nsIAbDirectory);
				var	entries = list.addressLists;
				for (var j=0;j<entries.length;j++) {
					var a = entries.queryElementAt(j,Components.interfaces.nsIAbCard);
					if (a.primaryEmail == emailAddress) {
						lArray.push(list.dirName);
						break;
					}
				}
			}
			return lArray.toString();
		}
	},

	copy : function(data) {
		// Generic function to copy the data
		var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"];
		clipboard = clipboard.getService(Components.interfaces.nsIClipboardHelper);
		clipboard.copyString(data);
	},

	CSVimport : function() {
		var obj = {}
		openDialog("chrome://morecols/content/CSVimportDialog.xul","","chrome,modal,centerscreen",obj);		
		if (! obj.arr)
			return;
		setTimeout(MFFAButils.CSVimportDelayed, 500,obj);
	},

	CSVimportDelayed : function(obj) {
		var ABman = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager)
		var ABid = ABman.newAddressBook(obj.mabName, "", kPABDirectory);
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
		if (moreColsPrefs.getIntPref("morecols.export.csv_separator") == 0) {
			var sep = ",";
			var reg = /\"[^\"]*\,[^\"]*\"/g;
			var reg2 = new RegExp(",","g");
		}
		else {
			var sep = ";";
			var reg = /\"[^\"]*\;[^\"]*\"/g;
			var reg2 = new RegExp(";","g");
		}

		var firstline = true;
		var data = "";
		try {
			var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
		}
		catch(e) {
			var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsIFile);
		}
		file.initWithPath(obj.filePath);
		var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
	              createInstance(Components.interfaces.nsIFileInputStream);
		var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
	              createInstance(Components.interfaces.nsIConverterInputStream);
		fstream.init(file, -1, 0, 0);
		cstream.init(fstream, obj.charset, 0, 0); 
		var read = 0;
		var first = true;
		while (first || read != 0)  {
			first = false;
			var str = {};
			read = cstream.readString(0xffffffff, str);
			data += str.value;
		} 
		cstream.close();
		data = data.replace(/\r/g, "");
		data = data.replace(/\"\"\"/g, "°°°");
		var quoteReg = /\"[^"]+\"/g;
		var quotes = data.match(quoteReg);
		if (quotes) {
			for (var z=0;z<quotes.length;z++) {
				var temp = quotes[z].replace(/\n/g, "&&&");
				temp = temp.replace(sep, "§§§");
				data = data.replace(quotes[z], temp);
			}
		}
		var contacts = data.split("\n");
		var start = obj.skipFirstLine ? 1 : 0;
		for (var i=start;i<contacts.length;i++) {
			if (! contacts[i])
				continue;
			var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
				.createInstance(Components.interfaces.nsIAbCard);
			var values = contacts[i].split(sep);
			for (var j=0;j<values.length;j++) {
				var cleanValue = values[j].replace(/§§§/g, sep);	
				cleanValue = cleanValue.replace(/^\"/, "");
				cleanValue = cleanValue.replace(/\"$/, "");
				cleanValue = cleanValue.replace(/\"\"/g, '\"');
				cleanValue = cleanValue.replace(/&&&/g, "\n");
				cleanValue = cleanValue.replace(/°°°/g, '"');
				card.setProperty(obj.arr[j], cleanValue);
			}	
			aBook.addCard(card);
		}
	},

	createListWithAddress : function(dirname, addresses, abURI) {
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		var ab = abManager.getDirectory(abURI); 
		var mailList = Components.classes["@mozilla.org/addressbook/directoryproperty;1"].createInstance();
		mailList = mailList.QueryInterface(Components.interfaces.nsIAbDirectory);
		mailList.dirName = dirname;
		mailList.isMailList = true;
		var parser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
		for (var i=0;i<addresses.length;i++) {
	    		var c = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance();
            		c = c.QueryInterface(Components.interfaces.nsIAbCard);
			c.primaryEmail = parser.extractHeaderAddressMailboxes(addresses[i]);
			c.displayName = parser.extractHeaderAddressNames(addresses[i]);
			mailList.addressLists.appendElement(c, false);
		}
		ab.addMailList(mailList);
	}
};	

var MFFABfileutils = {

	getFilesDir : function(dialog) {
		var dir = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
		dir.append("MFFABfiles");
		if (! dir.exists())
			dir.create(1,0755);
		if (dialog)
			var card = opener.gEditCard.card;
		else {
			try {
				var card = MFFABabCardView.card;
			}
			catch(e) {
				var card = gEditCard.card;
			}
		}
		var filesDir = card.getProperty("MFFABfilesDir","");
		if (filesDir.length == 0) {
			//if (dialog)
			//	return null;
			var now = new Date;
			filesDir = now.getTime();
			dir.append(filesDir);
			if (! dir.exists())
				dir.create(1,0755);			
			card.setProperty("MFFABfilesDir",filesDir);
		}
		else {
			dir.append(filesDir);
			if (! dir.exists())
				dir.create(1,0755);
		}
		return dir;
	},

	copyToProfDir : function(file,newName,card) {
		var dir = MFFABfileutils.getFilesDir(card);
		file.copyTo(dir,newName);
		dir.append(newName);
		return dir;
	}, 

	unique : function(filename) {
		var dir = MFFABfileutils.getFilesDir(true);
		var clone = dir.clone();
		clone.append(filename);
		var justName = filename.substring(0,filename.lastIndexOf("."));
		var ext = filename.substring(filename.lastIndexOf("."));
		var newName = filename;
		var index = 0;
		while (clone.exists()) {
			index++;
			clone = dir.clone();
			newName = justName+"-"+index+ext;
			clone.append(newName);
		}
		return newName;		
	},

	newGenericFile : function(fileName,onLoad,desc) {
		if (fileName == "*")
			return;
		var items = document.getElementById("MFFABfileContainer0").getElementsByTagName("label");
		if (items.length > 9) {
			alert(MCbundle.GetStringFromName("TooManyFiles"));
			return;
		}
		if (! fileName && ! onLoad) {
			var fileObj = {};
			window.openDialog("chrome://morecols/content/fileDialog.xul", "", "chrome, dialog, modal, resizable=yes", fileObj);
			if (fileObj.file) {
				MFFABfileutils.copyToProfDir(fileObj.file,fileObj.newName);
				fileName = fileObj.newName;
			}
			else 
				return;			
		}
		if (fileName) {
			var fhbox = document.createElement("row");
			fhbox.setAttribute("align", "center");
			var label = document.createElement("label");
			label.setAttribute("value", fileName);	
			label.setAttribute("class", "text-link");
			label.setAttribute("onclick", "MFFABfileutils.openFile(this)");
			fhbox.appendChild(label);
			var tbox = document.createElement("textbox");
			tbox.setAttribute("flex", "1");
			if (onLoad && desc)
				tbox.setAttribute("value", desc);	
			fhbox.appendChild(tbox);
			var image = document.createElement("image");	
			image.setAttribute("onclick", "MFFABfileutils.deleteFile(this)");
			image.setAttribute("src", "chrome://morecols/content/delete.png");
			image.setAttribute("height", "20");
			fhbox.appendChild(image);
			var fnLower = fileName.toLowerCase();
			if (items.length == 0)
				document.getElementById("MFFABfileContainer0").appendChild(fhbox);
			else {
				var index = 0;
				while (index <= items.length) {
					if (index == items.length) {
						document.getElementById("MFFABfileContainer0").appendChild(fhbox);
						break;
					}
					else if (items[index].getAttribute("value").toLowerCase() > fnLower) {
						document.getElementById("MFFABfileContainer0").insertBefore(fhbox,items[index].parentNode);
						break
					}
					else
						index++;
				}
			}
		}
	},

	deleteFile : function(el) {
		if (confirm(MCbundle.GetStringFromName("DeleteFile"))) {
			el.parentNode.style.display = "none";
			el.previousSibling.previousSibling.setAttribute("remove", "true");
		}
	},

	openFile : function(el) {
		if (el.getAttribute("value")) {
			var file = MFFABfileutils.getFilesDir();
			file.append(el.getAttribute("value"));
			file.launch();
		}
	},

	openFilesDir : function(card) {
		var dir = MFFABfileutils.getFilesDir(null,card);
		dir.launch();
	}
}



