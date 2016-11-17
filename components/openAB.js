const nsIAppShellService    = Components.interfaces.nsIAppShellService;
const nsISupports           = Components.interfaces.nsISupports;
const nsICategoryManager    = Components.interfaces.nsICategoryManager;
const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsICommandLine        = Components.interfaces.nsICommandLine;
const nsICommandLineHandler = Components.interfaces.nsICommandLineHandler;
const nsIFactory            = Components.interfaces.nsIFactory;
const nsIModule             = Components.interfaces.nsIModule;
const nsIWindowWatcher      = Components.interfaces.nsIWindowWatcher;


// CHANGEME: change the contract id, CID, and category to be unique
// to your application.
const clh_contractID = "@mozilla.org/commandlinehandler/general-startup;1?type=myopenAB";

// use uuidgen to generate a unique ID
const clh_CID = Components.ID("{2307CDBE-E459-11DC-9333-2E3456D89593}");

// category names are sorted alphabetically. Typical command-line handlers use a
// category that begins with the letter "m".
const clh_category = "m-openAB";
 
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * The XPCOM component that implements nsICommandLineHandler.
 * It also implements nsIFactory to serve as its own singleton factory.
 */
const myAppHandler = {
  /* nsISupports */
  QueryInterface : function clh_QI(iid)
  {
    if (iid.equals(nsICommandLineHandler) ||
        iid.equals(nsIFactory) ||
        iid.equals(nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsICommandLineHandler */

  handle : function clh_handle(cmdLine)
  {
    // CHANGEME: change "openAB" to your command line flag (no argument)
    if (cmdLine.handleFlag("openAB", false)) {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
	var win = wm.getMostRecentWindow("mail:addressbook");
	if (! win) {
		var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].
			getService(Components.interfaces.nsIWindowWatcher);
		ww.openWindow(null, "chrome://messenger/content/addressbook/addressbook.xul", "_blank", "chrome,resizable,dialog=no,all", null);
	}	
	cmdLine.preventDefault = true;
    }
  },

  // CHANGEME: change the help info as appropriate, but
  // follow the guidelines in nsICommandLineHandler.idl
  // specifically, flag descriptions should start at
  // character 24, and lines should be wrapped at
  // 72 characters with embedded newlines,
  // and finally, the string should end with a newline
  helpInfo : "  -openAB               Open addressbook properly on Windows\n", 

  /* nsIFactory */

  createInstance : function clh_CI(outer, iid)
  {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    return this.QueryInterface(iid);
  },

  lockFactory : function clh_lock(lock)
  {
    /* no-op */
  }
};

/**
 * The XPCOM glue that implements nsIModule
 */
const myAppHandlerModule = {
  /* nsISupports */
  QueryInterface : function mod_QI(iid)
  {
    if (iid.equals(nsIModule) ||
        iid.equals(nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsIModule */
  getClassObject : function mod_gch(compMgr, cid, iid)
  {
    if (cid.equals(clh_CID))
      return myAppHandler.QueryInterface(iid);

    throw Components.results.NS_ERROR_NOT_REGISTERED;
  },

  registerSelf : function mod_regself(compMgr, fileSpec, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);

    compMgr.registerFactoryLocation(clh_CID,
                                    "myAppHandler",
                                    clh_contractID,
                                    fileSpec,
                                    location,
                                    type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.addCategoryEntry("command-line-handler",
                            clh_category,
                            clh_contractID, true, true);
  },

  unregisterSelf : function mod_unreg(compMgr, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(clh_CID, location);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.deleteCategoryEntry("command-line-handler", clh_category);
  },

  canUnload : function (compMgr)
  {
    return true;
  }
};

function openAbModule() {}
openAbModule.prototype =
{
  // XPCOM registration
  classID :Components.ID("{2307CDBE-E459-11DC-9333-2E3456D89593}"),
  category : "m-openAB",
  _xpcom_factory: myAppHandler,
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIModule])
};

if (XPCOMUtils.generateNSGetFactory)  // TB5 or higher
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([openAbModule]);

/* The NSGetModule function is the magic entry point that XPCOM uses to find what XPCOM objects
 * this component provides
 */
function NSGetModule(comMgr, fileSpec)
{
  return myAppHandlerModule;
 }
