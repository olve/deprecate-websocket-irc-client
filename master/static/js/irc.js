var wsAddress = "ws://localhost:9001";
var numWindows = 0;
var activeWindow;
var WINDOWS = {};

$(function() {
	$(window).unload(function() {
		$(makeArray(WINDOWS)).each(function(index, _window) {
			if (_window.irc.socket.readyState === 1) _window.irc.send({command:"QUIT"});
		});
	});
});

function makeArray(object) {var array = new Array(); for (var key in object) {if (object.hasOwnProperty(key)) array.push(object[key]);}	return array; }
function getNextElement(element) {var nextElement = element.prev();if (nextElement.length === 0) nextElement = element.next();if (nextElement.length != 0) return nextElement; }
function findWindow(element) {return WINDOWS[element.attr("id").split("_")[1]]}
function getNick(user) {return user.split("!")[0];}
function formatUser(user) {return getNick(user)+" ("+user+")";}

function Window(title, channel, irc) {
	this._title = title;
	this.channel = channel;
	this.irc = irc;
	this.isChannel = false;
	this.irc.channels[channel] = this;
	numWindows += 1;
	this.names = [];
	this._id = numWindows;
	this.tab = this.makeTab();
	this.pane = this.makePane();
	this.userList = this.makeUserList();	
	WINDOWS[this._id] = this;
	return this; }
Window.prototype.makeTab = function() {
	var tab = $("<div>");
	tab.text(this._title);
	tab.addClass("tab");
	tab.attr("id", "tab_"+this._id);
	$("#tabs").append(tab);
	return tab; };
Window.prototype.makePane = function() {
	var pane = $('<div style="display:none;">');
	pane.addClass("pane");
	pane.attr("id", "pane_"+this._id);
	$("#chat").append(pane);
	return pane; };
Window.prototype.makeUserList = function() {
	var list = $('<div style="display:none;">');
	list.attr("id", "lusers_"+this._id);
	list.addClass("userList");
	$("#lusers").append(list);
	return list; };
function pad(t) {if (t.length < 2) {return '0'+t;} return t;}	//pads single-digit numbers with zeros	
Window.prototype.echo = function(message) {
	var dt = new Date();
	var seconds = dt.getSeconds().toString();
	var minutes = dt.getMinutes().toString();
	var hours = dt.getHours().toString();
	var time = "["+pad(hours)+":"+pad(minutes)+":"+pad(seconds)+"]";
	this.pane.append(time+" "+message+"<br />");
	if (this == activeWindow) {var chat = $("#chat"); chat.animate({scrollTop:chat[0].scrollHeight}, 0);}
	if (this != activeWindow) this.tab.addClass("tabNewMessage"); };
Window.prototype.setNames = function(names) {
	this.names = names;
	names = names.split(" ").sort();
	this.userList.text("");
	userList = this.userList;
	$(names).each(function(index, value) {
		var link = $("<span>");
		link.addClass("userLink");
		link.text(value);
		userList.append(link);
		userList.append($("<br />"));
	}); };
Window.prototype.makeActive = function() {
	$(".pane").hide();
	$(".tab").removeClass("activeTab");
	this.tab.removeClass("tabNewMessage");
	activeWindow = this;
	this.tab.addClass("activeTab");
	$(".userList").hide();
	this.userList.show();
	this.pane.show(); };
Window.prototype._delete = function() {
	delete WINDOWS[this._id];
	this.pane.remove();
	this.tab.remove();
	delete this.irc.channels[this.channel];
	delete this; };
Window.prototype.close = function() {
	var nextTab;
	if (this.isChannel && this.irc.socket.readyState === 1) this.irc.send({command:"LEAVE", channel:this.channel});	
	if (this.channel == this.irc._host) {
		this.irc.disconnect();
		$(makeArray(this.irc.channels)).each(function(index, _window) {
			nextTab = getNextElement(_window.tab);
			_window._delete();});	}
	else {
		nextTab = getNextElement(this.tab);
		this._delete(); }
	if (nextTab) findWindow(nextTab).makeActive(); };

function IRC(host, port, nick) {
	if (!port) port = "6667";
	this._port = port;
	this._host = host;
	this.nick = nick;
	this.channels = {};
	this._namesBuild = {};
	this.statusWindow = new Window(this._host+" "+this.nick, this._host, this);
	this.statusWindow.makeActive(); }
IRC.prototype.disconnect = function() {
	if (this.socket.readyState == 1 || this.socket.readyState == 2) this.send({command:"QUIT"});
	this.socket.close(); };
IRC.prototype.reconnect = function() {
	this.disconnect();
	this.connect(); };
IRC.prototype.send = function(message) {
	this.socket.send(JSON.stringify(message)); };
IRC.prototype.changeNick = function(newNick) {
	this.nick = newNick;
	this.statusWindow.tab.text(this._host+" "+newNick);
	this.statusWindow.echo("* Your nick is now "+newNick); };
IRC.prototype.connect = function() {
	this.statusWindow.echo("-*- Starting IRC...")
	this.socket = new WebSocket(wsAddress);
	this.socket.irc = this;
	var irc = this;
	this.socket.onopen = function(event) {
		irc.statusWindow.echo("-*- Connecting to "+irc._host+" ("+irc._port+")...");
		irc.send({command:"CONNECT", host:irc._host, port:irc._port, nick:irc.nick}); };
	this.socket.onerror = function(event) {
		irc.statusWindow.echo("-*- Error: "+event.data); };
	this.socket.onclose = function(event) {
		irc.statusWindow.echo("-*- Disconnected"); };
	this.socket.onmessage = function(event) {
		var data = JSON.parse(event.data);
		console.log(event.data);
		switch (data.command) {
			case "PRIVMSG": //command, user, channel, message
				var user = data["user"];
				var split = user.split("!");
				if (split.length == 2) user = split[0];
				var message = "&lt;"+user+"&gt; "+data["message"]
				var channel = data["channel"]
				if (channel.toLowerCase() == irc.nick.toLowerCase()) channel = user;
				var targetWindow = irc.channels[channel];
				if (targetWindow) targetWindow.echo(message);
				else {
					targetWindow = new Window(channel, channel, irc);
					targetWindow.echo(message);	}
				break;
			case "NOTICED": //command, user, channel, message
				var channel = data["channel"];
				var msg = ("-"+getNick(data["user"])+"- "+channel+" "+data["message"]);
				irc.statusWindow.echo(msg);
				if (channel != irc.nick) {
					var _window = irc.channels[channel];
					if (_window) _window.echo(msg);	}
				break;
			case "NICKCHANGED": //command, nick
				irc.changeNick(data["nick"]);
				break;
			case "IRC_ERR_NICKNAMEINUSE": //command, oldnick, newnick
				irc.statusWindow.echo(data["oldnick"]+" Nickname already in use.");
				irc.changeNick(data["newnick"]);
				break;
			case "JOINED": //command, channel
				var channel = data["channel"];
				var channelWindow = new Window(channel, channel, irc);
				channelWindow.isChannel = true;
				channelWindow.makeActive();
				break;
			case "INFO": //command, info
				irc.statusWindow.echo(data["info"]);
				break;
			case "MYINFO": //command, servername, umodes, cmodes
				var message = data["servername"];
				var umodes = data["umodes"];
				var cmodes = data["cmodes"];
				if (umodes) message+=" "+umodes;
				if (cmodes) message+=" "+cmodes;
				irc.statusWindow.echo(message);
				break;
			case "LEFT": //command, channel
				var _window = irc.channels[channel]
				if (_window) _window.echo(" * Left channel "+data["channel"]);
				break;
			case "KICKEDFROM": //command, channel, kicker, message
				var channel = data["channel"];			
				var msg = "* You were kicked from "+channel+" by "+getNick(data["kicker"])+" ("+data["message"]+")";
				irc.channels[channel].echo(msg);
				irc.statusWindow.echo(msg);
				break;
			case "USERJOINED": //command, channel, user
				var channel = data["channel"];
				irc.channels[channel].echo("* "+formatUser(data["user"])+" has joined "+channel);
				break;
			case "USERLEFT": //command, user, channel
				var channel = data["channel"];
				irc.channels[channel].echo("* "+formatUser(data["user"])+" has left "+channel);
				break;
			case "USERQUIT": //command, user, quitMessage
				irc.channels[data["channel"]].echo("* "+formatUser(data["user"])+" Quit: "+data["quitMessage"]);
				break;
			case "USERKICKED": //command, kickee, channel, kicker, message
				irc.channels[data["channel"]].echo("* "+data["kickee"]+" was kicked by "+data["kicker"]+" ("+data["message"]+")");
				break;
			case "DISCONNECTED": //command
				$(makeArray(irc.channels)).each(function(index, _window) {_window.echo("* Disconnected.")});
				break;
			case "ACTION": //command, user, channel, action
				irc.channels[data["channel"]].echo("* "+getNick(data["user"])+" "+data["action"]);
				break;
			case "TOPICUPDATED": //command, user, channel, newTopic
				irc.channels[data["channel"]].echo("* "+getNick(data["user"])+" changes topic to '"+data["newTopic"]+"'");
				break;
			case "USERRENAMED": //command, oldname, newname
				break;
			case "RECEIVEDMOTD": //command, motd
				irc.statusWindow.echo(data["motd"]);
				break;
			case "NAMREPLY": //command, channel, names
				var channel = data["channel"];
				var newNames = data["names"];
				var names = irc._namesBuild[channel];
				if (names) irc._namesBuild[channel] += newNames;
				else irc._namesBuild[channel] = newNames;
				break;
			case "ENDOFNAMES": //command, channel
				var channel = data["channel"];
				var namesList = irc._namesBuild[channel];
				irc.channels[channel].setNames(namesList);
				delete irc._namesBuild[channel];				
				break;
			case "RAW": //command, line
				var txt = data["line"]+"<br />"
				$("#RAW").append(txt);
				$("#RAW").animate({scrollTop:$("#RAW")[0].scrollHeight}, 0);
				break;
		}
	};
};