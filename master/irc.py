from autobahn.websocket import WebSocketServerFactory
from autobahn.websocket import WebSocketServerProtocol
from twisted.internet import protocol
import twisted.words.protocols.irc
from twisted.internet import reactor
from twisted.internet import ssl
import re
import simplejson

decoder = simplejson.JSONDecoder()
encoder = simplejson.JSONEncoder()

def decode(data):
    return {key.encode("utf-8"):value.encode("utf-8") for key ,value in decoder.decode(data).iteritems()}

class wsFactory(WebSocketServerFactory):
    def clientConnectionLost(self, connector, reason):
        self.protocol.irc.quit()
    def buildProtocol(self, addr):
        protocol = wsProtocol()
        protocol.factory = self
        self.protocol = protocol
        return protocol

class ircFactory(protocol.ClientFactory):
    def __init__(self, ws, nick):
        self.ws = ws
        self.nick = nick
        self.protocol = None
    def buildProtocol(self, addr):
        protocol = ircProtocol(self.ws, self.nick)
        protocol.factory = self
        self.protocol = protocol
        return protocol
    def clientConnectionLost(self, connector, reason):
        self.protocol.send({"command":"DISCONNECTED"})

class wsProtocol(WebSocketServerProtocol):
    def __init__(self):
        self.irc = None
    def onMessage(self, data, binary):
        data = decode(data)
        if data["command"] == "CONNECT":
            host = str(data["host"]).strip()
            port = str(data["port"]).strip()
            nick = str(data["nick"]).strip()
            self.irc = ircFactory(self, nick)            
            if port.startswith("+"):
                reactor.connectSSL(host, int(port.strip("+")), self.irc, ssl.ClientContextFactory())
            else:
                reactor.connectTCP(host, int(port), self.irc)
            self.onMessage = self.onMessagePostConnection
    def onMessagePostConnection(self, message, binary):
        self.irc.protocol.handleMessage(message)

class ircProtocol(twisted.words.protocols.irc.IRCClient, object):
    def __init__(self, ws, nick):
        self.ws = ws
        self.nickname = nick
        self._names = []
        super(ircProtocol, self).__init__()
    def lineReceived(self, line):
        print line
        self.send({"command":"RAW", "line":line})
        super(ircProtocol, self).lineReceived(line)
    def send(self, message):
        self.ws.sendMessage(encoder.encode(message))
    def handleMessage(self, message):
        data = decode(message)
        if data["command"] == "RAW":
            self.sendLine(data["message"])
        elif data["command"] == "PRIVMSG":
            channel = data["channel"]
            message = data["message"]
            self.msg(channel, message)
            self.send({"command":"PRIVMSG", "user":self.nickname, "channel":channel, "message":message})
        elif data["command"] == "QUIT":
            self.quit()
        elif data["command"] == "NICK":
            self.setNick(data["nick"])
        elif data["command"] == "ACTION":
            self.me(data["channel"], data["action"])
            self.send({"command":"ACTION", "channel":data["channel"], "action":data["action"]})
        elif data["command"] == "JOIN":
            key = data["key"]
            if not key:
                key = None
            self.join(data["channel"], key)
        elif data["command"] == "LEAVE":
            self.leave(data["channel"])
    def me(self, channel, action):
        if channel[0] not in "&#!+": channel = "#" + channel
        self.ctcpMakeQuery(channel, [("ACTION", action)])
    def joined(self, channel):
        self.send({"command":"JOINED", "channel":channel})
    def noticed(self, user, channel, message):
        self.send({"command":"NOTICED", "user":user, "channel":channel, "message":message})
    def privmsg(self, user, channel, message):
        self.send({"command":"PRIVMSG", "user":user, "channel":channel, "message":message})
    def irc_ERR_NICKNAMEINUSE(self, prefix, params):
        self.nickname = self.nickname+"_"
        self.register(self.nickname)
        self.send({"command":"IRC_ERR_NICKNAMEINUSE", "oldnick":self.nickname, "newnick":self.nickname})
    def nickchanged(self, nick):
        self.send({"command":"NICKCHANGED", "nick":nick})
    def sendInfo(self, info):
        self.send({"command":"INFO", "info":info})        
    def created(self, when):
        self.sendInfo(when)
    def yourHost(self, info):
        self.sendInfo(info)
    def myInfo(self, servername, version, umodes, cmodes):
        self.send({"command":"MYINFO", "servername":servername, "version":version, "umodes":umodes, "cmodes":cmodes})
    def luserClient(self, info):
        self.sendInfo(info)
    def isupport(self, options):
        if options:
            self.sendInfo(" ".join(options))
    def luserChannels(self, channels):
        if channels:
            self.sendInfo("There are %s channels on this server" % str(channels))
    def luserOp(self, ops):
        if ops:
            self.sendInfo("There are %s ops logged on to the server" % str(ops))
    def luserMe(self, info):
        self.sendInfo(info)
    def left(self, channel):
        self.send({"command":"LEFT", "channel":channel})
    def kickedFrom(self, channel, kicker, message):
        self.send({"command":"KICKEDFROM", "channel":channel, "kicker":kicker, "message":message})
    def userJoined(self, user, channel):
        self.send({"command":"USERJOINED", "user":user, "channel":channel})
    def userLeft(self, user, channel):
        self.send({"comamnd":"USERLEFT", "user":user, "channel":channel})
    def userQuit(self, user, quitMessage):
        self.send({"command:":"USERQUIT", "user":user, "quitMessage":quitMessage})
    def userKicked(self, kickee, channel, kicker, message):
        self.send({"command":"USERKICKED", "kickee":kickee, "channel":channel, "kicker":kicker, "message":message})
    def action(self, user, channel, data):
        self.send({"command":"ACTION", "user":user, "channel":channel, "action":data})
    def topicUpdated(self, user, channel, newTopic):
        self.send({"command":"TOPICUPDATED", "user":user, "channel":channel, "newTopic":newTopic})
    def userRenamed(self, oldname, newname):
        self.send({"command":"USERRENAMED", "oldname":oldname, "newname":newname})
    def receivedMOTD(self, motd):
        self.send({"command":"RECEIVEDMOTD", "motd":"<br />".join(motd)})
    def irc_RPL_NAMREPLY(self, prefix, params):
        self.send({"command":"NAMREPLY", "channel":params[2], "names":params[3]})
    def irc_RPL_ENDOFNAMES(self, prefix, params):
        self.send({"command":"ENDOFNAMES", "channel":params[1]})
