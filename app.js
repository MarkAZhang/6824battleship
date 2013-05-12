var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    sio = require('socket.io').listen(server)

var cookie = require('cookie');
var connect = require('connect');

server.listen(8080)

app.configure(function () {
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret', key: 'express.sid'}));
    app.use("/js", express.static(__dirname + '/js'));
    app.use("/", express.static(__dirname));
});



var clients = {}

var state = "idle"
 
// Listen for incoming connections from clients
sio.sockets.on('connection', function (socket) {
    console.log(sio.sockets.clients());

    console.log("CLIENT CONNECTED WITH ID "+socket.handshake.sessionID+" "+socket.id)
    if(!clients.hasOwnProperty(socket.handshake.sessionID)) {
      clients[socket.handshake.sessionID] = []
    }
    clients[socket.handshake.sessionID].push(socket.id)

    // Start listening for mouse move events
    socket.on('send action', receiveDataFromClient);

    socket.on("get status", function(data) {
      socket.emit("status", {state: state, num_players: get_num_players()})
    })
    socket.on('disconnect', function () {
      clients[socket.handshake.sessionID].pop(socket.handshake.sessionID);
      console.log('DISCONNESSO!!! '+socket.handshake.sessionID);
    });
});

function get_num_players() {
  var num = 0
  for(var sessionid in clients) {
    if(clients[sessionid].length > 0) {
      num++
    }
  }
  return num
}

sio.set('log level', 1);

sio.set('authorization', function (data, accept) {
    // check if there's a cookie header
    if (data.headers.cookie) {
        // if there is, parse the cookie
        data.cookie = connect.utils.parseSignedCookies(cookie.parse(data.headers.cookie),'secret');
        // note that you will need to use the same key to grad the
        // session id, as you specified in the Express setup.
        data.sessionID = data.cookie['express.sid'];
    } else {
       // if there isn't, turn down the connection with a message
       // and leave the function.
       return accept('No cookie transmitted.', false);
    }
    // accept the incoming connection
    accept(null, true);
});

function receiveDataFromClient(data) {
//  socket.emit('server response', data)
}
