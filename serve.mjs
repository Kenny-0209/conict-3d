import http from 'node:http';
import {bindingForDevice,reconcilePCBindings,recordsForSeats,hostKey,macKey} from './pc-bindings.mjs';
import {validateLayout} from './dist/layout.js';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
const project=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(project,'dist'),link=path.join(project,'..','연결'),port=5178;
const allowed=new Set([`http://localhost:${port}`,`http://127.0.0.1:${port}`,'https://lab501-3d-20261014.concontech.chatgpt.site']);
let snapshot={observedAt:null,devices:[],seats:{}},busy=false,assignments={},hosts={},bindingConflicts=[],history=new Map(),bindingWrites=Promise.resolve();
try{assignments=JSON.parse(await readFile(path.join(link,'assign.json'),'utf8'))}catch{}
try{hosts=JSON.parse(await readFile(path.join(link,'hosts.json'),'utf8'))}catch{}
function persistBindings(){const a=JSON.stringify(assignments,null,2),h=JSON.stringify(hosts,null,2);bindingWrites=bindingWrites.catch(()=>{}).then(async()=>{await writeFile(path.join(link,'hosts.json'),h,'utf8');await writeFile(path.join(link,'assign.json'),a,'utf8')});return bindingWrites}
function seatsFor(devices){return recordsForSeats(hosts,assignments,devices,bindingConflicts)}
async function observe(){
  if(busy)return;busy=true;
  const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(link,'observe.ps1')],{windowsHide:true}),chunks=[],errors=[];
  child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>errors.push(b));
  const timer=setTimeout(()=>child.kill(),15000);
  child.on('close',async code=>{
    clearTimeout(timer);
    try{
      if(code!==0)throw new Error('관찰기 실행 실패');
      const now=JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/,''));
      const resolved=reconcilePCBindings(hosts,assignments,now.devices);
      const changed=JSON.stringify(hosts)!==JSON.stringify(resolved.hosts)||JSON.stringify(assignments)!==JSON.stringify(resolved.assignments);
      hosts=resolved.hosts;assignments=resolved.assignments;bindingConflicts=resolved.conflicts;
      if(changed)await persistBindings();
      now.devices=now.devices.map(d=>{
        const identity=macKey(d.mac)||hostKey(d.hostname)||d.ip;
        const state=['online','no-response','unknown'].includes(d.pingState)?d.pingState:d.state;
        const h=history.get(identity)||{misses:0,lastResponseAt:null};
        if(state==='online'){h.misses=0;h.lastResponseAt=d.observedAt}else if(state==='no-response')h.misses++;
        history.set(identity,h);
        return {...d,state,pingState:state,lastResponseAt:h.lastResponseAt,consecutiveMisses:h.misses};
      });
      snapshot={...now,stateRule:'icmp-only',pollIntervalMs:20000,hosts,assignments,bindingChanges:resolved.changes,seats:seatsFor(now.devices)};
      await writeFile(path.join(link,'observed.json'),JSON.stringify(snapshot,null,2),'utf8');
    }catch(e){snapshot={...snapshot,error:e.message}}finally{busy=false}
  });
}
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8'};
async function saveExport(req,res,url){try{const name=url.searchParams.get('name')||'';if(!/^[a-z0-9-]+\.(png|glb)$/.test(name))throw new Error();let chunks=[],size=0;for await(const b of req){size+=b.length;if(size>80*1024*1024)throw new Error();chunks.push(b)}let dir=path.join(link,'..','시안',name.endsWith('.glb')?'모델':'렌더');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,name),Buffer.concat(chunks));res.setHeader('Content-Type',types['.json']);res.end(JSON.stringify({saved:name,size}))}catch{res.writeHead(400);res.end('저장할 수 없습니다.')}}
async function layoutApi(req,res){const dir=path.resolve(project,'..','편집'),file=path.join(dir,'layout.json');res.setHeader('Content-Type',types['.json']);res.setHeader('Cache-Control','no-store');try{if(req.method==='GET'){let layout=null;try{layout=validateLayout(JSON.parse(await readFile(file,'utf8')))}catch{}res.end(JSON.stringify({layout}));return}if(req.method!=='POST'){res.writeHead(405);res.end();return}let body='';for await(const b of req){body+=b;if(body.length>2*1024*1024)throw new Error('공간 JSON은 2MB 이하여야 합니다.')}const layout=validateLayout(JSON.parse(body));layout.updatedAt=new Date().toISOString();const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date()).replace(/[^0-9]/g,'');await mkdir(dir,{recursive:true});const text=JSON.stringify(layout,null,2);await writeFile(path.join(dir,'layout-'+stamp+'.json'),text);await writeFile(file,text);res.end(JSON.stringify({saved:true,file:'layout-'+stamp+'.json',updatedAt:layout.updatedAt}))}catch(e){res.writeHead(400);res.end(JSON.stringify({error:e.message}))}}
const server=http.createServer(async(req,res)=>{const origin=req.headers.origin;if(origin&&!allowed.has(origin)){res.writeHead(403);res.end('허용되지 않은 출처');return}if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}let url=new URL(req.url,`http://localhost:${port}`);if(url.pathname==='/api/layout'){await layoutApi(req,res);return}if(url.pathname==='/api/export'&&req.method==='POST'){await saveExport(req,res,url);return}if(url.pathname==='/api/status'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',types['.json']);res.end(JSON.stringify(snapshot));return}if(url.pathname==='/api/assign'&&req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>2000){res.writeHead(413);res.end();return}}try{let {seatId,ip}=JSON.parse(body);if(!/^s[1-8]$/.test(seatId)||ip&&!snapshot.devices.some(d=>d.ip===ip&&!d.name?.includes('공유기')))throw new Error();if(ip){const device=snapshot.devices.find(d=>d.ip===ip);assignments[seatId]=ip;hosts[seatId]=bindingForDevice(device,snapshot.devices)}else{delete assignments[seatId];delete hosts[seatId]}bindingConflicts=bindingConflicts.filter(id=>id!==seatId);await persistBindings();snapshot={...snapshot,hosts,assignments,seats:seatsFor(snapshot.devices)};res.setHeader('Content-Type',types['.json']);res.end(JSON.stringify({ok:true}))}catch{res.writeHead(400);res.end('확인된 PC만 연결할 수 있습니다.')}return}if(req.method!=='GET'){res.writeHead(405);res.end();return}try{let relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(dist,relative||'index.html');if(!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return}if((await stat(file)).isDirectory())file=path.join(file,'index.html');const data=await readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(data)}catch{res.writeHead(404);res.end('파일을 찾을 수 없습니다.')}});
server.listen(port,'127.0.0.1',()=>{console.log(`Local: http://127.0.0.1:${port}`);observe()});const interval=setInterval(observe,20000);
process.on('SIGINT',()=>{clearInterval(interval);server.close(()=>process.exit(0))});
