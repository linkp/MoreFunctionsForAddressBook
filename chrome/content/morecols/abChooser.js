var importDir;
var abManager = Components.classes["@mozilla.org/abmanager;1"]  
		.getService(Components.interfaces.nsIAbManager);  

function init() {
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
	if (window.arguments[1]) {
		importDir = false;
		document.getElementById("nameBox").collapsed = true;
	}
	else {
		importDir = true;
		document.getElementById("boxLabel").value = MCbundle.GetStringFromName("listFromRecipientsName")+":";
		document.getElementById("formatBox").collapsed = true;
	}
}

function checkDirName(dirName) {
	if (abManager.mailListNameExists(dirName)) {
		alert("There is another list with this name");
		return false;
	}
	if (document.getElementById("nameValue").value.trim().length == 0) {
		alert("Insert a name for the list");
		return false;
	}
	return true;
}

function onOK() {
	if (importDir) {
		var dirName = document.getElementById("nameValue").value;
		if (! checkDirName(dirName))
			return false;
		else
			window.arguments[0].dirName = dirName;
	}
	window.arguments[0].URI  = document.getElementById("abPopup").selectedItem.value;
	window.arguments[0].format = document.getElementById("formatPopup").selectedIndex;
}

