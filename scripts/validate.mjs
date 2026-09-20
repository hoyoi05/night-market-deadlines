import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DAY,at,kstDate,sessions} from '../docs/assets/core.js';
const data=JSON.parse(fs.readFileSync(new URL('../docs/data/markets.json',import.meta.url),'utf8'));
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(at(value))&&kstDate(at(value))===value;
const validTime=value=>value===null || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
assert.equal(data.schemaVersion,1);assert.equal(data.timezone,'Asia/Seoul');assert(validDate(data.checkedAt));assert(data.markets.length>0);
const ids=new Set();
const officialHosts=new Set(['hangang.seoul.go.kr','junggu.newstool.co.kr','itour.incheon.go.kr','www.culturenight.co.kr','www.gg.go.kr','culture.seoul.go.kr','global.seoul.go.kr','www.goyang.go.kr']);
for(const m of data.markets){
  assert(/^[a-z0-9-]+$/.test(m.id)&&!ids.has(m.id),`Invalid/duplicate ID: ${m.id}`);ids.add(m.id);
  for(const key of ['name','region','district','kind','location','description','scheduleText','admission','booking','note'])assert(typeof m[key]==='string'&&m[key].trim(),`${m.id}: missing ${key}`);
  assert(['서울','경기','인천'].includes(m.region));assert(['야시장','야장','축제 연계'].includes(m.kind));
  assert(['official','secondary'].includes(m.verification));assert(validDate(m.checkedAt)&&m.checkedAt<=data.checkedAt);assert(Array.isArray(m.tags));
  assert(m.sources.length>0);for(const source of m.sources){assert(source.title);const u=new URL(source.url);assert.equal(u.protocol,'https:');if(m.verification==='official')assert(officialHosts.has(u.hostname),`Check official publisher: ${u.hostname}`);}
  const s=m.schedule;assert(['unknown','daily','dates','weekly'].includes(s.mode));
  if(s.mode==='unknown'){assert(!s.start&&!s.end,`${m.id}: unknown schedule must not have countdown dates`);continue;}
  assert(validDate(s.start)&&validDate(s.end)&&s.start<=s.end);assert(at(s.end)-at(s.start)<=366*DAY);
  assert(validTime(s.open)&&validTime(s.close));assert.equal(Boolean(s.open),Boolean(s.close),`${m.id}: both hours or neither required`);
  if(s.mode==='dates'){assert(Array.isArray(s.dates)&&s.dates.length);assert.equal(s.dates.length,new Set(s.dates).size);assert(s.dates.every(d=>validDate(d)&&d>=s.start&&d<=s.end));assert.equal([...s.dates].sort()[0],s.start);assert.equal([...s.dates].sort().at(-1),s.end);}
  if(s.mode==='weekly')assert(s.weekdays.length&&s.weekdays.every(x=>Number.isInteger(x)&&x>=0&&x<=6));
  for(const d of s.excludedDates||[])assert(validDate(d)&&d>=s.start&&d<=s.end);
  for(const [d,o] of Object.entries(s.overrides||{})){assert(validDate(d)&&d>=s.start&&d<=s.end);assert(o.open&&o.close&&validTime(o.open)&&validTime(o.close));}
  assert(sessions(m).length>0);for(const session of sessions(m))assert(session.end>session.start&&session.end-session.start<=DAY);
}
const html=fs.readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
for(const [,relative] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[^\"]*)"/g))assert(fs.existsSync(new URL('../docs/'+relative.slice(2),import.meta.url)),`Missing asset: ${relative}`);
console.log(`Validated ${data.markets.length} markets, KST schedules, source URLs and local assets.`);
