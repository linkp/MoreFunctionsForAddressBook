var MFFABabCardView = {
	callNumber : function(event) {
		if (event.button == 2)
			return;
		var el = event.target;
		var num;
		var messenger1 = Components.classes["@mozilla.org/messenger;1"].createInstance();         
		messenger1 = messenger1.QueryInterface(Components.interfaces.nsIMessenger);
		switch (el.id) {
			case "cvPhWork":
				num = MFFABabCardView.extractNumber("WorkPhone");
				break;
			case "cvPhHome":
				num = MFFABabCardView.extractNumber("HomePhone");
				break;
			case "cvPhPager":
				num = MFFABabCardView.extractNumber("PagerNumber");
				break;
			case "cvPhCellular":
				num = MFFABabCardView.extractNumber("CellularNumber");
				break;
			default:
				return;
		}
		num = num.replace(/[^0-9a-zA-Z\+]/g, "");
		if (num)  {
			var protocol = MFFAButils.prefs.getCharPref("morecols.phone_numbers.protocol_prefix");
			messenger1.launchExternalURL(protocol+num);
		}
	},

	extractNumber : function(property) {
		var num = GetSelectedCard().getProperty(property, "");	
		var sep = moreColsPrefs.getCharPref("morecols.contact.fields_separator");
		if (num.indexOf(sep) > -1)
			num = num.substring(0, num.indexOf(sep));	
		return num;
	},

	openPhoto : function(img) {
		var url = img.getAttribute("src");
		if (url != "")
			window.openDialog(url,"","resizable=no,height=500,width=500,chrome=yes,centerscreen");
	},

	resize_photo : function() {
		var PhotoEl = document.getElementById("cvPhoto");
		var h = PhotoEl.naturalHeight;
		var w = PhotoEl.naturalWidth;
		var prop = w/h;
		if (prop < 1) 
			PhotoEl.style.maxWidth = (10 * prop)+ "ch";
		else
			PhotoEl.style.maxWidth = "10ch";
		document.getElementById("cvPhoto").style.display = "inherit";
	}
};
	


// You can also use this code, but please remember that you MUST change the names
// of the variables that store the original functions, otherwise we can have a compatibility problem
var MoreColsBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].
			getService(Components.interfaces.nsIStringBundleService);
var MoreColsBundle = MoreColsBundleService.createBundle("chrome://morecols/locale/morecols.properties"); 

var OnLoadCardViewOriginal8848 = OnLoadCardView;
var DisplayCardViewPaneOriginal8848 = DisplayCardViewPane;

OnLoadCardView = function() {
	OnLoadCardViewOriginal8848.apply();
	cvData.cvBirthYear = document.getElementById("cvBirthDate");
	cvData.cvSpouseName = document.getElementById("cvSpouseName");
	cvData.cvCategory= document.getElementById("cvCategory");
	cvData.cvAnniversary = document.getElementById("cvAnniversary");
	cvData.cvFiles = document.getElementById("cvFiles");

	if (MFFAButils.prefs.getBoolPref("morecols.phone_numbers.link_as_callto")) {
		document.getElementById("cvPhWork").setAttribute("class", "CardViewLink");
		document.getElementById("cvPhWork").setAttribute("onclick", "MFFABabCardView.callNumber(event)");
		document.getElementById("cvPhHome").setAttribute("class", "CardViewLink");
		document.getElementById("cvPhHome").setAttribute("onclick", "MFFABabCardView.callNumber(event)");
		document.getElementById("cvPhCellular").setAttribute("class", "CardViewLink");
		document.getElementById("cvPhCellular").setAttribute("onclick", "MFFABabCardView.callNumber(event)");
		document.getElementById("cvPhPager").setAttribute("class", "CardViewLink");
		document.getElementById("cvPhPager").setAttribute("onclick", "MFFABabCardView.callNumber(event)");
	}	
};


DisplayCardViewPane = function(realCard) {
	if (! realCard)
		realCard = GetSelectedAbCards()[0];
	MFFABabCardView.card = realCard;
	DisplayCardViewPaneOriginal8848(realCard);
	var card = { getProperty : function (prop) {
                 return realCard.getProperty(prop, "");
               },
               primaryEmail : realCard.primaryEmail,
               displayName : realCard.displayName,
               isMailList : realCard.isMailList,
               mailListURI : realCard.mailListURI
  	};
	var moreColsPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	cvSetNodeWithLabel(document.getElementById("cvSpouseName"),MoreColsBundle.GetStringFromName("SpouseName"),card.getProperty("SpouseName", ""));
	cvSetNodeWithLabel(document.getElementById("cvCategory"),MoreColsBundle.GetStringFromName("Category"),card.getProperty("Category", ""));
	
	var files = card.getProperty("MFFABfiles", "");
	if (files != "")
		files = files.replace(/§§§/g, ", ");
	cvSetNodeWithLabel(document.getElementById("cvFiles"),MoreColsBundle.GetStringFromName("Files"),files);
	
	/* Clean up invalid values ("0", "00", "000" etc)
	var bd = card.getProperty("BirthDay", "");
	if (bd == "0" || bd == "00" || bd == "000")
		card.setProperty("BirthDay", "");
	var bm = card.getProperty("BirthMonth", "");
	if (bm == "0" || bm == "00" || bm == "000")
		card.setProperty("BirthMonth", "");
	var by = card.getProperty("BirthYear", "");
	if (by == "0" || by == "00" || by == "000")
		card.setProperty("BirthYear", "");

	var birthfield = formatDayMonthYear(card.birthDay, card.birthMonth, card.birthYear);
	if (birthfield == "--" || birthfield == gSearchDateSeparator+gSearchDateSeparator)
		birthfield = "";
	cvSetNodeWithLabel(document.getElementById("cvBirthDate"), MoreColsBundle.GetStringFromName("BirthDate"),birthfield);*/

	// Clean up invalid values ("0", "00", "000" etc)
	var cAnnDay = card.getProperty("AnniversaryDay", "");
	// if (cAnnDay == "0" || cAnnDay == "00" || cAnnDay == "000")
	//	card.setProperty("AnniversaryDay", "");
	var cAnnMon = card.getProperty("AnniversaryMonth", "");
	// if (cAnnMon == "0" || cAnnMon == "00" || cAnnMon == "000")
	//	card.setProperty("AnniversaryMonth", "");
	var cAnnY = card.getProperty("AnniversaryYear", "");
	// if (cAnnY == "0" || cAnnY == "00" || cAnnY == "000")
	//	card.setProperty("AnniversaryYear", "");

	var anniversaryfield =  formatDayMonthYear(cAnnDay, cAnnMon, cAnnY);
	if (anniversaryfield == "--" || anniversaryfield == gSearchDateSeparator+gSearchDateSeparator)
		anniversaryfield = "";
	cvSetNodeWithLabel(document.getElementById("cvAnniversary"), MoreColsBundle.GetStringFromName("Anniversary"),anniversaryfield);

	for (var i=1;i<5;i++) {
		try {
			var custom = getCustomizedLabelForIndex(i);
			if (custom) {
				var id = "cvCustom"+i;
				var val = document.getElementById(id).childNodes[0].nodeValue;
				val  = val.replace(/.+:/, custom + ":");
				document.getElementById(id).childNodes[0].nodeValue = val;
			}
		}
		catch(e) {}
	}
		
	for (var i=1;i<11;i++) {
		var value = card.getProperty("MFFABcustom"+i, "");
		custom = getCustomizedLabelForIndex(100+i);
		if (document.getElementById("cvbOther").collapsed && value) {
			document.getElementById("cvbOther").removeAttribute("collapsed");
			document.getElementById("cvhOther").removeAttribute("collapsed");
		}
		if (! custom) 
			custom = MoreColsBundle.GetStringFromName("extraField")+" "+i;
		cvSetNodeWithLabel(document.getElementById("cvMFFABcustom"+i),custom,value);
	}

	for (var i=1;i<6;i++) {
		var emLabel = MFFAButils.getUncertainCharPref("morecols.extra_email"+i.toString()+".label");
		if (! emLabel)
			emLabel = MoreColsBundle.GetStringFromName("AdditionalEmail")+" "+i;
		HandleLink(document.getElementById("cvExtraEmail"+i), emLabel, card.getProperty("MFFABemail"+i, ""), document.getElementById("cvExtraEmailBox"+i), "mailto:" + card.getProperty("MFFABemail"+i, ""));
	}

	// If there is not a photo in TB3 style, search for a photo in MFFAB-0.5 style
	if (document.getElementById("cvPhoto").getAttribute("src").indexOf("chrome") > -1) {
		var photoFile = existsPhotoForCard();
		if (photoFile) {
			var url = "file:///"+photoFile.path;
			document.getElementById("cvPhoto").setAttribute("src", url);
		}
	}

	searchABhandler.clear(card, true);
};

var searchABhandler = {
	populate : function() {
		var desc;
		var card = GetSelectedAbCards()[0];
		var lists = MFFAButils.searchAB(card);
		var vbox = document.getElementById("searchABvbox");
		searchABhandler.clear(card,false);
		document.getElementById("ABplaceHolder").setAttribute("hidden", "true");
		for (var i=0;i<lists.length;i++) {
			desc = document.createElement("description");
			desc.setAttribute("class", "CardViewText");
			vbox.appendChild(desc);
			if (lists[i].split("§§§")[1].length > 1)
				desc.textContent = lists[i].split("§§§")[0] + " ("+ lists[i].split("§§§")[1] + ")";
			else
				desc.textContent = lists[i].split("§§§")[0];
		}
	},

	clear : function(card,show) {
		if (! MFFAButils.prefs.getBoolPref("morecols.abButton.show")) {
			document.getElementById("searchABbox").collapsed = true;
			return;
		}
		document.getElementById("searchABbox").collapsed = card.isMailList;
		var vbox = document.getElementById("searchABvbox");
		var descs = vbox.getElementsByTagName("description");
		for (var i=descs.length-1;i>0;i--)
			vbox.removeChild(descs[i]);
		if (show)
			document.getElementById("ABplaceHolder").removeAttribute("hidden");
	}
};



