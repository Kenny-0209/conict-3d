export const LAB_LOCATION={latitude:37.63,longitude:127.08,timeZone:'Asia/Seoul',label:'서울 공릉동'};
export const MAX_WEATHER_AGE=90*60*1000;
export const WEATHER_INTERVAL=10*60*1000;
export const WEATHER_URL='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:LAB_LOCATION.latitude,longitude:LAB_LOCATION.longitude,current:'temperature_2m,is_day,precipitation,rain,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',daily:'sunrise,sunset',timezone:LAB_LOCATION.timeZone,timeformat:'unixtime',forecast_days:2,wind_speed_unit:'ms'});
const valid=v=>typeof v==='number'&&Number.isFinite(v),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const snow=new Set([71,73,75,77,85,86]),rain=new Set([51,53,55,56,57,61,63,65,66,67,80,81,82]),storm=new Set([95,96,99]);
export function weatherKind(code,rainfall=0,snowfall=0){
 if(snow.has(code)||snowfall>0)return {kind:'snow',label:'눈',icon:'❄'};
 if(storm.has(code))return {kind:'storm',label:'뇌우',icon:'☂'};
 if(rain.has(code)||rainfall>0)return {kind:'rain',label:'비',icon:'☂'};
 if(code===45||code===48)return {kind:'fog',label:'안개',icon:'≋'};
 if(code===3)return {kind:'cloudy',label:'흐림',icon:'☁'};
 if(code===2)return {kind:'cloudy',label:'구름 조금',icon:'☁'};
 if(code===0||code===1)return {kind:'clear',label:code===0?'맑음':'대체로 맑음',icon:'☀'};
 return {kind:'unknown',label:'날씨 확인 불가',icon:'◌'};
}
export function normalizeWeather(raw,now=Date.now()){
 const c=raw?.current,timestamp=c?.time*1000;
 if(raw?.error||raw?.timezone!==LAB_LOCATION.timeZone||!valid(c?.time)||now-timestamp>MAX_WEATHER_AGE||timestamp-now>10*60*1000||!valid(c.temperature_2m)||!valid(c.weather_code))throw new Error('최신 날씨를 확인할 수 없습니다.');
 if(c.temperature_2m< -80||c.temperature_2m>65)throw new Error('날씨 값이 올바르지 않습니다.');
 const rainValue=valid(c.rain)?Math.max(0,c.rain):0,snowValue=valid(c.snowfall)?Math.max(0,c.snowfall):0;
 const days=(raw.daily?.time||[]).map((time,i)=>({time:time*1000,sunrise:raw.daily.sunrise?.[i]*1000,sunset:raw.daily.sunset?.[i]*1000})).filter(d=>[d.time,d.sunrise,d.sunset].every(valid)&&d.sunset>d.sunrise);
 return {timestamp,temperature:c.temperature_2m,code:c.weather_code,cloud:clamp(valid(c.cloud_cover)?c.cloud_cover:0,0,100),wind:clamp(valid(c.wind_speed_10m)?c.wind_speed_10m:0,0,35),windDirection:valid(c.wind_direction_10m)?c.wind_direction_10m:0,precipitation:valid(c.precipitation)?Math.max(0,c.precipitation):rainValue,rain:rainValue,snowfall:snowValue,days,...weatherKind(c.weather_code,rainValue,snowValue)};
}
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:LAB_LOCATION.timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
export function seoulDay(date){return dayFormatter.format(date)}
export function seoulMinutes(date){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:LAB_LOCATION.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);return Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value)}
export function daylightAt(date,weather){
 const now=+date,day=weather?.days.find(d=>seoulDay(new Date(d.time))===seoulDay(date));
 const midnight=now-seoulMinutes(date)*60000-date.getUTCSeconds()*1000-date.getUTCMilliseconds();
 const sunrise=day?.sunrise??midnight+6*3600000,sunset=day?.sunset??midnight+18*3600000;
 const smooth=(a,b)=>{const u=clamp((now-a)/(b-a),0,1);return u*u*(3-2*u)};
 const level=smooth(sunrise-1800000,sunrise+1800000)*(1-smooth(sunset-1800000,sunset+1800000));
 const phase=level<.05?'night':now<sunrise+1800000?'dawn':now>sunset-1800000?'dusk':'day';
 return {level,phase,progress:clamp((now-sunrise)/(sunset-sunrise),0,1),sunrise,sunset,astronomical:!!day};
}
export function createWeatherClient({onChange,fetcher=fetch,storage,clock=Date.now,interval=WEATHER_INTERVAL}={}){
 if(storage===undefined)try{storage=globalThis.localStorage}catch{storage=null}
 let closed=false,pending=false,controller,timer,lastRaw;
 const key='conict-weather-v1';
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved){const data=normalizeWeather(saved,clock());lastRaw=saved;onChange({status:'cached',data})}}catch{}
 async function refresh(){
  if(closed||pending)return;pending=true;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetcher(WEATHER_URL,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('날씨 연결 실패');const raw=await response.json(),data=normalizeWeather(raw,clock());if(closed)return;lastRaw=raw;try{storage?.setItem(key,JSON.stringify(raw))}catch{}onChange({status:'live',data})}
  catch{if(closed)return;let data=null;try{data=normalizeWeather(lastRaw,clock())}catch{}onChange({status:data?'cached':'unavailable',data})}
  finally{clearTimeout(timeout);pending=false}
 }
 refresh();timer=setInterval(()=>{if(!globalThis.document?.hidden)refresh()},interval);
 return {refresh,close(){closed=true;clearInterval(timer);controller?.abort()}};
}
