function cleanlabels1() {
	var custom1 = MFFAButils.getComplexPref("morecols.custom1.label");
	var custom2 = MFFAButils.getComplexPref("morecols.custom2.label");
	var custom3 = MFFAButils.getComplexPref("morecols.custom3.label");
	var custom4 = MFFAButils.getComplexPref("morecols.custom4.label");
	if (custom1 != "")
		document.getElementById("cmd_SortByCustom1").label = custom1;
	if (custom2 != "")
		document.getElementById("cmd_SortByCustom2").label = custom2;
	if (custom3 != "")
		document.getElementById("cmd_SortByCustom3").label = custom3;
	if (custom4 != "")
		document.getElementById("cmd_SortByCustom4").label = custom4;
}

function cleanlabels2() {
	var custom1 = MFFAButils.getComplexPref("morecols.custom1.label");
	var custom2 = MFFAButils.getComplexPref("morecols.custom2.label");
	var custom3 = MFFAButils.getComplexPref("morecols.custom3.label");
	var custom4 = MFFAButils.getComplexPref("morecols.custom4.label");
	if (custom1 != "") {
		document.getElementById("Custom1").setAttribute("label", custom1);
		document.getElementById("cust1view").setAttribute("label", custom1);
	}
	if (custom2 != "") {
		document.getElementById("Custom2").setAttribute("label", custom2);
		document.getElementById("cust2view").setAttribute("label", custom2);
	}
	if (custom3 != "") {
		document.getElementById("Custom3").setAttribute("label", custom3);
		document.getElementById("cust3view").setAttribute("label", custom3);
	}
	if (custom4 != "") {
		document.getElementById("Custom4").setAttribute("label", custom4);
		document.getElementById("cust4view").setAttribute("label", custom4);
	}
}

function MFFABinit() {
	if (MFFAButils.prefs.getBoolPref("morecols.columns.width_fixed") && document.styleSheets[0]) {
		var maxwidth = MFFAButils.prefs.getIntPref("morecols.columns.min_width");
		var rule = "#abResultsTree treecol {max-width: " +maxwidth+"px !important;}";
		document.styleSheets[0].insertRule(rule, document.styleSheets[0].cssRules.length);
		rule = "#abResultsTree treecol {min-width: " +maxwidth+"px !important;}";
		document.styleSheets[0].insertRule(rule, document.styleSheets[0].cssRules.length);
	}
	cleanlabels2();
	// This is for compatibility with Display-Contact-Photo
	if (document.getElementById("DCP-Contextmenu")) {
		var DCP = document.getElementById("DCP-Contextmenu");
		var el = document.createElement("menuseparator");
		DCP.appendChild(el);
		var item = DCP.appendChild(document.getElementById("abContentPopupItem2"));
	}
	// document.getElementById("cvPhoto").addEventListener("load", MFFABabCardView.resize_photo, true);
}

function MFFABhideSearchPopup(event) {
	onSearchInputBlur(event);
}


function onSearchInputBlur(event)  { 
  	var quickPopup = document.getElementById("quick-search-menupopup");
	var quickChilds = quickPopup.childNodes;
	for (i=0; i<quickChilds.length; i++) {
		if (quickChilds[i].getAttribute("checked") == "true") {
			var val = quickChilds[i].getAttribute("value");
			quickPopup.setAttribute("value", val);
			break;
		}
	}
	if (typeof gSearchInput =="undefined")
		var gSearchInput = document.getElementById("peopleSearchInput");
	gSearchInput.setAttribute("emptytext", quickChilds[i].getAttribute("label"));
	gSearchInput.setAttribute("placeholder", quickChilds[i].getAttribute("label"));
}

if (Object.assign)
	onEnterInSearchBar = onEnterInSearchBar2; // TB38 or higher
else
	onEnterInSearchBar = onEnterInSearchBar1; 

function onEnterInSearchBar2() {
	var is45 = (typeof getModelQuery != "undefined");
	if (! is45)
		ClearCardViewPane(); // TB38

	var quickPopup = document.getElementById("quick-search-menupopup");
	var quickChilds = quickPopup.childNodes;
	for (i=0; i<quickChilds.length; i++) {
		if (quickChilds[i].getAttribute("checked") == "true") {
			var val = quickChilds[i].getAttribute("value");
			quickPopup.setAttribute("value", val);
			break;
		}
   	}

	if (val < 1) {
		if (!gQueryURIFormat || gQueryURIFormat.indexOf("Categories") < 0) {// SoGo connector compatibility
			if (is45)
				gQueryURIFormat = getModelQuery("mail.addr_book.quicksearchquery.format");	
			else { // TB38
				gQueryURIFormat = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format",
		                       Components.interfaces.nsIPrefLocalizedString).data;
				gQueryURIFormat = gQueryURIFormat.slice(1);
			}
		}
	}
	else {
		var searchT = quickChilds[i].getAttribute("searchTerm");
		gQueryURIFormat = "(or("+searchT+",c,@V))";
	}

	var searchURI = GetSelectedDirectory();
	var searchInput = document.getElementById("peopleSearchInput");
	if (searchInput) {
		let searchWords = getSearchTokens(searchInput.value);
		searchURI += generateQueryURI(gQueryURIFormat, searchWords);
	}
	
	if (searchURI == kAllDirectoryRoot)
		searchURI += "?";

	document.getElementById("localResultsOnlyMessage").setAttribute("hidden",
                          !gDirectoryTreeView.hasRemoteAB ||
                          searchURI != kAllDirectoryRoot + "?");

	SetAbView(searchURI);
	// XXX todo 
	// this works for synchronous searches of local addressbooks, 
  	// but not for LDAP searches
	SelectFirstCard()
}


function onEnterInSearchBar1() { // TB31 and older
  ClearCardViewPane();  

  var quickPopup = document.getElementById("quick-search-menupopup");
  var quickChilds = quickPopup.childNodes;
  for (i=0; i<quickChilds.length; i++) {
	if (quickChilds[i].getAttribute("checked") == "true") {
		var val = quickChilds[i].getAttribute("value");
		quickPopup.setAttribute("value", val);
		break;
	}
   }

  	if (val == 0) {
		if (! gQueryURIFormat || gQueryURIFormat.indexOf("Categories") < 0)  // SoGo connector compatibility
			gQueryURIFormat = MFFAButils.getComplexPref("mail.addr_book.quicksearchquery.format");
	}
	else {
		var searchT = quickChilds[i].getAttribute("searchTerm");
		gQueryURIFormat = "?(or("+searchT+",c,@V))";
	}
   		

  var searchURI = GetSelectedDirectory();
  if (!searchURI) return;
  if (typeof gSearchInput =="undefined")
		var gSearchInput = document.getElementById("peopleSearchInput");
  
  if (gSearchInput.value != "") {
    // replace all instances of @V with the escaped version
    // of what the user typed in the quick search text input
    searchURI += gQueryURIFormat.replace(/@V/g, encodeURIComponent(gSearchInput.value));
  }
 
  SetAbView(searchURI);
  
  // XXX todo 
  // this works for synchronous searches of local addressbooks, 
  // but not for LDAP searches
  SelectFirstCard()
}


function DirPaneSelectionChange()  {
	var sticky = document.getElementById("qfb-AB-sticky").checked;
	var tree = document.getElementById("abResultsTree");
	var tc = tree.getElementsByTagName("treechildren")[0];
	var sb = document.getElementById("statusText");
	var innerBox = document.getElementById("CardViewInnerBox");
	if (! sticky) {
		tc.removeAttribute("collapsed");
		innerBox.removeAttribute("hidden");
		onAbClearSearch();
	}
	else {
		tc.collapsed = true;
		innerBox.hidden = true;
	}
	if (gDirTree && gDirTree.view.selection && gDirTree.view.selection.count == 1) {
	     gPreviousDirTreeIndex = gDirTree.currentIndex;
	     ChangeDirectoryByURI(GetSelectedDirectory());
	   }
	  goUpdateCommand('cmd_newlist');
	if (sticky) {
		sb.label = "";
		setTimeout( function() {
			onEnterInSearchBar();
			tc.removeAttribute("collapsed");
			innerBox.removeAttribute("hidden");}
			,200);
	}
}

window.addEventListener("load", MFFABinit, false);
