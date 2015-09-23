websocket-irc-client
=====================
Abandoned webapp, IRC client with UI with a lot of position: absolute, rendered with jquery, that would connect to a Flask/Autobahn.websocket/twisted backend.

The project's ultimate downfalls:

0. Websockets grant no benefit over AJAX here, in fact they just make you more susceptible to disconnects.
1. All the users of the client would connect to the network with the same IP (the server's). Some servers have workarounds for this, where you can use the user and ident do identify as a web client, but not all of them.
2. twisted's approach to IRC is that if you want special handling of commands, you must overwrite the default for every particular IRC command. This combined with the fact that IRC is ancient, inconsistent, and that there are many different daemons doing things differently; you would have to write a LOT of code to handle all the data the IRC server throws at you.
