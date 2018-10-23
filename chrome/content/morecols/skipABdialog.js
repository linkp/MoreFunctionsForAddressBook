var prefs = Components.classes["@mozilla.org/preferences-service;1"]
	.getService(Components.interfaces.nsIPrefBranch);
var idPref;


function AppendNewItem(abName, URI) {
	if (prefs.prefHasUserValue(idPref)) {
		var noAbList = prefs.getCharPref(idPref);
		var arr = noAbList.split(",");
	}
	else
		var arr = null;
	var list = document.getElementById("list");
	var item = document.createElement("treeitem");
	var row = document.createElement("treerow");
	var cell1 = document.createElement("treecell");
	var cell2 = document.createElement("treecell");
	cell1.setAttribute("value", "true");
	if (arr) {
		for (var i=0;i<arr.length;i++) {
			if (arr[i] == URI) {
				cell1.setAttribute("value", "false");
				break;
			}
		}	
	}	
	cell2.setAttribute("label", abName);
	cell2.setAttribute("URI", URI);
	row.appendChild(cell1);
	row.appendChild(cell2);
	item.appendChild(row);
	list.appendChild(item);
}

function onLoad() {
	var key = window.arguments[0];
	idPref = "mail.identity."+key+".skippedAddressbook";
	let abManager = Components.classes["@mozilla.org/abmanager;1"]
		.getService(Components.interfaces.nsIAbManager);
	let allAddressBooks = abManager.directories;
	while (allAddressBooks.hasMoreElements()) {
		let addressBook = allAddressBooks.getNext();
		addressBook = addressBook.QueryInterface(Components.interfaces.nsIAbDirectory);
		AppendNewItem(addressBook.dirName, addressBook.URI)
	}
}

function onClose() {
	var content = "";
	var tree = document.getElementById("tree");  
	var items = tree.getElementsByTagName('treecell');
	for (var i=0; i<items.length; i=i+2) {
		if (items[i].getAttribute("value") == "false") 
			if (content)
				content = content + "," + items[i+1].getAttribute("URI");
			else
				content = items[i+1].getAttribute("URI");
	}
	if (content)
		prefs.setCharPref(idPref,content);
	else
		prefs.deleteBranch(idPref);
}
