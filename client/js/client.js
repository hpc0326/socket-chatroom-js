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

const audioInputSelect = document.querySelector('select#audioSource')
const audioOutputSelect = document.querySelector('select#audioOutput')
const videoSelect = document.querySelector('select#videoSource')
const selectors = [audioInputSelect, audioOutputSelect, videoSelect]
const videoElement = document.getElementById('player')

let socket
let room
let peer
let localStream

// 將讀取到的設備加入到 select 標籤中
const gotDevices = (deviceInfos) => {
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map((select) => select.value)
  selectors.forEach((select) => {
    while (select.firstChild) {
      select.removeChild(select.firstChild)
    }
  })
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i]
    const option = document.createElement('option')
    option.value = deviceInfo.deviceId
    if (deviceInfo.kind === 'audioinput') {
      option.text =
        deviceInfo.label || `microphone ${audioInputSelect.length + 1}`
      audioInputSelect.appendChild(option)
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text =
        deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`
      audioOutputSelect.appendChild(option)
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`
      videoSelect.appendChild(option)
    } else {
      console.log('Some other kind of source/device: ', deviceInfo)
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (
      Array.prototype.slice
        .call(select.childNodes)
        .some((n) => n.value === values[selectorIndex])
    ) {
      select.value = values[selectorIndex]
    }
  })
}

// 手動修改音訊的輸出 例如預設耳機切換成喇叭
const attachSinkId = (element, sinkId) => {
  if (typeof element.sinkId !== 'undefined') {
    element
      .setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`)
      })
      .catch((error) => {
        let errorMessage = error
        if (error.name === 'SecurityError') {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`
        }
        console.error(errorMessage)
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0
      })
  } else {
    console.warn('Browser does not support output device selection.')
  }
}

// 處理音訊改變的方法
function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value
  attachSinkId(videoElement, audioDestination)
}

// 將視訊顯示在 video 標籤上
function gotStream(stream) {
  videoElement.srcObject = stream
  localStream = stream
  return navigator.mediaDevices.enumerateDevices()
}

// 播放自己的視訊
function start() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop()
    })
  }
  const audioSource = audioInputSelect.value
  const videoSource = videoSelect.value
  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: { deviceId: videoSource ? { exact: videoSource } : undefined },
  }
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .then(gotDevices)
    .catch(handleError)
}

//peer connection
const createPeerConnection = () => {
  const configuration = {
    iceServers: [{
      urls: 'stun:stun.l.google.com:19302' // Google's public STUN server
    }]
   };
  peer = new RTCPeerConnection(configuration)
  console.log('peer created')
  console.log(peer)
}

const addLocalStream = () => {
  peer.addStream(localstream)
};

// 錯誤處理
function handleError(error) {
  console.log(
    'navigator.MediaDevices.getUserMedia error: ',
    error.message,
    error.name,
  )
}
const streaming = () => {
  navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError)
  start()
  createPeerConnection()
  socket.emit('streaming', room, peer)
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

const pulling = () => {
  createPeerConnection()
  console.log('pulling')
  console.log(peer)
  socket.emit('pulling', room , peer)
}

const socketFunc = (process) => {
  console.log(process)
  //const url = 'wss://20.189.104.97:4443'
  const url = 'http://localhost:3000'
  room = inputRoom.value
  socket = io()
  

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

  socket.on('test', (data) => {
    console.log(data)
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
    console.log('url')
    socket.emit('create', room)
    console.log('url')
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
btnPulling.onclick = () => pulling()
audioOutputSelect.onchange = changeAudioDestination