function handleInput(line) {
	if (line.length ===0) return;	
	var isCommand = line.substr(0,1) === "/" ? true : false;
	if (!isCommand) activeWindow.irc.send({command:"PRIVMSG", channel:activeWindow.channel, message:line});
	else if (!isCommand && !activeWindow.channel) activeWindow.echo("* This is not a channel. Type /join #someChannel to join one.");
	else {
		var split = line.split(" ");
		switch (split[0].substr(1).toUpperCase()) {
			case "J":
			case "JOIN":
				activeWindow.irc.send({command:"JOIN", channel:split[1], key:split.length>2 ? split[2] : ""}); return;
			case "NICK":
				activeWindow.irc.send({command:"NICK", nick:split[1]});	return;
			case "QUIT":
				activeWindow.irc.send({command:"QUIT"}); return;
			case "PART":
			case "LEAVE":
				activeWindow.close(); return; // close sends a LEAVE-command if activeWindow is a channel.
			case "MSG":
			case "PRIVMSG":
				var channel = split[1];
				split.splice(0, 2);
				activeWindow.irc.send({command:"PRIVMSG", channel:channel, message:split.join(" ")}); return;
			case "ME":
				split.splice(0, 1);
				activeWindow.irc.send({command:"ACTION", channel:activeWindow.channel, action:split.join(" ")}); return;
			default:
				activeWindow.irc.send({command:"RAW", message: message.substring(1)}); return;
		}
	}
}

$(function() {
	$("#settings").submit(function() {
		$("#overlay").slideUp();
		$("#input").attr("autofocus", true);
		$("#input").focus();
		var irc = new IRC($("#host").val(), $("#port").val(), $("#nick").val());
		irc.connect();
		return false;
	});
	$("#ircForm").submit(function() {
		var input = $("#ircInput");
		var line = input.val();
		handleInput(line);
		input.val("");
		return false;
	});
	$("#closeButton").click(function() {activeWindow.close();});
	$("#reconnectButton").click(function() {activeWindow.irc.reconnect(); });
	$("#newServerButton").click(function() {$("#overlay").slideDown(); });
	$("#cancel").click(function() {$("#overlay").slideUp(); });
	$("#tabs").on("click", ".tab", function() {findWindow($(this)).makeActive(); });
});