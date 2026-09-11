import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app=express();
app.use(cors());
app.get('/health',(_,res)=>res.json({ok:true,service:'collab-canvas-server'}));
const server=createServer(app);
const wss=new WebSocketServer({server});
const rooms=new Map();
function getRoom(name){if(!rooms.has(name))rooms.set(name,{strokes:[],clients:new Map()});return rooms.get(name)}
function broadcast(room,message,except=null){const data=JSON.stringify(message);for(const client of room.clients.keys())if(client!==except&&client.readyState===1)client.send(data)}
wss.on('connection',(ws,req)=>{
 const url=new URL(req.url,'http://localhost');
 const roomName=(url.searchParams.get('room')||'main').slice(0,24);
 const room=getRoom(roomName); let user=null;
 ws.on('message',raw=>{
  let m; try{m=JSON.parse(raw.toString())}catch{return}
  if(m.type==='join'&&m.user){user={...m.user};room.clients.set(ws,user);ws.send(JSON.stringify({type:'init',strokes:room.strokes,users:[...room.clients.values()]}));broadcast(room,{type:'user-joined',user},ws);return}
  if(!user)return;
  if(m.type==='stroke'&&m.stroke){room.strokes.push(m.stroke);if(room.strokes.length>5000)room.strokes.shift();broadcast(room,{type:'stroke',stroke:m.stroke},ws);return}
  if(m.type==='cursor'){broadcast(room,{type:'cursor',userId:user.id,x:m.x,y:m.y},ws);return}
  if(m.type==='clear'){room.strokes=[];broadcast(room,{type:'clear'});return}
 });
 ws.on('close',()=>{if(user){room.clients.delete(ws);broadcast(room,{type:'user-left',userId:user.id});}if(room.clients.size===0)rooms.delete(roomName)});
});
const PORT=process.env.PORT||8080;
server.listen(PORT,()=>console.log(`Collab Canvas server running on port ${PORT}`));
