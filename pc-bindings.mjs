// IP addresses are a cache; the binding identifies a PC by its observed name and NICs.
export const hostKey=value=>String(value||'').replace(/^DESKTOP-/i,'').replace(/[^a-z0-9]/gi,'').toUpperCase();
export function macKey(value){const key=String(value||'').replace(/[^a-f0-9]/gi,'').toUpperCase();return /^[A-F0-9]{12}$/.test(key)&&key!=='000000000000'&&key!=='FFFFFFFFFFFF'?key:''}
export function bindingForDevice(device,devices=[device]){
  const name=device.hostname||null,macs=new Set();
  for(const d of devices)if(d===device||(device.identitySource==='self'&&d.identitySource==='self'&&name&&hostKey(d.hostname)===hostKey(name))){const key=macKey(d.mac);if(key)macs.add(key)}
  return {hostname:name,macs:[...macs],ip:device.ip};
}
export function identityScore(binding,device){
  if(!binding||!device)return 0;
  const expected=(binding.macs||[binding.mac]).map(macKey).filter(Boolean),actual=macKey(device.mac);
  if(expected.length)return actual&&expected.includes(actual)?2:0;
  if(binding.hostname&&hostKey(binding.hostname)===hostKey(device.hostname)&&['self','netbios'].includes(device.identitySource))return 1;
  return 0;
}
export function reconcilePCBindings(hosts,assignments,devices){
  const nextHosts=structuredClone(hosts),nextAssignments={...assignments},changes=[],conflicts=[];
  for(const [seat,binding] of Object.entries(nextHosts)){
    if(!/^s[1-8]$/.test(seat))continue;
    const candidates=devices.filter(d=>(d.state==='online'||d.identityResponded===true)&&identityScore(binding,d)>0);
    const expected=(binding.macs||[binding.mac]).map(macKey).filter(Boolean);
    if(!expected.length&&new Set(candidates.map(d=>macKey(d.mac)).filter(Boolean)).size>1){conflicts.push(seat);continue}
    candidates.sort((a,b)=>identityScore(binding,b)-identityScore(binding,a)||Number(b.ip===nextAssignments[seat])-Number(a.ip===nextAssignments[seat]));
    const device=candidates[0];if(!device)continue;
    if(nextAssignments[seat]!==device.ip)changes.push({seatId:seat,from:nextAssignments[seat]||null,to:device.ip,hostname:binding.hostname});
    nextAssignments[seat]=device.ip;binding.ip=device.ip;
    if(!expected.length){binding.macs=bindingForDevice(device,devices).macs}
  }
  return {hosts:nextHosts,assignments:nextAssignments,changes,conflicts};
}
export function recordsForSeats(hosts,assignments,devices,conflicts=[]){
  return Object.fromEntries(Array.from({length:8},(_,i)=>{
    const id='s'+(i+1),binding=hosts[id],ip=assignments[id],device=devices.find(d=>d.ip===ip);
    let state=device?.state||'unknown',evidence=device?.evidence||'PC 주소를 다시 찾는 중';
    if(!ip){state='unknown';evidence='자리 PC 미지정'}
    else if(conflicts.includes(id)){state='unknown';evidence='같은 이름의 기기가 여러 대여서 연결 보류'}
    else if(!binding){state='unknown';evidence='PC 식별 정보가 필요합니다'}
    else if(state==='online'&&!identityScore(binding,device)){state='unknown';evidence='기존 IP의 기기 정보가 다르거나 식별되지 않습니다'}
    else if(device&&macKey(device.mac)&&(binding.macs||[]).length&&!binding.macs.map(macKey).includes(macKey(device.mac))){state='unknown';evidence='기존 IP를 다른 기기가 사용 중입니다'}
    return [id,{state,evidence,lastResponseAt:device?.lastResponseAt||null,hostname:binding?.hostname||null,ip:ip||null}];
  }));
}
