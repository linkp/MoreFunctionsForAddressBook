var prefs = Components.classes["@mozilla.org/preferences-service;1"]
	.getService(Components.interfaces.nsIPrefBranch);
var MCstrBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                .getService(Components.interfaces.nsIStringBundleService);
var MCbundle = MCstrBundleService.createBundle("chrome://morecols/locale/morecols.properties");

var gCatSep;

function formatStr(str) {
	var newStr = str.replace(/^\s+/, "");
	newStr = newStr.replace(/\s+$/, "");
	return newStr;
}

function unique(arr) {
	var newArr = [];
	var obj = {};
	for (var i=0;i<arr.length;i++) {
		var newName = formatStr(arr[i]);
		if (newName.length == 0)
			continue;
		var tempName = newName.toLowerCase().replace("@@@", "");
		if (! obj[tempName]) {
			obj[tempName] = true;
			if (newName.substring(0,1) == newName.substring(0,1).toLowerCase())
				newName = newName.substring(0,1).toUpperCase() + newName.substring(1) + "§§";
			newArr.push(newName);			
		}
	}
	obj = null;
	return newArr;
}

function onLoad() {
	var isEdit = (opener.location.href == "chrome://messenger/content/addressbook/abEditCardDialog.xul");
	if (window.arguments[1])
		document.getElementById("activeCol").setAttribute("collapsed", "true");

	gCatSep = prefs.getCharPref("morecols.category.separator");
	var catPrefList = [];
	try {
		var prefValue = MFFAButils.prefs.getComplexPref("morecols.categories.list");
		catPrefList = prefValue.split(gCatSep);
	}
	catch(e) {}
	
	if (prefs.getBoolPref("morecols.category.add_tags")) {
		var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
			.getService(Components.interfaces.nsIMsgTagService);
		var tagArray = tagService.getAllTags({});
		for (var i=0; i< tagArray.length; i++) 
			catPrefList.push(tagArray[i].tag+"@@@");
	}
	
	if (isEdit && prefs.getBoolPref("morecols.category.auto_add")) {
		document.getElementById("currentCats").value = window.arguments[0];
		var catWinList = window.arguments[0].split(gCatSep);
		var catGList = catPrefList.concat(catWinList);  
		catGList = unique(catGList);
	}
	else
		catGList = unique(catPrefList);
	catGList.sort();
	for (var i=0;i<catGList.length;i++)
		AppendNewItem(catGList[i]);

	if (! isEdit)
		document.getElementById("currentCardCats").setAttribute("hidden", "true");
}

function onClose() {
	var categories = "";
	var list = "";
	if (prefs.getBoolPref("morecols.category.advanced_view") && ! window.arguments[1]) {
		var catFields = opener.document.getElementsByClassName("advCat");
		for (var j=0;j<catFields.length;j++)
			catFields[j].value = "";
	}
	var tree = document.getElementById("tree");  
	var items = tree.getElementsByTagName('treecell');
	for (var i=0, z=0; i<items.length; i=i+2) {
		if (items[i+1].getAttribute("tag") != "true") {
			if (list == "")
				list = items[i+1].getAttribute("label");
			else
				list = list + gCatSep + " " + items[i+1].getAttribute("label");
		}
		if (items[i].getAttribute("value") == "true" && ! window.arguments[1]) {
			if (prefs.getBoolPref("morecols.category.advanced_view")) {
				catFields[z].value =  items[i+1].getAttribute("label");
				z++;
			}
			if (categories == "")
				categories = items[i+1].getAttribute("label");
			else
				categories = categories +  gCatSep + " " + items[i+1].getAttribute("label");
		}
    	}
	
	if (! window.arguments[1])
		opener.document.getElementById("Category").value = categories;
	MFFAButils.setComplexPref("morecols.categories.list", list);
}


function AddItem() {
	var newCatName = prompt(MCbundle.GetStringFromName("newCatName"), "");
	if (! newCatName)
		return;
	newCatName = formatStr(newCatName);
	if (newCatName.length == 0)
		return;
	var tree = document.getElementById("tree");  
	var items = tree.getElementsByTagName('treecell');
	var whereInsert = null;
	
	for (var i=0; i<items.length; i=i+2) {
		var lab = items[i+1].getAttribute("label");
		if (newCatName.toLowerCase() == lab.toLowerCase()) {
			alert(MCbundle.GetStringFromName("exist"));
			return;
		}
		else if (newCatName.toLowerCase() > lab.toLowerCase()) {
			whereInsert = items[i].parentNode.parentNode;
		}
    	}
	
	var list = document.getElementById("list");
	var item = document.createElement("treeitem");
	var row = document.createElement("treerow");
	var cell1 = document.createElement("treecell");
	var cell2 = document.createElement("treecell");
	cell2.setAttribute("label", newCatName);
	row.appendChild(cell1);
	row.appendChild(cell2);
	item.appendChild(row);
	if (whereInsert && whereInsert.nextSibling)
		whereInsert.parentNode.insertBefore(item, whereInsert.nextSibling);
	else
		list.appendChild(item);
}

function RemoveItem() {
	var tree = document.getElementById("tree");  
	var items = tree.getElementsByTagName('treeitem');
	for (var i=items.length-1;i>-1;i--) {
		if (tree.view.selection.isSelected(i)) {
			if (items[i].getAttribute("tag") == "true")
				alert("This element can't be removed, because it's a message tag");
			else
				document.getElementById("list").removeChild(items[i]);
		}
	}		
}

function AppendNewItem(lab) {
	if (lab.match(/§§$/)) 
		lab = lab.substring(0,1).toLowerCase() + lab.substring(1,lab.length-2);
	var isTag = false;
	if (lab.match(/@@@$/)) {
		lab = lab.replace("@@@", "");
		isTag = true;
	}
	
	if ( window.arguments[0] )
		var cats = window.arguments[0].split(gCatSep);
	else
		var cats = "";
	var list = document.getElementById("list");
	var item = document.createElement("treeitem");
	var row = document.createElement("treerow");
	var cell1 = document.createElement("treecell");
	var cell2 = document.createElement("treecell");
	for (var i=0;i<cats.length;i++) {
		var cat = formatStr(cats[i]);
		if (cat.toLowerCase() == lab.toLowerCase()) {
			cell1.setAttribute("value", "true");
			break;
		}
	}
	cell2.setAttribute("label", lab);
	if (isTag) {
		item.setAttribute("tag", "true");
		cell2.setAttribute("tag", "true");
		cell2.setAttribute("properties", "tag");
	}
	row.appendChild(cell1);
	row.appendChild(cell2);
	item.appendChild(row);
	list.appendChild(item);
}
