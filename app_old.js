// Including libraries

var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    static = require('node-static'); // for serving files

var fileServer = new static.Server('./');

// This is the port for our web server.
// you will need to go to http://localhost:8080 to see it
app.listen(8080);

// If the URL of the socket server is opened in a browser
function handler (request, response) {

    request.addListener('end', function () {
        fileServer.serve(request, response); // this will return the correct file
    });
}

// Delete this row if you want to see debug messages
io.set('log level', 1);

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {

    // Start listening for mouse move events
    socket.on('send action', receiveDataFromClient(data));

    socket.on("get_num_players", function(data) {

      })

});

function receiveDataFromClient(data) {
  socket.emit('server response', data)
}
