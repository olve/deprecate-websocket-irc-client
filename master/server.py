import sys
import flask
from twisted.internet import reactor
from twisted.web.wsgi import WSGIResource
from twisted.web import server
from twisted.python import log
from irc import wsFactory

app = flask.Flask(__name__)
@app.route("/")
def index():
	return flask.render_template("index.html")

log.startLogging(sys.stdout)
reactor.listenTCP(9001, wsFactory("ws://localhost:9001"))
reactor.listenTCP(5001, server.Site(WSGIResource(reactor, reactor.getThreadPool(), app)))
reactor.run()

#from autobahn.websocket import listenWS
#listenWS(wsFactory("ws://localhost:9001"))
#app.run(debug=False, host="0.0.0.0", port=5000
#app.wsgi_app = reactor.run
#resource = WSGIResource(reactor, reactor.getThreadPool(), lambda: app.run(debug=False, host="0.0.0.0", port=5000))
#site = server.Site(resource)
#app.run(debug=True, host="0.0.0.0", port=5000)
