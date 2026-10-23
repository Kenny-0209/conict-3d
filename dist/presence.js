// PC presence is network reachability, never a claim about power or a person's attendance.
export const MAX_AGE = 65000;
export const labels = {online:'핑 응답', 'no-response':'핑 미응답', unknown:'확인 불가'};
export function normalizePresence(snapshot, seatIds, now=Date.now()) {
  const age=now-Date.parse(snapshot?.observedAt);
  const valid=Number.isFinite(age)&&age>=-5000&&age<=MAX_AGE&&!snapshot?.error&&snapshot?.seats&&typeof snapshot.seats==='object';
  return Object.fromEntries(seatIds.map(id=>{
    const record=valid?snapshot.seats[id]:null, state=typeof record==='string'?record:record?.state;
    return [id,['online','no-response'].includes(state)?state:'unknown'];
  }));
}
export function createPresenceClient({seatIds,onChange,fetcher=fetch,clock=Date.now,interval=20000}) {
  let endpoint='',snapshot=null,error='',timer,expiry,controller,busy=false,version=0,closed=false;
  function emit(){onChange({endpoint,snapshot,error,states:normalizePresence(snapshot,seatIds,clock())})}
  async function refresh(){
    if(!endpoint||busy||closed)return;
    busy=true;const turn=version;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
    try{const response=await fetcher(endpoint,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('관찰기 응답 오류 ('+response.status+')');const next=await response.json();if(turn!==version||closed)return;const age=clock()-Date.parse(next?.observedAt);if(!next?.seats||!Number.isFinite(age)||age< -5000||age>MAX_AGE||next.error)throw new Error(next?.error||'관찰기 데이터가 오래되었거나 형식이 올바르지 않습니다.');snapshot=next;error='';}
    catch(e){if(turn!==version||closed)return;snapshot=null;error=e.name==='AbortError'?'관찰기 응답 시간을 초과했습니다.':e.message;}
    finally{clearTimeout(timeout);busy=false;if(turn===version&&!closed)emit()}
  }
  function connect(value){const url=new URL(value,location.href);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('http 또는 https 관찰기 주소를 입력하세요.');version++;controller?.abort();endpoint=url.href;snapshot=null;error='';clearInterval(timer);clearInterval(expiry);emit();timer=setInterval(refresh,interval);expiry=setInterval(()=>{if(snapshot&&clock()-Date.parse(snapshot.observedAt)>MAX_AGE){snapshot=null;error='관찰기 갱신이 중단되었습니다.';emit()}},1000);if(busy)setTimeout(refresh,0);else void refresh();}
  function disconnect(){version++;controller?.abort();clearInterval(timer);clearInterval(expiry);endpoint='';snapshot=null;error='';emit()}
  return {connect,refresh,disconnect,close(){disconnect();closed=true}};
}
