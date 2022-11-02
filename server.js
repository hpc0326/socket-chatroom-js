'use strict'

const https = require('https')
const fs = require('fs')
const express = require('express')
const socketIo = require('socket.io')

const app = express()

/*const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}*/

const https_server = https.createServer( app)
https_server.listen(4443, '0.0.0.0')

const io = socketIo(https_server, {
  cors: true,
})

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