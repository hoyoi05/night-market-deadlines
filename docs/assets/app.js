import {DAY,at,kstDate,dateLabel,sessions,marketState,seasonState,countdown,selectMarkets} from './core.js';
const $ = s => document.querySelector(s);
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink = url => {try {const u=new URL(url);return u.protocol==='https:'?escape(u.href):'#';}catch{return '#';}};
const filters={region:'',kind:'',query:'',view:'active',sort:'next'};
let markets=[], data, lastStructure='';
const groups={end:{title:'행사 종료까지',note:'시즌이 시작된 행사입니다. 아래의 실제 운영일을 확인하세요.'},start:{title:'행사 시작까지',note:'첫 운영일이 다가오는 행사입니다.'},unconfirmed:{title:'일정 확인 필요',note:'세부 일정이 없거나 공식 확인 전입니다. 방문 가능한 일정으로 계산하지 않습니다.'},ended:{title:'종료된 일정',note:'이전 개최 기록입니다. 다음 개최를 의미하지 않습니다.'},cancelled:{title:'취소 공지',note:'주최 측의 최신 공지를 확인하세요.'}};

function periodText(m) {
  const s=m.schedule;
  if (!s || s.mode==='unknown') return m.scheduleText || '세부 일정 미확인';
  const dates=s.mode==='dates'?s.dates.map(dateLabel).join(' · '):s.start===s.end?dateLabel(s.start):`${dateLabel(s.start)} – ${dateLabel(s.end)}`;
  return `${s.start.slice(0,4)}. ${dates}`;
}
function nextText(m,now) {
  const state=marketState(m,now), s=m.schedule, next=state.next;
  if (state.id==='ended') return '확인된 운영 일정이 모두 종료되었습니다.';
  if (!next) return m.scheduleText || '세부 운영일·시간 미확인';
  const date = next.date===kstDate(now)?'오늘':dateLabel(next.date);
  if (!next.exact) return `${date} · 운영시간 미확인`;
  const o=s.overrides?.[next.date]||s;
  return `${date} ${o.open}–${o.close}${o.close<=o.open?' (다음 날 종료)':''}`;
}
function deadline(m,now) {
  const group=seasonState(m,now), list=sessions(m);
  if (group==='unconfirmed') return {label:'일정 확정 전',value:'확인 필요',date:'공식 안내를 확인하세요'};
  if (group==='cancelled') return {label:'취소 공지',value:'운영 취소',date:'공식 안내를 확인하세요'};
  if (group==='ended') return {label:'마지막 운영일',value:'행사 종료',date:dateLabel(list.at(-1).date)};
  const point=group==='start'?list[0]:list.at(-1);
  const target=group==='start'?point.start:point.exact?point.end:at(point.date);
  const clockLabel=point.exact?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(target)):'';
  return {label:group==='start'?'행사 시작까지':'시즌 종료까지',value:countdown(target,now,point.exact),date:`${dateLabel(kstDate(target))}${point.exact?' '+clockLabel:' · 날짜 기준'}`};
}
function card(m,now) {
  const state=marketState(m,now), d=deadline(m,now), group=seasonState(m,now);
  const source=m.sources[0], official=m.verification==='official';
  const status=state.id==='active'?state.label:state.id==='upcoming'&&group==='end'?'시즌 진행 중 · 지금은 운영시간 외':state.label;
  const nextLabel=state.id==='active'?'오늘 운영':state.id==='ended'?'운영 기록':'다음 운영';
  const map=`https://map.naver.com/p/search/${encodeURIComponent(m.mapQuery||m.location)}`;
  return `<article class="market-card" data-id="${escape(m.id)}"><div class="card-body"><div class="card-eyebrow"><span class="tag">${escape(m.kind)}</span><span>${escape(m.region)} · ${escape(m.district)}</span><span class="${official?'verified':'unverified'}">${official?'공식 출처':'공식 확인 전'}</span></div><h3>${escape(m.name)}</h3><p class="location">${escape(m.location)}</p><p class="period">${escape(periodText(m))}</p><p class="next-session"><b>${nextLabel}</b>${escape(nextText(m,now))}</p><p class="status ${state.id==='active'?'is-open':''} ${state.id==='unconfirmed'?'unknown':''}">${escape(status)}${m.schedule?.mode==='weekly'?' · '+escape(m.scheduleText):''}</p><details><summary>방문 정보·출처</summary><div class="details-body"><p>${escape(m.description)}</p><dl><div><dt>운영 안내</dt><dd>${escape(m.scheduleText||'공식 공지 참고')}</dd></div><div><dt>입장·이용</dt><dd>${escape(m.admission)}</dd></div><div><dt>예약</dt><dd>${escape(m.booking)}</dd></div></dl><p class="note">${escape(m.note)}</p><ul class="source-list">${m.sources.map(s=>`<li><a href="${safeLink(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a></li>`).join('')}</ul><p class="checked-line">자료 확인 ${escape(m.checkedAt)} · 공지 이후 변경 가능</p></div></details></div><div class="card-deadline"><span class="deadline-label">${d.label}</span><strong class="countdown">${d.value}</strong><span class="deadline-date">${escape(d.date)}</span><a class="action-link" href="${safeLink(source.url)}" target="_blank" rel="noopener noreferrer">${official?'공식 안내':'출처 보기'} ↗</a><a class="map-link" href="${safeLink(map)}" target="_blank" rel="noopener noreferrer">지도에서 찾기 ↗</a></div></article>`;
}

function render() {
  if(!data)return;
  const now=Date.now();
  const selected=selectMarkets(markets,filters,now);
  $('#stat-active').textContent=selectMarkets(markets,{view:'active'},now).length;
  $('#stat-today').textContent=selectMarkets(markets,{view:'today'},now).length;
  $('#stat-unconfirmed').textContent=selectMarkets(markets,{view:'unconfirmed'},now).length;
  $('#checked-date').textContent=data.checkedAt;
  $('#result-count').textContent=`${selected.length}곳`;
  $('#filter-summary').textContent=[filters.region||'서울·근교 전체',filters.kind].filter(Boolean).join(' · ');
  document.querySelectorAll('[data-region]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.region===filters.region));b.querySelector('span').textContent=selectMarkets(markets,{...filters,region:b.dataset.region},now).length;});
  document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===filters.kind)));
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===filters.view)));
  const groupEntries=Object.entries(groups).map(([key,g])=>({key,...g,items:selected.filter(m=>seasonState(m,now)===key)})).filter(g=>g.items.length);
  const structure=JSON.stringify([filters,groupEntries.map(g=>[g.key,g.items.map(m=>[m.id,marketState(m,now).id,marketState(m,now).next?.date])])]);
  if (lastStructure!==structure) {
    const opened=new Set([...document.querySelectorAll('article details[open]')].map(d=>d.closest('article').dataset.id));
    $('#group-nav').innerHTML=groupEntries.filter(g=>['start','end'].includes(g.key)).map(g=>`<a class="${g.key}" href="#group-${g.key}">${g.title} <span>${g.items.length}</span></a>`).join('');
    $('#results').innerHTML=groupEntries.length?groupEntries.map(g=>`<section class="group ${g.key}" id="group-${g.key}"><div class="group-heading"><h2>${g.title}<span>${g.items.length}곳</span></h2><p>${g.note}</p></div><div class="cards">${g.items.map(m=>card(m,now)).join('')}</div></section>`).join(''):`<div class="empty"><h3>${filters.view==='today'?'오늘 남아 있는 운영 일정이 없어요.':'조건에 맞는 일정이 없어요.'}</h3><p>${filters.view==='active'&&filters.region==='경기'?'현재 수집한 경기 행사는 종료 기록 또는 일정 확인 단계입니다.':'다른 지역이나 확인 필요·종료 목록도 살펴보세요.'}</p><button type="button" id="empty-reset">전체 진행·예정 보기</button></div>`;
    document.querySelectorAll('article').forEach(a=>{if(opened.has(a.dataset.id))a.querySelector('details').open=true;});
    $('#empty-reset')?.addEventListener('click',reset);
    lastStructure=structure;
  } else {
    document.querySelectorAll('.market-card').forEach(a=>{const m=markets.find(m=>m.id===a.dataset.id);a.querySelector('.countdown').textContent=deadline(m,now).value;});
  }
  const stale=Math.floor((at(kstDate(now))-at(data.checkedAt))/DAY);
  $('#data-notice').hidden=stale<14;
  $('#data-notice').textContent=`자료 확인 후 ${stale}일이 지났습니다. 최신 공지에서 운영·취소 여부를 다시 확인하세요.`;
  $('#results').setAttribute('aria-busy','false');
}
function reset(){Object.assign(filters,{region:'',kind:'',query:'',view:'active',sort:'next'});$('#search').value='';$('#sort').value='next';render();}
function clock(){ $('#korea-clock').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' KST';}
document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click',()=>{filters.region=b.dataset.region;render();}));
document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>{filters.kind=b.dataset.kind;render();}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{filters.view=b.dataset.view;render();}));
$('#search').addEventListener('input',e=>{filters.query=e.target.value;render();});
$('#sort').addEventListener('change',e=>{filters.sort=e.target.value;render();});
$('#reset').addEventListener('click',reset);
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.activeElement.isContentEditable){e.preventDefault();$('#search').focus();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){clock();render();}});
async function load(){try{const res=await fetch(new URL('../data/markets.json',import.meta.url),{cache:'no-cache'});if(!res.ok)throw new Error(`HTTP ${res.status}`);data=await res.json();if(data.schemaVersion!==1||!Array.isArray(data.markets))throw new Error('Invalid data');markets=data.markets;lastStructure='';render();}catch(error){$('#results').setAttribute('aria-busy','false');$('#results').innerHTML='<div class="empty"><h3>일정을 불러오지 못했어요.</h3><p>연결을 확인하고 다시 시도해 주세요.</p><button type="button" id="retry">다시 불러오기</button></div>';$('#retry').addEventListener('click',load);console.error('Schedule loading failed',error);}}
const mobile=matchMedia('(max-width:880px)');
const setFilterLayout=()=>{$('#filter-panel').open=!mobile.matches;};
setFilterLayout();mobile.addEventListener('change',setFilterLayout);
clock();load();setInterval(()=>{clock();render();},30000);
