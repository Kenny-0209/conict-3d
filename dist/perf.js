// Explicit ?perf diagnostics; no output or work in normal visits.
export function createProfiler(renderer,label,getMode){
 if(!new URLSearchParams(location.search).has('perf'))return {begin:()=>0,end:()=>{}};
 let since=performance.now(),count=0,ms=0,renders=0,lastMode='',samples=0;
 return {begin:()=>performance.now(),end:(start,rendered)=>{
  const mode=getMode(),now=performance.now();
  if(mode!==lastMode){lastMode=mode;since=now;count=ms=renders=samples=0;return}
  if(samples>=3)return;
  count++;ms+=now-start;renders+=rendered?1:0;
  if(now-since>=3000){const rigs=performance.getEntriesByType('resource').filter(e=>/\.glb(?:\.gz)?(?:\?|$)/.test(e.name));console.info('[LAB_PERF] '+JSON.stringify({label,mode,seconds:+((now-since)/1000).toFixed(2),steps:count,renders,cpuMs:+ms.toFixed(2),avgStepMs:+(ms/count).toFixed(3),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,rigEncodedBytes:rigs.reduce((sum,e)=>sum+e.encodedBodySize,0),packedRigs:rigs.filter(e=>/\.glb\.gz(?:\?|$)/.test(e.name)).length}));since=now;count=ms=renders=0;samples++}
 }};
}
