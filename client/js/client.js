'use strict'


//NEED TO DO : Solve the Start button problem DOMException
//Shorterm Goal : Fininsh the Cross-device WebRTC
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
const remoteVideo = document.getElementById('remoteVideo')
const btnstart = document.getElementById('start')
const btninit = document.getElementById('btninit')
let socketID
let socket
let room
let peer
let localStream
let offer


const signalOption = {
  offerToReceiveAudio: 1, // 是否傳送聲音流給對方
  offerToReceiveVideo: 1, // 是否傳送影像流給對方
};


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
  console.log('gotstream')
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

const addLocalStream = () => {
  console.log('add localstream')
  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });
};

//peer connection
const createPeerConnection = () => {
  const configuration = {
    iceServers: [{
      urls: 'stun:stun.l.google.com:19302' // Google's public STUN server
    }]
   };
  peer = new RTCPeerConnection(configuration)
  console.log('peer created')
}


//new
// 監聽 ICE Server
function onIceCandidates() {
  // 找尋到 ICE 候選位置後，送去 Server 與另一位配對
  peer.onicecandidate = ({ candidate }) => {
    if (!candidate) { return; }
    console.log('onIceCandidate => ', candidate);
    socket.emit("peerconnectSignaling",room ,{ candidate }, socketID);
  };
};

// 監聽 ICE 連接狀態
function onIceconnectionStateChange() {
  peer.oniceconnectionstatechange = (evt) => {
    console.log('ICE 伺服器狀態變更 => ', evt.target.iceConnectionState);
  };
}

// 監聽是否有流傳入，如果有的話就顯示影像
function onAddStream() {
  peer.onaddstream = (event) => {
    if(!remoteVideo.srcObject && event.stream){
      remoteVideo.srcObject = event.stream;
      console.log('接收流並顯示於遠端視訊！', event);
    }
  }
}


function initPeerConnection() {
  createPeerConnection();
  console.log('init peer connection')
  addLocalStream();
  onIceCandidates();
  onIceconnectionStateChange();
  onAddStream();
  createSignal(true, socketID);
  room = inputRoom.value
  socket.emit('addstreamer',room)
}

async function createSignal(isOffer, ID) {
  try {
    if (!peer) {
      console.log('尚未開啟視訊');
      return;
    }
    // 呼叫 peerConnect 內的 createOffer / createAnswer
    offer = await peer[`create${isOffer ? 'Offer' : 'Answer'}`](signalOption);

    // 設定本地流配置
    await peer.setLocalDescription(offer);
    sendSignalingMessage(peer.localDescription, isOffer ? true : false, ID)
  } catch(err) {
    console.log(err);
  }
};

function sendSignalingMessage(desc, offer, ID) {
  const isOffer = offer ? "offer" : "answer";
  console.log(`寄出 ${isOffer}`);
  socket.emit("peerconnectSignaling",room ,{ desc }, ID);
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

}

const stopStreaming = () => {
  socket.emit('stopStreaming', room, 'stopstreaming')
  btnStreaming.disabled = false
  btnPulling.disabled = false
  btnStopStreaming.disabled = true
}

const pulling = () => {
  console.log('pulling')
  createPeerConnection();
  onIceCandidates();
  onIceconnectionStateChange();
  onAddStream();
  createSignal(true, socketID);
  
}

const socketFunc = (process) => {
  console.log(process)
  //const url = 'wss://20.189.104.97:4443'
  const url = 'http://localhost:3000'
  room = inputRoom.value
  socket = io()
  

  socket.on('joined', (room, id) => {
    socketID = id
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

  socket.on('deleteRoom', (data) => {
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

  socket.on('peerconnectSignaling', async ({ desc, candidate }, ID) => {
    // desc 指的是 Offer 與 Answer
    // currentRemoteDescription 代表的是最近一次連線成功的相關訊息
    console.log(ID, 'IDDDDDDDDDDDDDDDDDDDDDDDD')
    if (desc && !peer.currentRemoteDescription) {
      console.log('desc => ', desc);
      
      await peer.setRemoteDescription(new RTCSessionDescription(desc));
      createSignal(desc.type === 'answer' ? true : false, ID);
    } else if (candidate) {
      // 新增對方 IP 候選位置
      console.log('candidate =>', candidate);
      peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

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
btninit.onclick = () => initPeerConnection()
//btnstart.onclick = () => createSignal(true)
btnLeave.onclick = () => socket.emit('deleteRoom', room)