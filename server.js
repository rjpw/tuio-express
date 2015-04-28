var dServer = require("dgram").createSocket("udp4");
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// bind UDP datagram server to standard TUIO port
dServer.bind(3333, '0.0.0.0');

// bind HTTP server to port 8080
server.listen(8080);

io.on('connection', function (socket) {

  var dgramCallback = function (buf, rinfo) {
    // include sender info for client-side namespacing
    socket.emit('tuiomessage', {buffer: buf, sender: rinfo});
  };

  // forward UDP packets via socket.io
  dServer.on("message", dgramCallback);

  // prevent memory leak on disconnect
  socket.on('disconnect', function (socket) {
    dServer.removeListener('message', dgramCallback);
  });

});

//
app.use(express.static('public'));

// explicit index handler
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

