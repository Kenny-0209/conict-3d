import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {members} from './dist/data.js';
import {records,pageLinks,tourStops} from './dist/content.js';
import {defaultLayout,upgradeLayout,clone} from './dist/layout.js';
import {interactionType,introduction,researchIntroduction,memberProfiles,roomLabels} from './dist/interactions.js';

for(const member of members){
 assert(pageLinks[member.id]&&new URL(pageLinks[member.id]).protocol==='https:');
 if(memberProfiles[member.id].bio)assert.equal(introduction(member),memberProfiles[member.id].bio);else assert(introduction(member).endsWith(member.name+'입니다.'));
 assert(!introduction(member).includes('연구 분야'));
 assert(researchIntroduction(member).includes(memberProfiles[member.id].research));
}
assert.equal(pageLinks.m3,'https://github.com/baebling');
assert.equal(pageLinks.m4,'https://github.com/Minseung1129');
assert.equal(pageLinks.m5,'https://github.com/wesamhashim24');
assert.equal(pageLinks.m6,'https://github.com/abrorbek-ai');
const layout=defaultLayout(),raw=clone(layout);
raw.rooms[0].name='연구원 공간';raw.rooms[1].name='교수실 · 미팅 공간';
const migrated=upgradeLayout(raw);
assert.deepEqual(migrated.objects,raw.objects,'member positions and furniture must be preserved');
assert.deepEqual(migrated.openings,raw.openings,'door geometry must be preserved');
for(const room of migrated.rooms)assert.equal(room.name,roomLabels[room.id]);
for(const kind of ['sofa-3','meeting','coffee-cabinet','coffee-tools','printer','plant','fridge','shelf'])assert.equal(interactionType({kind}),null,kind);
assert.equal(interactionType({kind:'seat'}),'computer');
assert.equal(interactionType({kind:'seat'},'person'),'person');
assert.equal(interactionType({kind:'bookshelf'}),'achievements');
for(const o of layout.objects.filter(o=>['media-tv','tv'].includes(o.kind)))assert.equal(interactionType(o),'media');
for(const stop of tourStops)if(stop.object&&!['welcome'].includes(stop.type))assert(layout.objects.some(o=>o.id===stop.object),stop.id);

assert(records.length>9,'use the complete galleries, not the old nine placeholders');
assert.equal(new Set(records.map(r=>r.id)).size,records.length);
let photos=0;
for(const record of records){
 assert(record.photos.length,record.id+' must have real photographs');
 assert(record.url.startsWith('https://conict.seoultech.ac.kr/subList/'));
 assert.equal(record.photoUrl,record.photos[0].src);
 const hashes=[];
 for(const photo of record.photos){
  assert(/^\.\/assets\/album\/[0-9a-f]{16}\.webp$/.test(photo.src));
  const file=new URL('./dist/'+photo.src.slice(2),import.meta.url),data=await readFile(file);
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
  assert((await stat(file)).size>1000);
  assert(photo.width>0&&photo.height>0&&photo.width<=1600&&photo.height<=1600);
  hashes.push(createHash('sha256').update(data).digest('hex'));photos++;
 }
 assert.equal(new Set(hashes).size,hashes.length,record.id+' repeats a photo');
}
const achievements=records.filter(r=>r.achievement),albums=records.filter(r=>!r.achievement);
assert(achievements.some(r=>r.title.includes('수상')));
assert(achievements.some(r=>r.title.includes('성과')));
assert.equal(achievements.length+albums.length,records.length);
for(const category of ['conference','workshop','highlights'])assert(albums.some(r=>r.album===category));
const source=await readFile(new URL('./dist/visit.js',import.meta.url),'utf8');
assert(source.includes('if(!interactionType(item.o))continue;'));
assert(source.includes("if(!o)continue;const item="),'lounge simulation still needs every furniture item');
console.log(JSON.stringify({pass:true,members:members.length,filledGitHub:4,records:records.length,photos,achievements:achievements.length,roomLabels,duplicatePhotos:0},null,2));
