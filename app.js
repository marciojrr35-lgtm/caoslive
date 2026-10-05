const socket = io();
const roomInput = document.getElementById("room");
const joinBtn = document.getElementById("join");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const copyBtn = document.getElementById("copy");
const video = document.getElementById("video");
const empty = document.getElementById("empty");
const status = document.getElementById("status");
const live = document.getElementById("live");
const hint = document.getElementById("hint");
const roomInfo = document.getElementById("roomInfo");
const roomLabel = document.getElementById("roomLabel");
const viewersEl = document.getElementById("viewers");

let room = new URLSearchParams(location.search).get("room") || "";
roomInput.value = room;
let role = "viewer";
let stream = null;
let peers = new Map();
let viewerCount = 0;
const pcConfig = { iceServers: [{urls:"stun:stun.l.google.com:19302"}] };

function setRoom(r){
  room = r.trim();
  if(!room) return alert("Digite o nome da sala.");
  history.replaceState({}, "", `?room=${encodeURIComponent(room)}`);
  roomInfo.textContent = room;
  roomLabel.textContent = " · " + room;
}
function joined(){
  status.textContent = "● CONECTADO";
  status.style.color = "#fff";
  hint.textContent = `Sala "${room}" conectada.`;
}
joinBtn.onclick = () => {
  setRoom(roomInput.value);
  socket.emit("join-room", {room, role:"viewer"});
};
startBtn.onclick = async () => {
  if(!room) setRoom(roomInput.value || "caoslive");
  try{
    stream = await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
    role = "broadcaster";
    socket.emit("join-room", {room, role});
    video.srcObject = stream; video.style.display = "block"; empty.style.display = "none";
    startBtn.disabled = true; stopBtn.disabled = false; joinBtn.disabled = true;
    live.textContent = "● AO VIVO"; live.style.color = "#fff";
    status.textContent = "● TRANSMITINDO"; status.style.color = "#fff";
    stream.getVideoTracks()[0].addEventListener("ended", stopStream);
  }catch(e){ alert("Não foi possível iniciar a captura da tela. Verifique a permissão do navegador."); }
};
stopBtn.onclick = stopStream;
function stopStream(){
  if(stream) stream.getTracks().forEach(t=>t.stop());
  stream = null;
  peers.forEach(pc=>pc.close()); peers.clear();
  startBtn.disabled = false; stopBtn.disabled = true; joinBtn.disabled = false;
  video.srcObject = null; video.style.display = "none"; empty.style.display = "block";
  live.textContent = "ENCERRADA"; live.style.color = "#999";
  status.textContent = "● OFFLINE"; status.style.color = "#999";
  socket.disconnect(); setTimeout(()=>location.reload(),100);
}
copyBtn.onclick = async () => {
  if(!room) setRoom(roomInput.value || "caoslive");
  const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`;
  await navigator.clipboard.writeText(url);
  copyBtn.textContent = "LINK COPIADO ✓";
  setTimeout(()=>copyBtn.textContent="COPIAR LINK DA SALA",1800);
};

socket.on("room-joined", data => {
  joined();
  if(data.broadcasterOnline) live.textContent = "● AO VIVO";
});
socket.on("broadcaster-online", ()=>{ live.textContent="● AO VIVO"; });
socket.on("viewer-joined", async ({viewerId}) => {
  if(!stream) return;
  const pc = new RTCPeerConnection(pcConfig);
  peers.set(viewerId, pc);
  stream.getTracks().forEach(track=>pc.addTrack(track, stream));
  pc.onicecandidate = e => { if(e.candidate) socket.emit("ice-candidate",{targetId:viewerId,candidate:e.candidate}); };
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer",{viewerId,offer});
  viewerCount++; viewersEl.textContent = viewerCount;
});
socket.on("answer", async ({viewerId,answer}) => {
  const pc = peers.get(viewerId);
  if(pc) await pc.setRemoteDescription(answer);
});
socket.on("viewer-left", ({viewerId}) => {
  const pc=peers.get(viewerId); if(pc) pc.close(); peers.delete(viewerId);
  viewerCount=Math.max(0,viewerCount-1); viewersEl.textContent=viewerCount;
});
let viewerPC = null; let broadcasterId = null;
socket.on("offer", async ({offer, broadcasterId: bid}) => { broadcasterId = bid;
  if(role === "broadcaster") return;
  viewerPC = new RTCPeerConnection(pcConfig);
  viewerPC.ontrack = e => {
    video.srcObject=e.streams[0]; video.style.display="block"; empty.style.display="none";
    live.textContent="● AO VIVO"; live.style.color="#fff";
  };
  viewerPC.onicecandidate = e => { if(e.candidate) socket.emit("ice-candidate",{targetId: broadcasterId ,candidate:e.candidate}); };
  await viewerPC.setRemoteDescription(offer);
  const answer=await viewerPC.createAnswer();
  await viewerPC.setLocalDescription(answer);
  // The signaling server identifies the sender as the broadcaster through socket.data.
  // Send the answer to the broadcaster using the socket event's target encoded by server.
  socket.emit("answer",{broadcasterId,answer});
});
socket.on("ice-candidate", async ({fromId,candidate}) => {
  if(role === "broadcaster"){
    const pc=peers.get(fromId); if(pc) await pc.addIceCandidate(candidate).catch(()=>{});
  } else if(viewerPC){
    await viewerPC.addIceCandidate(candidate).catch(()=>{});
  }
});
socket.on("stream-ended", ()=>{
  if(role !== "broadcaster"){
    video.srcObject=null; video.style.display="none"; empty.style.display="block";
    live.textContent="ENCERRADA"; live.style.color="#999";
  }
});
if(room) {
  setRoom(room);
  // Automatically joins as viewer.
  socket.emit("join-room",{room,role:"viewer"});
}