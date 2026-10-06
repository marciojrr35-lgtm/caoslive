const roomInput = document.getElementById("room");
const startBtn = document.getElementById("start");
const watchBtn = document.getElementById("watch");
const copyRoomBtn = document.getElementById("copyRoom");
const shareBtn = document.getElementById("share");
const stopBtn = document.getElementById("stop");

const setup = document.getElementById("setup");
const live = document.getElementById("live");
const viewer = document.getElementById("viewer");

const video = document.getElementById("video");
const viewerVideo = document.getElementById("viewerVideo");

const status = document.getElementById("status");
const roomLabel = document.getElementById("roomLabel");
const viewerRoom = document.getElementById("viewerRoom");
const viewerMsg = document.getElementById("viewerMsg");

let socket;
let localStream;
let peer;
let currentRoom = "";

function randomRoom() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

roomInput.value = randomRoom();

function connect(role) {
  currentRoom = roomInput.value.trim().toUpperCase();

  if (!currentRoom) {
    alert("Digite um código para a sala.");
    return;
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: "join",
      room: currentRoom,
      role
    }));
  };

  socket.onmessage = async event => {
    const msg = JSON.parse(event.data);

    if (msg.type === "error") {
      alert(msg.message);
      return;
    }

    if (msg.type === "viewer-joined" && role === "broadcaster") {
      await createOffer();
    }

    if (msg.type === "offer" && role === "viewer") {
      await receiveOffer(msg);
    }

    if (msg.type === "answer" && role === "broadcaster") {
      await peer.setRemoteDescription(msg.answer);
    }

    if (msg.type === "candidate") {
      try {
        if (peer && msg.candidate) {
          await peer.addIceCandidate(msg.candidate);
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (msg.type === "stream-ended") {
      viewerMsg.textContent = "A transmissão foi encerrada.";
      viewerVideo.srcObject = null;
      status.textContent = "● OFFLINE";
    }

    if (msg.type === "joined" && msg.live && role === "viewer") {
      viewerMsg.textContent = "Conectado. Aguardando vídeo...";
    }
  };
}

async function createPeer() {
  peer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  });

  peer.onicecandidate = event => {
    if (event.candidate && socket) {
      socket.send(JSON.stringify({
        type: "candidate",
        candidate: event.candidate
      }));
    }
  };

  peer.ontrack = event => {
    viewerVideo.srcObject = event.streams[0];
    viewerMsg.textContent = "Você está assistindo ao vivo!";
  };
}

async function createOffer() {
  if (!peer) {
    await createPeer();

    localStream.getTracks().forEach(track => {
      peer.addTrack(track, localStream);
    });
  }

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.send(JSON.stringify({
    type: "offer",
    offer
  }));
}

async function receiveOffer(msg) {
  await createPeer();

  await peer.setRemoteDescription(msg.offer);

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.send(JSON.stringify({
    type: "answer",
    answer
  }));
}

startBtn.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    video.srcObject = localStream;

    setup.classList.add("hidden");
    live.classList.remove("hidden");

    roomLabel.textContent = "Sala: " + roomInput.value.toUpperCase();
    status.textContent = "● AO VIVO";

    connect("broadcaster");

    localStream.getVideoTracks()[0].onended = stopBroadcast;

  } catch (error) {
    alert("Não foi possível iniciar o compartilhamento da tela.");
    console.error(error);
  }
};

watchBtn.onclick = () => {
  setup.classList.add("hidden");
  viewer.classList.remove("hidden");

  viewerRoom.textContent = "Sala: " + roomInput.value.toUpperCase();
  viewerMsg.textContent = "Conectando...";

  connect("viewer");
};

function getShareLink() {
  const url = new URL(location.href);
  url.searchParams.set("room", currentRoom);
  return url.toString();
}

copyRoomBtn.onclick = async () => {
  const link = getShareLink();

  try {
    await navigator.clipboard.writeText(link);
    alert("Link copiado!");
  } catch {
    prompt("Copie este link:", link);
  }
};

shareBtn.onclick = async () => {
  const link = getShareLink();

  try {
    await navigator.clipboard.writeText(link);
    alert("Link da transmissão copiado!");
  } catch {
    prompt("Copie este link:", link);
  }
};

function stopBroadcast() {
  if (socket) {
    socket.send(JSON.stringify({
      type: "stop"
    }));

    socket.close();
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  if (peer) {
    peer.close();
    peer = null;
  }

  video.srcObject = null;
  live.classList.add("hidden");
  setup.classList.remove("hidden");
  status.textContent = "● OFFLINE";
}

stopBtn.onclick = stopBroadcast;

const params = new URLSearchParams(location.search);
const urlRoom = params.get("room");

if (urlRoom) {
  roomInput.value = urlRoom.toUpperCase();
      }
