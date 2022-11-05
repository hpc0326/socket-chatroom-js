const express = require('express');
var app = express();
const path = require('path');
const http = require('http')
var server = http.createServer(app);

var port = process.env.PORT || 3000;
const socketIo = require('socket.io')
var io = socketIo(server);
server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'client')));


app.get('/', function(req, res){
  res.render('./client/index.html');
});

// 收到使用者連線
io.sockets.on('connection', (socket) => {
    console.log(socket.id, '已連線')
  
    socket.on('message', (room, data) => {
      io.in(room).emit('message', room, data)
    })
  
    socket.on('join', (room) => {
      socket.join(room)
      socket.emit('joined', room, socket.id)
    })
  
    socket.on('leave', (room) => {
      socket.leave(room)
      socket.to(room).emit('bye', room, socket.id)
      socket.emit('leave', room, socket.id)
    })
  })