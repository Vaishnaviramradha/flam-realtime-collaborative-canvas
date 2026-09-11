import { useEffect, useRef, useState } from 'react';

type Point = { x:number; y:number };
type Stroke = { id:string; color:string; width:number; points:Point[]; userId:string };
type User = { id:string; name:string; color:string };
type Message =
  | { type:'init'; strokes:Stroke[]; users:User[] }
  | { type:'stroke'; stroke:Stroke }
  | { type:'cursor'; userId:string; x:number; y:number }
  | { type:'user-joined'; user:User }
  | { type:'user-left'; userId:string }
  | { type:'clear' };

const SERVER_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
const COLORS = ['#111827','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];
const makeId = () => crypto.randomUUID();

function App(){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket|null>(null);
  const drawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const usersRef = useRef<User[]>([]);
  const cursorRef = useRef<Record<string, Point>>({});
  const [color,setColor] = useState(COLORS[0]);
  const [width,setWidth] = useState(4);
  const [users,setUsers] = useState<User[]>([]);
  const [connected,setConnected] = useState(false);
  const [room,setRoom] = useState('main');
  const [name] = useState(() => `Guest-${Math.floor(1000+Math.random()*9000)}`);
  const meRef = useRef<User>({id:makeId(),name,color:COLORS[Math.floor(Math.random()*COLORS.length)]});

  const resizeCanvas = () => {
    const c=canvasRef.current; if(!c) return;
    const rect=c.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
    c.width=Math.floor(rect.width*dpr); c.height=Math.floor(rect.height*dpr);
    const ctx=c.getContext('2d')!; ctx.setTransform(dpr,0,0,dpr,0,0); redraw();
  };
  const redraw = () => {
    const c=canvasRef.current; if(!c) return;
    const ctx=c.getContext('2d')!; const rect=c.getBoundingClientRect();
    ctx.clearRect(0,0,rect.width,rect.height); ctx.fillStyle='#fff'; ctx.fillRect(0,0,rect.width,rect.height);
    for(const s of strokesRef.current) drawStroke(ctx,s);
    for(const [id,p] of Object.entries(cursorRef.current)){
      const u=usersRef.current.find(x=>x.id===id); if(!u) continue;
      ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fillStyle=u.color; ctx.fill();
      ctx.font='12px Inter, sans-serif'; ctx.fillText(u.name,p.x+9,p.y-8);
    }
  };
  const drawStroke=(ctx:CanvasRenderingContext2D,s:Stroke)=>{
    if(s.points.length<1)return; ctx.beginPath(); ctx.strokeStyle=s.color; ctx.lineWidth=s.width; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.moveTo(s.points[0].x,s.points[0].y); for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y); ctx.stroke();
  };
  const pointFromEvent=(e:PointerEvent):Point=>{const r=canvasRef.current!.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  const send=(m:Message)=>{if(socketRef.current?.readyState===WebSocket.OPEN)socketRef.current.send(JSON.stringify(m));};
  const connect=()=>{
    socketRef.current?.close(); const ws=new WebSocket(`${SERVER_URL}?room=${encodeURIComponent(room)}`); socketRef.current=ws;
    ws.onopen=()=>{setConnected(true); ws.send(JSON.stringify({type:'join',user:meRef.current}));};
    ws.onclose=()=>setConnected(false);
    ws.onmessage=(e)=>{const m=JSON.parse(e.data) as Message;
      if(m.type==='init'){strokesRef.current=m.strokes;usersRef.current=m.users;setUsers(m.users);redraw();}
      if(m.type==='stroke'){strokesRef.current.push(m.stroke);redraw();}
      if(m.type==='cursor'){cursorRef.current[m.userId]={x:m.x,y:m.y};redraw();}
      if(m.type==='user-joined'){if(!usersRef.current.some(u=>u.id===m.user.id)){usersRef.current.push(m.user);setUsers([...usersRef.current]);}}
      if(m.type==='user-left'){usersRef.current=usersRef.current.filter(u=>u.id!==m.userId);delete cursorRef.current[m.userId];setUsers([...usersRef.current]);redraw();}
      if(m.type==='clear'){strokesRef.current=[];redraw();}
    };
  };
  useEffect(()=>{connect(); const ro=new ResizeObserver(resizeCanvas); if(canvasRef.current)ro.observe(canvasRef.current); window.addEventListener('resize',resizeCanvas); return()=>{ro.disconnect();window.removeEventListener('resize',resizeCanvas);socketRef.current?.close();};},[room]);
  useEffect(()=>{resizeCanvas();},[]);

  const onDown=(e:React.PointerEvent)=>{if(e.button!==0)return; e.currentTarget.setPointerCapture(e.pointerId);drawingRef.current=true;currentPointsRef.current=[pointFromEvent(e.nativeEvent)];redraw();};
  const onMove=(e:React.PointerEvent)=>{const p=pointFromEvent(e.nativeEvent);send({type:'cursor',userId:meRef.current.id,x:p.x,y:p.y});if(!drawingRef.current)return;currentPointsRef.current.push(p); const c=canvasRef.current!; const ctx=c.getContext('2d')!;drawStroke(ctx,{id:'local',color,width,points:currentPointsRef.current,userId:meRef.current.id});};
  const onUp=()=>{if(!drawingRef.current)return;drawingRef.current=false; const stroke:Stroke={id:makeId(),color,width,points:[...currentPointsRef.current],userId:meRef.current.id};strokesRef.current.push(stroke);send({type:'stroke',stroke});currentPointsRef.current=[];redraw();};
  const clear=()=>{send({type:'clear'});strokesRef.current=[];redraw();};
  const download=()=>{const a=document.createElement('a');a.download='collaborative-drawing.png';a.href=canvasRef.current!.toDataURL('image/png');a.click();};

  return <div className="app">
    <header><div><h1>Collaborative Canvas</h1><p>Draw together in real time</p></div><div className="status"><span className={connected?'dot online':'dot'}></span>{connected?'Connected':'Connecting…'} · Room <b>{room}</b></div></header>
    <main>
      <aside className="panel">
        <label>Room</label><div className="roomRow"><input value={room} onChange={e=>setRoom(e.target.value.replace(/[^a-zA-Z0-9-_]/g,'').slice(0,24)||'main')} /><button onClick={connect}>Join</button></div>
        <label>Brush color</label><div className="colors">{COLORS.map(c=><button key={c} className={'swatch '+(color===c?'selected':'')} style={{background:c}} onClick={()=>setColor(c)} aria-label={c}/>)}</div>
        <label>Brush size: {width}px</label><input type="range" min="1" max="24" value={width} onChange={e=>setWidth(Number(e.target.value))}/>
        <div className="actions"><button onClick={clear}>Clear canvas</button><button onClick={download}>Export PNG</button></div>
        <div className="people"><h3>People ({users.length})</h3>{users.map(u=><div className="person" key={u.id}><span className="avatar" style={{background:u.color}}>{u.name[0]}</span><span>{u.name}{u.id===meRef.current.id?' (you)':''}</span></div>)}</div>
      </aside>
      <section className="board"><canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}/><div className="hint">Use your mouse or touch to draw · Open the same room in another tab to test collaboration</div></section>
    </main>
  </div>;
}
export default App;
