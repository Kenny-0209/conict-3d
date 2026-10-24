import assert from 'node:assert/strict';
import {purposes,timeSlots,researchAreas,todayKST,stepsFor,progressFor,setAnswer,toggleResearch,validateField,mailPayload,sendLetter} from './dist/letter-core.js';

const today=todayKST(),base={name:'기능 테스트',studentId:'',grade:'3학년',email:'conict526@gmail.com',consent:true};
assert.equal(todayKST(new Date('2026-10-24T15:01:00Z')),'2026-10-25','dates use Korea time');
const samples={counsel:{...base,purpose:'counsel',topic:'자동 발송 기능 검증용 상담 예시입니다.',date:today,time:timeSlots[0]},question:{...base,purpose:'question',question:'자동 발송 기능 검증용 문의 예시입니다.'},join:{...base,purpose:'join',motivation:'자동 발송 기능 검증용 참여 예시입니다.',research:['로봇 학습','직접 적을게요'],researchOther:'사람과 협업하는 건설 로봇'}};
for(const [purpose,a] of Object.entries(samples)){
 const progress=stepsFor(a).map(progressFor);assert(progress.every((value,index)=>!index||value>progress[index-1]),'selecting a branch never moves progress backwards');
 assert(stepsFor(a).includes(purpose==='counsel'?'schedule':purpose==='join'?'research':'question'));
 for(const key of stepsFor(a))assert.equal(validateField(key,a),'',key);
 const payload=mailPayload(a);assert(payload.message.includes(a.name));assert.equal(payload.email,a.email);assert.equal(payload.유형,purposes[purpose].short);assert(!payload._subject.includes(a.name),'personal details stay out of the mail subject');
 const contaminated={...a,...Object.fromEntries(['topic','date','time','question','motivation','researchOther'].filter(key=>!Object.hasOwn(a,key)).map(key=>[key,'EXCLUDED BRANCH SECRET']))};
 assert(!mailPayload(contaminated).message.includes('EXCLUDED BRANCH SECRET'),'inactive branches are never sent');
}
const changed={...samples.join};setAnswer(changed,'purpose','question');for(const key of ['motivation','research','researchOther'])assert(!Object.hasOwn(changed,key));assert.equal(changed.consent,false);
assert(validateField('email',{email:'invalid'}));assert(validateField('name',{name:'\n'}));assert(validateField('question',{question:'x'.repeat(3001)}));assert(validateField('grade',{grade:'unknown'}));
assert(validateField('schedule',{date:'2000-01-01',time:timeSlots[0]}));assert(validateField('schedule',{date:'2099-02-30',time:timeSlots[0]}));assert(validateField('schedule',{date:today}));assert.equal(validateField('schedule',{time:timeSlots[2]}),'');
assert.deepEqual(toggleResearch(['로봇 학습'],researchAreas.at(-1)),[researchAreas.at(-1)]);assert.deepEqual(toggleResearch([researchAreas.at(-1)],'로봇 학습'),['로봇 학습']);assert(validateField('research',{research:['직접 적을게요'],researchOther:''}));
const config={endpoint:'https://formspree.io/f/testletters',recipient:base.email};let calls=0;
const accepted=await sendLetter(samples.question,config,async(url,options)=>{calls++;assert.equal(url,config.endpoint);assert.equal(options.method,'POST');assert.equal(options.headers.Accept,'application/json');assert.equal(options.credentials,'omit');const body=JSON.parse(options.body);assert.equal(body.email,base.email);assert(!Object.hasOwn(body,'recipient'),'the recipient is configured at the provider');return {ok:true,status:200,json:async()=>({ok:true})}});assert(accepted.ok);assert.equal(calls,1);
assert.equal((await sendLetter(samples.question,{endpoint:''},()=>{throw Error('must not fetch')})).kind,'setup');
assert.equal((await sendLetter({...samples.question,consent:false},config,()=>{throw Error('must not fetch')})).kind,'validation');
assert.equal((await sendLetter({...samples.question,website:'bot'},config,()=>{throw Error('must not fetch')})).kind,'validation');
for(const status of [400,403,422,429,500]){const result=await sendLetter(samples.question,config,async()=>({ok:false,status,json:async()=>({error:'provider error'})}));assert(!result.ok);assert.equal(result.kind,status===429?'limit':'service')}
assert(!(await sendLetter(samples.question,config,async()=>({ok:true,status:200,json:async()=>{throw Error('non JSON')}}))).ok,'an ambiguous success response must not show completion');
assert.equal((await sendLetter(samples.question,config,async()=>{throw Error('network')})).kind,'uncertain');
assert.equal((await sendLetter(samples.question,config,async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout')))),{timeoutMs:5})).kind,'uncertain');
console.log(JSON.stringify({pass:true,branches:3,mailDelivery:'mock only; no real mail sent',checks:['branch-specific questions and payloads','KST dates and invalid dates','required fields and consent','branch changes clear stale answers','reply email and fixed server recipient','honeypot and unconfigured endpoint','success / HTTP failures / invalid JSON / network / timeout']},null,2));
