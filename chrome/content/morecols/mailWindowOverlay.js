var MFFABcollector = {
	msgHeaderParser : Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser),
	prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),

	format : 0,

	add : function(type, clipboard) {
		var collected = 0;
		try {
			var coll = Components.classes["@mozilla.org/addressbook/services/addressCollector;1"]
				.getService(Components.interfaces.nsIAbAddressCollector);
			var emailAddresses = currentHeaderData[type].headerValue;
			var addresses = {};
			var fullNames = {};
			var names = {};
			var numAddresses =  0;
			numAddresses = MFFABcollector.msgHeaderParser.parseHeadersWithArray(emailAddresses, addresses, names, fullNames);
			var index = 0;
			var data = "";
			while (index < numAddresses) {
				var addr = addresses.value[index].replace(/\'/g,"");
				if (addr.indexOf("@") > -1) {
					if (clipboard) {	
						data = data + addr + ", ";
					}
					else {
						var obj = getCardForEmail(addr);
						if (! obj.card) {
							coll.collectSingleAddress(addr,names.value[index],true, MFFABcollector.format,true);
							collected++;
						}	
					}
				}
				index++;
			}
		}
		catch(e) {}
		if (clipboard)
			return data;
		else
			return collected;
	},

	copyContacts : function() {
		var data = "";
		if (currentHeaderData.to)
			data = data + MFFABcollector.add("to", true);
		if (currentHeaderData.cc)
			data = data + MFFABcollector.add("cc", true);
		if (currentHeaderData.bcc)
			data = data + MFFABcollector.add("bcc", true);
		data = data.replace(/\,\s+$/,"");
		if (data)
			MFFAButils.copy(data);
	},

	addContacts : function(type) {
		var ob = {URI:null, format:0};
		window.openDialog("chrome://morecols/content/abChooser.xul", "",  "chrome,resizable=no,titlebar,centerscreen,modal", ob, true);
		if (! ob.URI)
			return;

		MFFABcollector.format = ob.format;
		var oldValue = MFFABcollector.prefs.getCharPref("mail.collect_addressbook");
		MFFABcollector.prefs.setCharPref("mail.collect_addressbook", ob.URI); 
	
		var added = 0;
		var to = 0;
		var cc = 0;
		var bcc = 0;
		var replyto = 0;
		if (type < 2 && currentHeaderData.to) {
			to = MFFABcollector.add("to");
			replyto = MFFABcollector.add("reply-to");
		}
		if ( (type == 0 || type == 2) && currentHeaderData.cc )
			cc = MFFABcollector.add("cc");
		if ( (type == 0 || type == 3) && currentHeaderData.bcc )
			bcc = MFFABcollector.add("bcc");
		added = to + cc + bcc + replyto;
		
		MFFABcollector.prefs.setCharPref("mail.collect_addressbook", oldValue);
		
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		var oneAddressBook = abManager.getDirectory(ob.URI);  
		var ABcollectName = oneAddressBook.dirName; 
		alert("Added  "+ added + " contact(s) in addressbook named '"+ ABcollectName + "'");
	},
	
	addList : function(type) {
		var ob = {URI:null, dirName:null};
		window.openDialog("chrome://morecols/content/abChooser.xul", "", "chrome,resizable=no,titlebar,centerscreen,modal", ob, false);
		if (! ob.URI)
			return;

		var emailAddresses = "";
		if (type < 2 && currentHeaderData.to)
			emailAddresses = currentHeaderData["to"].headerValue;
		if ( (type == 0 || type == 2) && currentHeaderData.cc){
			if (emailAddresses.length > 0)
				emailAddresses = emailAddresses + ",";
			emailAddresses = emailAddresses + currentHeaderData["cc"].headerValue;
		}
		if ( (type == 0 || type == 3) && currentHeaderData.bcc ) {
			if (emailAddresses.length > 0)
				emailAddresses = emailAddresses + ",";
			emailAddresses = emailAddresses + currentHeaderData["bcc"].headerValue;
		}		
		
		var addresses = {};
		var fullNames = {};
		var names = {};
		var numAddresses =  0;
		numAddresses = MFFABcollector.msgHeaderParser.parseHeadersWithArray(emailAddresses, addresses, names, fullNames);
		var index = 0;
		var addrArray = [];
		while (index < numAddresses) {
			var addr = fullNames.value[index].replace(/\'/g,"");
			if (addr.indexOf("@") > -1) {
				addrArray.push(addr);
			}
			index++;
		}
		if (index == 0) {
			alert("No address");
			return;
		}
		MFFAButils.createListWithAddress(ob.dirName, addrArray, ob.URI);
	},
	
	context : function(popup) {
		var items = popup.childNodes;
		if (! currentHeaderData.to) {
			items[1].setAttribute("disabled", "true");
			items[6].setAttribute("disabled", "true");
		}
		else {
			items[1].removeAttribute("disabled");
			items[6].removeAttribute("disabled");
		}
		if (! currentHeaderData.cc) {
			items[2].setAttribute("disabled", "true");
			items[7].setAttribute("disabled", "true");
		}
		else {
			items[2].removeAttribute("disabled");
			items[7].removeAttribute("disabled");
		}
		if (! currentHeaderData.bcc) {
			items[3].setAttribute("disabled", "true");
			items[8].setAttribute("disabled", "true");
		}
		else {
			items[3].removeAttribute("disabled");
			items[8].removeAttribute("disabled");
		}
		if (! currentHeaderData.bcc && ! currentHeaderData.to && ! currentHeaderData.cc) {
			items[0].setAttribute("disabled", "true");
			items[5].setAttribute("disabled", "true");
		}
		else {
			items[0].removeAttribute("disabled");
			items[5].removeAttribute("disabled");
		}
	}	
}
