websocket-irc-client
=====================
Abandoned webapp, IRC client with UI with a lot of position: absolute, rendered with jquery, that would connect to a Flask/Autobahn.websocket/twisted backend.

The project's ultimate downfalls:

0. Websockets grant no benefit over AJAX here, in fact they just make you more susceptible to disconnects.
1. All the users of the client would connect to the network with the same IP (the server's). Some servers have workarounds for this, where you can use the user and ident do identify as a web client, but not all of them.

