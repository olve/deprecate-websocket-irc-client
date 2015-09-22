var wsAddress = "ws://localhost:9001";

function MakeWebsocket() {
	var serverPane = $("#-pane--server");
	write(serverPane, "* Starting IRC")
	var ws = new WebSocket(wsAddress);
	ws.onmessage = function(event) {
		var data = event.data.split(";")
		var message = data[0];		
		var target = data[1];
		alert(target);
		var targetPane;
		if (target == "") targetPane = serverPane;
		else targetPane = $("#-pane-"+target);
		write(targetPane, message);	};
	ws.onopen = function(event) {
		var nick = $("#nick").val();
		var host = $("#host").val();
		var port = $("#port").val();
		if (port === "") port = "6667";
		write(serverPane, "* Connecting to "+host+"("+port+")")
		ws.send(nick+";"+host+";"+port); };
	ws.onerror = function(event) {write(serverPane, "* Error: "+event.data); };
	ws.onclose = function(event) {write(serverPane, "* Disconnected"); };
	return ws; }