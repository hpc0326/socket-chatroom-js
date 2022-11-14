'use strict'

const userName = document.querySelector('input#username')
const inputRoom = document.querySelector('input#room')
const btnConnect = document.querySelector('button#connect')
const btnLeave = document.querySelector('button#leave')
const outputArea = document.querySelector('textarea#output')
const inputArea = document.querySelector('textarea#input')
const btnSend = document.querySelector('button#send')
const btncreateChannel = document.querySelector('button#createChannel')
const btnStreaming = document.getElementById('streaming')
const btnPulling = document.getElementById('pulling')
const btnStopStreaming = document.getElementById('stopStreaming')

let socket
let room

const streaming = () => {
  socket.emit('streaming', room, 'streaming')
  btnStreaming.disabled = true
  btnPulling.disabled = true
  btnStopStreaming.disabled = false
}

const stopStreaming = () => {
  socket.emit('stopStreaming', room, 'stopstreaming')
  btnStreaming.disabled = false
  btnPulling.disabled = false
  btnStopStreaming.disabled = true
}

const socketFunc = (process) => {
  console.log(process)
  //const url = 'wss://20.189.104.97:4443'
  //const url = 'http://localhost:3000'
  room = inputRoom.value
  socket = io()
  //console.log(url)

  socket.on('joined', (room, id) => {
    btncreateChannel.disabled = true
    btnConnect.disabled = true
    btnLeave.disabled = false
    inputArea.disabled = false
    btnSend.disabled = false
  })

  socket.on('leave', (room, id) => {
    btncreateChannel.disabled = false
    btnConnect.disabled = false
    btnLeave.disabled = true
    inputArea.disabled = true
    btnSend.disabled = true

    socket.disconnect()
  })

  socket.on('message', (room, data) => {
    console.log(room, data)
    outputArea.scrollTop = outputArea.scrollHeight
    outputArea.value = outputArea.value + data + '\n'
  })

  socket.on('disconnect', (reason) => {
    btncreateChannel.disabled = false
    btnConnect.disabled = false
    btnLeave.disabled = true
    inputArea.disabled = true
    btnSend.disabled = true
  })


  //Failed Area
  socket.on('createFailed', (msg)=>{
    console.log(msg)
    btncreateChannel.disabled = false
    btnConnect.disabled = false
    btnLeave.disabled = true
    inputArea.disabled = true
    btnSend.disabled = true
    socket.disconnect()
  })

  socket.on('joinFailed', (msg)=>{
    console.log(msg)
    btncreateChannel.disabled = false
    btnConnect.disabled = false
    btnLeave.disabled = true
    inputArea.disabled = true
    btnSend.disabled = true
    socket.disconnect()
  })
  //-------------------------


  //exe init
  if(process == 1){
    socket.emit('create', room)
  }else if (process == 2){
    socket.emit('join', room)
  }
  //------------------------------
}

btnSend.onclick = () => {
  let data = inputArea.value
  data = userName.value + ':' + data
  socket.emit('message', room, data)
  inputArea.value = ''
}

btnLeave.onclick = () => {
  room = inputRoom.value
  socket.emit('leave', room)
}

inputArea.onkeypress = (event) => {
  if (event.keyCode === 13) {
    let data = inputArea.value
    data = userName.value + ':' + data
    socket.emit('message', room, data)
    inputArea.value = ''
    event.preventDefault()
  }
}


btncreateChannel.onclick = () => socketFunc(1)
btnConnect.onclick = () => socketFunc(2)
btnStreaming.onclick = () => streaming()
btnStopStreaming.onclick = () => stopStreaming()