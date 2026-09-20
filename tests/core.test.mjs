import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {at,kstDate,sessions,marketState,seasonState,countdown,selectMarkets} from '../docs/assets/core.js';
const markets=JSON.parse(fs.readFileSync(new URL('../docs/data/markets.json',import.meta.url),'utf8')).markets;
const weekly=markets.find(m=>m.id==='jamsugyo-2026-autumn');
const single=markets.find(m=>m.id==='sindang-2026');
const unknown=markets.find(m=>m.id==='rooftop-2026');
const now=at('2026-09-21','09:00');

test('KST date rollover does not depend on the machine timezone',()=>{
  assert.equal(kstDate(Date.parse('2026-09-20T14:59:59Z')),'2026-09-20');
  assert.equal(kstDate(Date.parse('2026-09-20T15:00:00Z')),'2026-09-21');
});
test('Weekly operation gives the next Sunday, not every day in the season',()=>{
  assert.equal(sessions(weekly).length,8);
  assert.equal(marketState(weekly,now).id,'upcoming');
  assert.equal(marketState(weekly,now).next.date,'2026-09-27');
  assert.equal(seasonState(weekly,now),'end');
  assert.equal(selectMarkets([weekly],{view:'today'},now).length,0);
});
test('Opening and closing boundaries are inclusive/exclusive',()=>{
  assert.equal(marketState(single,at('2026-10-23','14:59')).id,'upcoming');
  assert.equal(marketState(single,at('2026-10-23','15:00')).id,'active');
  assert.equal(marketState(single,at('2026-10-23','21:00')).id,'ended');
  assert.equal(seasonState(single,at('2026-10-23','15:00')),'end');
});
test('An event in a continuing season moves to next session at closing',()=>{
  const state=marketState(weekly,at('2026-09-27','22:00'));
  assert.equal(state.id,'upcoming');assert.equal(state.next.date,'2026-10-04');
  assert.equal(marketState(weekly,at('2026-10-25','22:00')).id,'ended');
});
test('Separate published dates do not imply continuous operation',()=>{
  const m=markets.find(m=>m.id==='suwon-bulchwi-2026');
  assert.equal(sessions(m).length,2);assert.equal(marketState(m,at('2026-09-06')).next.date,'2026-09-19');
  assert.equal(selectMarkets([m],{view:'today'},at('2026-09-12')).length,0);
});
test('Missing times remain date-only without midnight being advertised as opening',()=>{
  const m=markets.find(m=>m.id==='kintex-2026');
  assert.equal(marketState(m,at('2026-09-04','09:00')).label,'오늘 행사 · 시간 미확인');
  assert.equal(marketState(m,at('2026-09-05','23:59')).id,'active');
  assert.equal(marketState(m,at('2026-09-06')).id,'ended');
  assert.equal(countdown(at('2026-09-04'),at('2026-09-03','23:59'),false),'D-1');
});
test('Unknown and secondary-only schedules never count as visitable',()=>{
  assert.equal(marketState(unknown,now).id,'unconfirmed');
  const m={...single,verification:'secondary'};
  assert.equal(selectMarkets([m,unknown],{view:'active'},now).length,0);
  assert.equal(selectMarkets([m],{view:'today'},at('2026-10-23','17:00')).length,0);
});
test('Cancellation excludes a market from active and today lists',()=>{
  const m={...single,cancelled:true};
  assert.equal(selectMarkets([m],{view:'active'},now).length,0);
  assert.equal(selectMarkets([m],{view:'today'},at('2026-10-23','17:00')).length,0);
  assert.equal(marketState(m,now).id,'cancelled');
});
test('Rain exceptions and date-specific hours affect the next session',()=>{
  const m={...weekly,schedule:{...weekly.schedule,excludedDates:['2026-09-27'],overrides:{'2026-10-04':{open:'17:00',close:'20:00'}}}};
  assert.equal(marketState(m,now).next.date,'2026-10-04');
  assert.equal(marketState(m,now).next.start,at('2026-10-04','17:00'));
});
test('Overnight markets remain active and discoverable after midnight',()=>{
  const m={...single,schedule:{...single.schedule,open:'19:00',close:'01:00'}};
  const midnight=at('2026-10-24','00:30');
  assert.equal(marketState(m,midnight).id,'active');
  assert.equal(selectMarkets([m],{view:'today'},midnight).length,1);
  assert.equal(marketState(m,at('2026-10-24','01:00')).id,'ended');
});
test('Initial catalog has 5 active, 5 ended, 3 needing confirmation',()=>{
  assert.equal(selectMarkets(markets,{view:'active'},now).length,5);
  assert.equal(selectMarkets(markets,{view:'ended'},now).length,5);
  assert.equal(selectMarkets(markets,{view:'unconfirmed'},now).length,3);
});
test('Region, type and search filters combine without duplicates',()=>{
  assert.equal(selectMarkets(markets,{view:'active',region:'서울',kind:'야시장'},now)[0].id,'chungmuro-2026');
  assert.equal(selectMarkets(markets,{view:'ended',region:'경기',query:'수원'},now)[0].id,'suwon-bulchwi-2026');
  assert.equal(selectMarkets(markets,{view:'active',query:'없는시장xyz'},now).length,0);
  assert.equal(new Set(selectMarkets(markets,{},now).map(m=>m.id)).size,13);
});
