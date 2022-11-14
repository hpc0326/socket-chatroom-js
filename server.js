const express = require('express');
var app = express();
const path = require('path');
const http = require('http')
var server = http.createServer(app);

var port = process.env.PORT || 3000;
const socketIo = require('socket.io')
var io = socketIo(server);

let roomList = []
let streamingRoomList = []

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'client')));


app.get('/', function(req, res){
  res.render('./client/index.html');
});

//function define
const checkRoomList = (room) => {
  if (roomList.indexOf(room) == -1) return -1
  else return 1
}


//------------------------------------

//socket part
// 收到使用者連線
io.sockets.on('connection', (socket) => {
    console.log(socket.id, '已連線')
  
    socket.on('message', (room, data) => {
      io.in(room).emit('message', room, data)
    })
  
    socket.on('create', (room) => {
      const tmp = checkRoomList(room)
      console.log(roomList)
      if(tmp == -1){
        socket.join(room)
        roomList.push(room)
        socket.emit('joined', room, socket.id)
      }else if (tmp == 1){
        const msg = 'The room has already been created'
        socket.emit('createFailed', msg)
      }
      
    })
    
    socket.on('join', (room)=> {
      const tmp = checkRoomList(room)
      if(tmp == 1){
        socket.join(room)
        socket.emit('joined', room, socket.id)
      }else if (tmp == -1){
        const msg = "the room didn't exist"
        socket.emit('joinFailed', msg)
      }
    })

    socket.on('leave', (room) => {
      socket.leave(room)
      socket.to(room).emit('bye', room, socket.id)
      socket.emit('leave', room, socket.id)
    })

    socket.on('streaming', (room, data)=>{
      streamingRoomList.push(room)
      console.log(data, room)
      console.log(streamingRoomList)
    })

    socket.on('stopStreaming', (room, data)=>{
      delete streamingRoomList[streamingRoomList.indexOf(room)]
      console.log(data, room)
      console.log(streamingRoomList)
    })

  })


