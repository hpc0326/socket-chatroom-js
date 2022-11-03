'use strict'
var express = require('express');
var app = express();

// var io = require('../..')(server);
// New:

const https = require('https')
const http = require('http')
const fs = require('fs')

const socketIo = require('socket.io')



/*const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}

const https_server = https.createServer(options, app)
https_server.listen(process.env.PORT || 443)

const io = socketIo(https_server, {
  cors: true,
})*/

var server = http.createServer(app);
var io = socketIo(server);
var port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
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