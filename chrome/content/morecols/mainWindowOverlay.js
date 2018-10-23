if (typeof OriginalHandleAttachment == "undefined") {
        var OriginalHandleAttachment = messageHeaderSink.handleAttachment;
        messageHeaderSink.handleAttachment = function (contentType, url, displayName, uri, isExternalAttachment) {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);
		// Workaround to fix bugs in displaying inline vcard attachments: with this
                // fix all vCard are shown both inline and in attachments box
                 if (contentType == "text/x-vcard" && (prefs.getBoolPref("morecols.vcard.never_hide") || prefs.getBoolPref("morecols.vcard.handle")) ) 
                        contentType = "application/octet-stream";
                OriginalHandleAttachment(contentType, url, displayName, uri, isExternalAttachment);
        };
}

var getCardForEmail = function(emailAddress) {	
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	var books = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager).directories;
	var result = { book: null, card: null };
	while (!result.card && books.hasMoreElements()) {
		var ab = books.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
		try {
			var card = ab.cardForEmailAddress(emailAddress);
			if (card) {
				result.book = ab;
				result.card = card;
			}
			
			if (! card && prefs.getBoolPref("morecols.autocomplete.use_additional_emails")) {
				for (var i=1;i<6;i++) {
					var card = ab.getCardFromProperty("MFFABemail"+i,emailAddress,false);
					if (card) {
						result.book = ab;
						result.card = card;
						break;
					}
				}
			}
		}
		catch (ex) { }
	}		
	return result;
};

var MFFABvcardHandler = {
	start : function() {
		var item = document.getElementById("attachmentList").selectedItem;
		var attachment = item.attachment;
		var tempfile = Components.classes["@mozilla.org/file/directory_service;1"]
                    .getService(Components.interfaces.nsIProperties)
                    .get("TmpD", Components.interfaces.nsIFile);
		tempfile.append(encodeURIComponent(attachment.displayName));
		MFFABvcardHandler.file = tempfile;
		var uri = attachment.uri ? attachment.uri : attachment.messageUri;
		messenger.saveAttachmentToFile(tempfile, attachment.url, uri, attachment.contentType, MFFABvcardHandlerListener);
	},

	importVCF : function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);
		var abURI = prefs.getCharPref("mail.collect_addressbook");
		var cardDialog = window.openDialog("chrome://messenger/content/addressbook/abNewCardDialog.xul", "", "chrome,resizable=no,titlebar,centerscreen",{selectedAB:abURI},MFFABvcardHandler.file);
		setTimeout(function(){cardDialog.fillFromVcard();}, 4000);
	},

	VCFtest : function() {
		var item = document.getElementById("attachmentList").selectedItem;
		if (item) {
			var attachment = item.attachment;
			var ext = attachment.displayName.substring(attachment.displayName.length - 4);
			if (attachment.contentType == "text/x-vcard" ||  ext == ".vcf") {
				document.getElementById("vCardOpener").collapsed = false;
				document.getElementById("context-openAttachment").collapsed = true;
			}
			else {
				document.getElementById("vCardOpener").collapsed = true;
				document.getElementById("context-openAttachment").removeAttribute("collapsed");
			}
		}
		else {
			document.getElementById("vCardOpener").collapsed = true;
			document.getElementById("context-openAttachment").removeAttribute("collapsed");
		}
	},

	hideVCFbox :function() {
		try {
			var rule = ".moz-vcard-table {display:none !important;}";
			content.document.styleSheets[0].insertRule(rule, content.document.styleSheets[0].cssRules.length);
		}
		catch(e) {}
	}
};

var MFFABvcardHandlerListener = {
	OnStartRunningUrl : function(url) {},
	OnStopRunningUrl : function(url,aExitCode) {
		var extService = Components.classes['@mozilla.org/uriloader/external-helper-app-service;1']
			.getService(Components.interfaces.nsPIExternalAppLauncher)
		extService.deleteTemporaryFileOnExit(MFFABvcardHandler.file);
		MFFABvcardHandler.importVCF();
	}
};

var MFFABlistenerAM = {
	onDisabling: function(addon) {
		if (addon.id == "{3e17310d-82e8-4a43-bd2f-7c3055bfe589}")
			moreColsObserver.warn();
	},

	onUninstalling: function(addon) {
		if (addon.id == "{3e17310d-82e8-4a43-bd2f-7c3055bfe589}")
			moreColsObserver.warn();
	}
};

var moreColsObserver = {
	strBundleService : Components.classes["@mozilla.org/intl/stringbundle;1"].getService	
(Components.interfaces.nsIStringBundleService),
	
	obs: null,
	
	init: function()   {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);
		if (Array.isArray) {
			// TB 5 or higher
			Components.utils.import("resource://gre/modules/AddonManager.jsm");
			AddonManager.addAddonListener(MFFABlistenerAM);
		}
		else {
			this.obs = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);       
			this.obs.addObserver(this, "em-action-requested", false);
		}
		if (prefs.getBoolPref("morecols.vcard.handle")) {
			document.getElementById("attachmentListContext").addEventListener("popupshowing", MFFABvcardHandler.VCFtest, false);
			document.getElementById("messagepane").addEventListener("load",MFFABvcardHandler.hideVCFbox, true);
		}	
	},

	////////////////////////////
	// nsIObserver 
	observe: function(aSubject, aTopic, aData)   {
		var item = aSubject.QueryInterface(Components.interfaces.nsIUpdateItem);
		if (item.id != "{3e17310d-82e8-4a43-bd2f-7c3055bfe589}")
			return;
		switch (aData) {
			case "item-uninstalled":
				moreColsObserver.warn();
				break;
			case "item-disabled":
				moreColsObserver.warn();
				break;
			default:
        			break;
		}
	},

	warn : function(aData) {
		var MCbundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService	
(Components.interfaces.nsIStringBundleService);
		var MCbundle = MCbundleService.createBundle("chrome://morecols/locale/morecols.properties");
		var warning = MCbundle.GetStringFromName("warn1") + MCbundle.GetStringFromName("warn2");
		alert(warning);
	},

	/* This is not used yet, but will be in some future updates, to migrate all the prefences to the branch extensions.morefunctionsforaddressbook.
	
	migratePrefs : function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		if (! prefs.getBoolPref("extensions.morefunctionsforaddressbook.migrate_prefs"))
			return;
		var branch = prefs.getBranch("extensions.morefunctionsforaddressbook.");
		var oldPrefs = prefs.getChildList("morecols.", {});
		for (var i in oldPrefs) {	
			var type = prefs.getPrefType(oldPrefs[i]);
			if (type == 32)
				branch.setCharPref(oldPrefs[i].replace("morecols.",""), prefs.getCharPref(oldPrefs[i]));
			else if (type == 64)
				branch.setIntPref(oldPrefs[i].replace("morecols.",""), prefs.getIntPref(oldPrefs[i]));
			else
				branch.setBoolPref(oldPrefs[i].replace("morecols.",""), prefs.getBoolPref(oldPrefs[i]));
			prefs.deleteBranch(oldPrefs[i]);
		}
		prefs.setBoolPref("extensions.morefunctionsforaddressbook.migrate_prefs", false);
	}*/
};

window.addEventListener("load", function() {moreColsObserver.init(); }, false);
