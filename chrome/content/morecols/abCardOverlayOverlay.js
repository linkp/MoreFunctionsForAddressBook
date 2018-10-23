// You can also use this code, but please remember that you MUST change the names
// of the variables that store the original functions, otherwise we can have a compatibility problem
// TB 1.5 and lower uses SetCardValues function, TB 2.0 uses CheckAndSetCardValues
// This exists just on TB 2.0 or higher

function MFFABsetValues(cardproperty, doc) {
	try {
		var moreColsPrefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);
		cardproperty.setProperty("SpouseName", document.getElementById("SpouseName").value);
		cardproperty.setProperty("AnniversaryYear", document.getElementById("AnniversaryYear").value);
		cardproperty.setProperty("AnniversaryMonth", document.getElementById("AnniversaryMonth").value);
		cardproperty.setProperty("AnniversaryDay", document.getElementById("AnniversaryDay").value);
		if (moreColsPrefs.getBoolPref("morecols.category.advanced_view")) {
			var catFields = document.getElementsByClassName("advCat");
			var catValue = "";
			var sep = moreColsPrefs.getCharPref("morecols.category.separator");
			for (var i=0;i<catFields.length;i++) {
				var x = catFields[i].value;
				if (x == "")
					continue;
				if (catValue == "")
					catValue = x;
				else 
					catValue = catValue + sep + " " + x;
			}
			cardproperty.setProperty("Category", catValue);
		}
		else
			cardproperty.setProperty("Category", document.getElementById("Category").value);
		for (var i=1;i<11;i++) {
			if (document.getElementById("extraCustom"+i))
				cardproperty.setProperty("MFFABcustom"+i, document.getElementById("extraCustom"+i).value);
		}

		for (var i=1;i<6;i++) {
			if (document.getElementById("extraEmail"+i))
				cardproperty.setProperty("MFFABemail"+i, document.getElementById("extraEmail"+i).value);
		  }
	}
	catch(e) {}

	if ( ! document.getElementById("BirthBox").getAttribute("hidden") ) {
		cardproperty.setProperty("BirthYear", document.getElementById("BirthYear2").value);
		cardproperty.setProperty("BirthMonth", document.getElementById("BirthMonth2").value);
		cardproperty.setProperty("BirthDay", document.getElementById("BirthDay2").value);
	}

	if (! MFFABobj.isEdit && moreColsPrefs.getBoolPref("morecols.newcard.add_to_seleted_list")) {
		MFFABobj.card = cardproperty;
		MFFABobj.okButton = true;
	}

	var fileProp = "";
	var defProp = "";
	var files = document.getElementById("MFFABfileContainer0").getElementsByTagName("label");
	var tboxs = document.getElementById("MFFABfileContainer0").getElementsByTagName("textbox");
	for (var i=0;i<files.length;i++) {
		var remove = files[i].getAttribute("remove");
		if (remove == "true") {
			try {
				var fileToRemove = MFFABfileutils.getFilesDir();
				fileToRemove.append(files[i].getAttribute("value"));
				fileToRemove.remove(false);
			}
			catch(e) {}
			continue;
		}
		if (! fileProp){
			fileProp = files[i].getAttribute("value");
			defProp = tboxs[i].value;
		}
		else {
			fileProp = fileProp + "§§§" + files[i].getAttribute("value");
			defProp = defProp + "§§§" + tboxs[i].value;
		}
	}
	cardproperty.setProperty("MFFABfiles",fileProp);
	cardproperty.setProperty("MFFABfilesDesc",defProp);
	MFFABobj.exit();
	return true;
}



var MFFABobj = {

	init: function() {
		window.removeEventListener("load", MFFABobj.init, false);
		window.addEventListener("unload",MFFABobj.exit, true);
		gOnSaveListeners.push(MFFABsetValues);		
		var cardproperty = gEditCard.card;
		MFFABobj.isEditCard();
		try {
			if ("escapedVCardStr" in window.arguments[0]) {
				// If this is the account personal vCard, the extra tabs are hidden
				// because its data are not interesting for this purpose
				document.getElementById("extraTab").hidden = true;
				document.getElementById("extraCustomTab").hidden = true;
				document.getElementById("extraEmail").hidden = true;
				document.getElementById("abListTab").hidden = true;
				document.getElementById("listTopIcon").hidden = true;
				return;
			}
		
		var moreColsPrefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);
		
		if (moreColsPrefs.getBoolPref("morecols.extrafields.hide"))
			document.getElementById("extraCustomTab").hidden = true;

		document.getElementById("SpouseName").value = cardproperty.getProperty("SpouseName", "");

		if (moreColsPrefs.getBoolPref("morecols.category.top_icon_show")) 
			document.getElementById("listTopIcon").parentNode.removeAttribute("collapsed");
		else
			document.getElementById("listTopIcon").parentNode.setAttribute("collapsed", "true");

		var catValue = cardproperty.getProperty("Category", "");
		document.getElementById("Category").value = catValue;
		if (moreColsPrefs.getBoolPref("morecols.category.advanced_view")) {
			fillCategoryField(document, catValue);
			// setCatAdvancedViewBox();
		}
		else  {
			document.getElementById("catStandardView").removeAttribute("hidden");
			document.getElementById("catAdvancedView").setAttribute("hidden", "true");
		}
	
		document.getElementById("AnniversaryYear").value = cardproperty.getProperty("AnniversaryYear", "");
		document.getElementById("AnniversaryMonth").value = cardproperty.getProperty("AnniversaryMonth", "");
		document.getElementById("AnniversaryDay").value = cardproperty.getProperty("AnniversaryDay", "");
		
		document.getElementById("BirthYear2").value = cardproperty.getProperty("BirthYear", "");
		document.getElementById("BirthMonth2").value = cardproperty.getProperty("BirthMonth", "");
		document.getElementById("BirthDay2").value = cardproperty.getProperty("BirthDay", "");

		var abURI = window.arguments[0].abURI;
		var insertCreateDate = moreColsPrefs.getBoolPref("morecols.newcontact.insert_date");
	
		if (insertCreateDate && (! MFFABobj.isEdit)) {
			if (cardproperty.getProperty("LastModifiedDate",0) < 1)
				cardproperty.setProperty("LastModifiedDate", getNowParsed());
		}

		if (cardproperty.getProperty("LastModifiedDate",0) > 0) {
			var dateparts = convertPRTimeToString(cardproperty.getProperty("LastModifiedDate",0) * 1000000).split(gSearchDateSeparator);
			document.getElementById("LastModifiedDate").value = formatDayMonthYear(dateparts[0],dateparts[1],dateparts[2]);
		}
		else 
			document.getElementById("LastModifiedDate").value = "";

		for (i=1;i<5;i++) {
			var id;
			var custom = getCustomizedLabelForIndex(i);
			if (custom) {
				id = "Custom"+i;
				document.getElementById(id).previousSibling.value =  custom +" :";
			}
			var extraMailLabel = MFFAButils.getUncertainCharPref("morecols.extra_email"+i.toString()+".label");
			if (extraMailLabel) {
				id = "extraEmail"+i;
				document.getElementById(id).previousSibling.value =  extraMailLabel +" :";
			}
		}
		
		for (i=1;i<11;i++) {
			custom = getCustomizedLabelForIndex(100+i);
			if (custom) {
				var id = "extraCustom"+i;
				document.getElementById(id).previousSibling.value =  custom +" :";
			}
		}
		} // try end
		catch(e) {}
	
		for (var i=1;i<11;i++) 
			document.getElementById("extraCustom"+i).value = cardproperty.getProperty("MFFABcustom"+i, "");
		for (var i=1;i<6;i++) 
			document.getElementById("extraEmail"+i).value = cardproperty.getProperty("MFFABemail"+i, "");
		// If there is just a photo in MFFAB-0.5 style, transform it in a TB3 style one	
		if (cardproperty.getProperty("PhotoType", "") != "web" && cardproperty.getProperty("PhotoType", "") != "file" ) {
			var photoFile = existsPhotoForCard();
			if (photoFile) {
				document.getElementById("PhotoFile").file = photoFile;
			        updatePhoto("file");
			}
		}
		var genFiles = cardproperty.getProperty("MFFABfiles","*").split("§§§");
		var genFilesDesc = cardproperty.getProperty("MFFABfilesDesc","").split("§§§");
		for (var i=0;i<genFiles.length;i++)
			MFFABfileutils.newGenericFile(genFiles[i],true,genFilesDesc[i]);
	},

	exit: function() {
		try {
			if ("selectedAB" in window.arguments[0] && window.arguments[0].selectedAB == kAllDirectoryRoot + "?") 
				MFFAButils.refreshDirTree(0)
		}
		catch(e) {}
	}, 
	
	// By default, if you create a new contact with a mail list selected, Thunderbird will add it just in the parent addressbook.
	// With this function, the new contact is automatically added in the selected mail list too
	addCardInSelectedMailList: function() {
		if (! MFFABobj.card || MFFABobj.isEdit || ! MFFABobj.okButton)
			return;
		try {
			var mailList = GetDirectoryFromURI(window.arguments[0].selectedAB);
			if (mailList.isMailList) {
				mailList.addressLists.appendElement(MFFABobj.card, false);
				mailList.editMailListToDatabase(null);
				// The new contact is visible just if the mail list view is refreshed, and there is no function to do it,
				// so I unselect the list and than i select it again...it's quite awful, I know, if you find a better way
				// please email me it!
				MFFAButils.refreshDirTree(opener.document.getElementById("dirTree").currentIndex);
			}
		}
		catch(e) {}
	},

	isEditCard : function() {
		if (document.location.href.indexOf("Edit") > 1)
			MFFABobj.isEdit = true;
		else
			MFFABobj.isEdit = false;
	}
};
	
function showMFFABstyle(el) {
	el.setAttribute("hidden", "true");
	document.getElementById("BirthBox").removeAttribute("hidden");
	window.sizeToContent();
}


function searchForABandList(button) {
	button.setAttribute("disabled", "true");
	var lists = MFFAButils.searchAB(gEditCard.card);
	var box = document.getElementById("ABbox");
	var items = box.getElementsByTagName("listitem");
	for (var z=items.length-1;z>-1;z--)
		box.removeChild(items[z]);
	for (var i=0;i<lists.length;i++) 
		addItem(lists[i].split("§§§")[0], lists[i].split("§§§")[1], box);
	button.removeAttribute("disabled");
	
	function addItem(cLab, dLab, box) {
		var item = document.createElement("listitem");
		var cell = document.createElement("listcell");
		cell.setAttribute("label", cLab);
		var cell2 = document.createElement("listcell");
		cell2.setAttribute("label", dLab);
		item.appendChild(cell);
		item.appendChild(cell2);
		box.appendChild(item);
	}
}

window.addEventListener("load", MFFABobj.init, false);


