var file;
var newName;

function onLoad() {
	file = null;
	newName = null;
}

function onExit() {
	var fileName = document.getElementById("fileName").value;
	var dir = MFFABfileutils.getFilesDir(true);
	if (dir)
		dir.append(fileName);
	if (dir && dir.exists()) {
		alert(MCbundle.GetStringFromName("FileExists"));
		document.getElementById("fileName").value =  newName;
		return false;
	}
	else {
		window.arguments[0].file = file;
		window.arguments[0].newName = fileName;
		return true;
	}
}

function pickFile(el) {
	file = getFileFromFilePicker(MCbundle.GetStringFromName("AddFile"),"Open", "all", null);
	if (! file)
		return;
	newName = MFFABfileutils.unique(file.leafName);
	document.getElementById("filePath").value = file.path;
	document.getElementById("fileName").value = newName;
	document.documentElement.getButton("accept").disabled = false;
}
