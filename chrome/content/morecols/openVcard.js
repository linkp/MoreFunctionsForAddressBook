var gCard;
var abManager = Components.classes["@mozilla.org/abmanager;1"]  
	.getService(Components.interfaces.nsIAbManager);  

function openVcfFromCmdLine() {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	for (i=1;i<5;i++) {
		var custom = getCustomizedLabelForIndex(i);
		if (custom != "") {
			var id = "Custom"+i;
			document.getElementById(id).previousSibling.value =  custom +" :";
		}
	}

	for (i=1;i<11;i++) {
		custom = getCustomizedLabelForIndex(100+i);
		if (custom != "") {
			var id = "extraCustom"+i;
			document.getElementById(id).previousSibling.value =  custom +" :";
		}
	}

	if (! prefs.getBoolPref("morecols.category.advanced_view")) {
		document.getElementById("catStandardView").removeAttribute("hidden");
		document.getElementById("catAdvancedView").setAttribute("hidden", "true");
	}

	var allAddressBooks = abManager.directories;  
	var abPopup = document.getElementById("abPopup-menupopup"); 
	while (allAddressBooks.hasMoreElements()) {  
		var addressBook = allAddressBooks.getNext();  
		if (addressBook instanceof Components.interfaces.nsIAbDirectory ) {
			var item = document.createElement("menuitem");
			item.setAttribute("label", addressBook.dirName);
			item.setAttribute("value", addressBook.URI);
			abPopup.appendChild(item);
		}  
	}  
	abPopup.parentNode.selectedIndex = 0;

	var file = window.arguments[0].wrappedJSObject.file;
	document.title = file.leafName;
	var lines = fillFromVcard(file,true);
	gCard = vcf2nsIabCard(lines);
	// Open the new card dialog, we pass the nsifile to the new window
	// After a short delay, we fill the dialog with the data read from the vcf file
	setTimeout(function() {
		vcard2editWindow(null,lines,false,true);
	}, 1000);
}

function addvCard() {
	if (gCard) {
		var abPopup = document.getElementById("abPopup"); 
		var dir = abManager.getDirectory(abPopup.selectedItem.value);  
		MFFAButils.addCard(dir,gCard);
	}
}
