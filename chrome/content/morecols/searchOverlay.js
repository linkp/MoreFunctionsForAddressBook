function onSearch() {

	gStatusText.setAttribute("label", "");

	if (typeof gPropertiesButton != "undefined") {
		gPropertiesButton.setAttribute("disabled","true");
		gComposeButton.setAttribute("disabled","true");
	}
	else
		disableCommands();

	gSearchSession.clearScopes();

	var currentAbURI = document.getElementById('abPopup').getAttribute('value');
 
	gSearchSession.addDirectoryScopeTerm(GetScopeForDirectoryURI(currentAbURI));
	saveSearchTerms(gSearchSession.searchTerms, gSearchSession);

	var customAttr = "";
	var and = false;
	var searchUri = currentAbURI + "?(";

	if (gSearchSession.searchTerms.Count)
		var count = gSearchSession.searchTerms.Count();
	else	
		var count = gSearchSession.searchTerms.length;
	for (var i=0; i<count; i++) {
		var SI = document.getElementsByTagName("searchattribute")[i];
		var popup = document.getAnonymousElementByAttribute(SI, "class", "search-menulist-popup");
		var eV = popup.parentNode.selectedItem.getAttribute("extraValue");
		if (gSearchSession.searchTerms.GetElementAt)
			var searchTerm = gSearchSession.searchTerms.GetElementAt(i).QueryInterface(nsIMsgSearchTerm);
		else
			var searchTerm = gSearchSession.searchTerms.queryElementAt(i, nsIMsgSearchTerm);			
		// get the "and" / "or" value from the first term
		if (i == 0) {
			if (searchTerm.booleanAnd) {
				searchUri += "and";
				and = true;
			}
			else
				searchUri += "or";
		}

		var attrs;
		
		switch (searchTerm.attrib) {
		case nsMsgSearchAttrib.Name:
			if (gSearchPhoneticName == "false")
				attrs = ["DisplayName","FirstName","LastName","NickName","_AimScreenName"];
			else
				attrs = ["DisplayName","FirstName","LastName","NickName","_AimScreenName","PhoneticFirstName","PhoneticLastName"];
			break;
		case ( nsMsgSearchAttrib.DisplayName && eV == "") :
			attrs = ["DisplayName"];
			break;
		case nsMsgSearchAttrib.Email:
			attrs = ["PrimaryEmail"];
			break;
		case nsMsgSearchAttrib.PhoneNumber:
			attrs = ["HomePhone","WorkPhone","FaxNumber","PagerNumber","CellularNumber"]; 
			break;
		case nsMsgSearchAttrib.Organization:
			attrs = ["Company"];
			break;
		case nsMsgSearchAttrib.Department:
			attrs = ["Department"];
			break;
		case nsMsgSearchAttrib.City:
			attrs = ["WorkCity"];
			break;
		case nsMsgSearchAttrib.Street:
			attrs = ["WorkAddress"];
			break;
		case nsMsgSearchAttrib.Nickname:
			attrs = ["NickName"];
			break;
		case nsMsgSearchAttrib.WorkPhone:
			attrs = ["WorkPhone"];
			break;
		case nsMsgSearchAttrib.HomePhone:
			attrs = ["HomePhone"];
			break;
		case nsMsgSearchAttrib.Fax:
			attrs = ["FaxNumber"];
			break;
		case nsMsgSearchAttrib.Pager:
			attrs = ["Pager"];
			break;
		case nsMsgSearchAttrib.Mobile:
			attrs = ["CellularNumber"];
			break;
		case nsMsgSearchAttrib.Title:
			attrs = ["JobTitle"];
			break;
		case nsMsgSearchAttrib.AdditionalEmail:
			attrs = ["SecondEmail"];
			break;
		case nsMsgSearchAttrib.ScreenName:
			attrs = ["_AimScreenName"];
			break;
		default:
			if (eV == 1001) {
				attrs = ["Category"];
				break;
			}
			else if (eV == 1002) {
				attrs = ["Notes"];
				break;
			}
			else if (eV == 1003) {
				attrs = ["BirthYear"];
				break;
			}
			else if (eV == 1004) {
				attrs = ["BirthMonth"];
				break;
			}
			else if (eV == 1005) {
				attrs = ["BirthDay"];
				break;
			}
			else if (eV == 1006) {
				attrs = ["HomeCity"];
				break;
			}
			else if (eV == 1007) {
				attrs = ["HomeAddress"];
				break;
			}
			else if (eV == 1008) {
				attrs = ["HomeState"];
				break;
			}
			else if (eV == 1009) {
				attrs = ["HomeCountry"];
				break;
			}
			else if (eV == 1010) {
				attrs = ["HomeZipCode"];
				break;
			}
			else if (eV == 1011) {
				attrs = ["WorkState"];
				break;
			}
			else if (eV == 1012) {
				attrs = ["WorkCountry"];
				break;
			}
			else if (eV == 1013) {
				attrs = ["WorkZipCode"];
				break;
			}
			else if (eV == 1014) {
				attrs = ["MFFABemail1","MFFABemail2","MFFABemail3","MFFABemail4","MFFABemail5"];
				if (and)
					searchUri = searchUri.substring(0,searchUri.lastIndexOf("and")) + "or";
				break;
			}
			else if (eV == 1021) {
				attrs = ["Custom1"];
				break;
			}
			else if (eV == 1022) {
				attrs = ["Custom2"];
				break;
			}
			else if (eV == 1023) {
				attrs = ["Custom3"];
				break;
			}
			else if (eV == 1024) {
				attrs = ["Custom4"];
				break;
			}
			else if (eV == 1050) {
				attrs = ["xxx"];
				break;
			}
			dump("XXX " + searchTerm.attrib + " not a supported search attr!\n");
			attrs = ["DisplayName"];
			break;
		}

		var opStr;
		switch (searchTerm.op) {
			case nsMsgSearchOp.Contains:
				opStr = "c";
				break;
			case nsMsgSearchOp.DoesntContain:
				opStr = "!c";
				break;
			case nsMsgSearchOp.Is:
				opStr = "=";
				break;
			case nsMsgSearchOp.Isnt:
				opStr = "!=";
				break;
			case nsMsgSearchOp.BeginsWith:
				opStr = "bw";
				break;
			case nsMsgSearchOp.EndsWith:
				opStr = "ew";
				break;
			case nsMsgSearchOp.SoundsLike:
				opStr = "~=";
				break;
			default:
				opStr = "c";
				break;
		}

		// currently, we can't do "and" and "or" searches at the same time
		// (it's either all "and"s or all "or"s)
		var max_attrs = attrs.length;
		for (var j=0;j<max_attrs;j++) {
			if (attrs[j] == "xxx") {
				try {
					var prefs = Components.classes["@mozilla.org/preferences-service;1"]
						.getService(Components.interfaces.nsIPrefBranch);
					customAttr = prefs.getCharPref("morecols.searchAttrib.custom");
					customAttr = customAttr.replace(/%v/g, encodeURIComponent(searchTerm.value.str));
					customAttr = customAttr.replace(/%b/g, opStr);
					searchUri += customAttr;
				}
				catch(e) {}
			}
			else
				// append the term(s) to the searchUri
				searchUri += "(" + attrs[j] + "," + opStr + "," + encodeURIComponent(searchTerm.value.str) + ")";
		}
	}

	searchUri += ")";
	SetAbView(searchUri);
}

	
function searchOverlayInit() {
	var clbBut= document.getElementById("createListButton");
	var compBut = document.getElementById("composeButton")
	if (! compBut)
		compBut = document.getElementsByTagName("button")[6];
	compBut.parentNode.insertBefore(clbBut, compBut.nextSibling);
	
	setTimeout(setMySearchLabel, 500, gUniqueSearchTermCounter-1, "");

	var onMoreOrig = onMore;
	onMore = function(event)  {
		onMoreOrig.apply(this, arguments);
		setTimeout(setMySearchLabel, 500, gUniqueSearchTermCounter-1, "");
	};

	setSearchScope = function(scope) {
		gSearchScope = scope;
		for (var i=0; i<gSearchTerms.length; i++) {	 
		 if (!(gSearchTerms[i].obj.searchattribute.searchScope === undefined)) {
			gSearchTerms[i].obj.searchattribute.searchScope = scope;
			// act like the user "selected" this, see bug #202848
			gSearchTerms[i].obj.searchattribute.onSelect(null /* no event */);
		}
		gSearchTerms[i].scope = scope;	 
		var SI = document.getElementById("searchAttr"+ i);
		var el = document.getAnonymousElementByAttribute(SI, "label", "Fax");
		var eV = el.parentNode.parentNode.selectedItem.getAttribute("extraValue");
		setTimeout(setMySearchLabel, 500, i, eV);
		}
	};
}
	
function setMySearchLabel(rowIndex,eV) {
	var MoreColsBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].
		getService(Components.interfaces.nsIStringBundleService);
	var MoreColsBundle = MoreColsBundleService
		.createBundle("chrome://morecols/locale/morecols.properties");
	var MoreColsBundle2 = MoreColsBundleService
		.createBundle("chrome://messenger/locale/addressbook/addressBook.properties");
	var MoreColsBundle3 = MoreColsBundleService
		.createBundle("chrome://messenger/locale/search-attributes.properties");	
	
	var SI = document.getElementById("searchAttr"+ rowIndex);
	var popup = document.getAnonymousElementByAttribute(SI, "class", "search-menulist-popup");

	var street = document.getAnonymousElementByAttribute(SI, "label", MoreColsBundle3.GetStringFromName("Street"));
	if (street)
		street.setAttribute("label", street.getAttribute("label") + " " + MoreColsBundle2.GetStringFromName("propertyWork"));
	var city = document.getAnonymousElementByAttribute(SI, "label",  MoreColsBundle3.GetStringFromName("City"));
	if (city)
		city.setAttribute("label", city.getAttribute("label") + " " + MoreColsBundle2.GetStringFromName("propertyWork"));
	
	// Category
	var newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("Category"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1001");
	popup.appendChild(newEl);
	if (eV == "1001")
		popup.parentNode.selectedItem = newEl;
		
	// Notes
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("Notes"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1002");
	popup.appendChild(newEl);
	if (eV == "1002")
		popup.parentNode.selectedItem = newEl;

	// BirthYear
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("BirthYear"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1003");
	popup.appendChild(newEl);
	if (eV == "1003")
		popup.parentNode.selectedItem = newEl;

	// BirthMonth
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("BirthMonth"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1004");
	popup.appendChild(newEl);
	if (eV == "1004")
		popup.parentNode.selectedItem = newEl;

	// BirthDay
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("BirthDay"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1005");
	popup.appendChild(newEl);
	if (eV == "1005")
		popup.parentNode.selectedItem = newEl;

	// HomeCity
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("HomeCity"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1006");
	popup.appendChild(newEl);
	if (eV == "1006")
		popup.parentNode.selectedItem = newEl;

	// HomeStreet
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("HomeStreet"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1007");
	popup.appendChild(newEl);
	if (eV == "1007")
		popup.parentNode.selectedItem = newEl;

	// HomeState
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("HomeState"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1008");
	popup.appendChild(newEl);
	if (eV == "1008")
		popup.parentNode.selectedItem = newEl;
	
	// HomeCountry
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("HomeCountry"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1009");
	popup.appendChild(newEl);
	if (eV == "1009")
		popup.parentNode.selectedItem = newEl;

	// HomeZipCode
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("HomeZipCode"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1010");
	popup.appendChild(newEl);
	if (eV == "1010")
		popup.parentNode.selectedItem = newEl;

	// WorkState
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("WorkState"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1011");
	popup.appendChild(newEl);
	if (eV == "1011")
		popup.parentNode.selectedItem = newEl;
	
	// WorkCountry
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("WorkCountry"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1012");
	popup.appendChild(newEl);
	if (eV == "1012")
		popup.parentNode.selectedItem = newEl;

	// WorkZipCode
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("WorkZipCode"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1013");
	popup.appendChild(newEl);
	if (eV == "1013")
		popup.parentNode.selectedItem = newEl;

	// Additional emails
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", MoreColsBundle.GetStringFromName("AdditionalEmail"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1014");
	popup.appendChild(newEl);
	if (eV == "1014")
		popup.parentNode.selectedItem = newEl;
	
	
	// Custom fields
	for (i=1;i<5;i++) {
		newEl = document.createElement("menuitem");
		var custom = getCustomizedLabelForIndex(i);
		if (custom == "") 
		custom = MoreColsBundle2.GetStringFromName("propertyCustom"+i.toString());
		newEl.setAttribute("label", custom);
		newEl.setAttribute("value", "18");
		newEl.setAttribute("extraValue", 1020+i);
		popup.appendChild(newEl);
		if (eV == 1020+i)
		popup.parentNode.selectedItem = newEl;
	} 

	// Custom Attrib
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	var newSep = document.createElement("menuseparator");
	popup.appendChild(newSep);
	newEl = document.createElement("menuitem");
	newEl.setAttribute("label", prefs.getCharPref("morecols.searchAttrib.custom.label"));
	newEl.setAttribute("value", "18");
	newEl.setAttribute("extraValue", "1050");
	popup.appendChild(newEl);
	if (eV == "1050")
		popup.parentNode.selectedItem = newEl;
}


function createListFromSelection() {
	if (DirPaneHasFocus())
		var addrs = GetSelectedAddressesFromDirTree();
	else
		var addrs = GetSelectedAddresses();
	if (addrs == "")
		return;
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	var delay = prefs.getIntPref("morecols.delay.open_window");
	var addrArray = addrs.split(",");
	var listDialog = window.openDialog("chrome://messenger/content/addressbook/abMailListDialog.xul", "",  "chrome,resizable=no,titlebar,centerscreen", {selectedAB:null}, null);
	setTimeout(function() { listDialog.fillListDialog(addrArray) }, delay);
}

window.addEventListener("load", searchOverlayInit, false);


