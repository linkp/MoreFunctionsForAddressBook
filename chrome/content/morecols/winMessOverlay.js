function attachVCARD() {
	var list=[];
	var cards = GetSelectedAbCards();

	for (var i=0;i<cards.length;i++) {
		var card = cards[i];
		var attachBody = MFFABcard2vcard(card);
		if ( card.displayName == "") 
			filename = card.primaryEmail;
		else
			filename = card.displayName;
		if (filename != "")  
			filename =  filename + ".vcf";
		else
			filename = "unknown.vcf";
		// Create the attachment and open the compose window 
		var MsgAttachmentComponent = Components.classes["@mozilla.org/messengercompose/attachment;1"];
		var MsgAttachment = MsgAttachmentComponent.createInstance(Components.interfaces.nsIMsgAttachment);
		MsgAttachment.name = filename;
		var vCardAttach = "data:text/x-vcard;CHARSET=UTF-8,"+ encodeURIComponent(attachBody);
		MsgAttachment.url = vCardAttach;
		list[i] = MsgAttachment;
	}
		
	for (var j=0;j<list.length;j++) {
		if (typeof parent.AddAttachment != "undefined") { // TB2
			parent.AddAttachment(list[j]);
			parent.ChangeAttachmentBucketVisibility(false);
			parent.gContentChanged = true;
		}
		else // TB3
			parent.AddUrlAttachment(list[j]);
	}
}
