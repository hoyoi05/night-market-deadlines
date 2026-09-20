export const DAY = 86400000;
export const kstDate = (now = Date.now()) => new Date(Number(now) + 9 * 3600000).toISOString().slice(0, 10);
export const at = (date, time = '00:00') => Date.parse(`${date}T${time}:00+09:00`);
export const dateLabel = date => date ? new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short'}).format(new Date(at(date))) : '미정';
export const shiftDate = (date, days) => new Date(at(date) + days * DAY + 9 * 3600000).toISOString().slice(0,10);

// Only the explicitly published dates/weekday rules create operating sessions.
export function sessions(market) {
  const s = market.schedule;
  if (!s || !s.start || !s.end || s.mode === 'unknown') return [];
  const dates = [];
  if (s.mode === 'dates') dates.push(...s.dates);
  else for (let date = s.start; date <= s.end; date = shiftDate(date,1)) {
    if (s.mode === 'daily' || (s.mode === 'weekly' && s.weekdays.includes(new Date(at(date)+9*3600000).getUTCDay()))) dates.push(date);
  }
  return [...new Set(dates)].filter(d => !(s.excludedDates || []).includes(d)).sort().map(date => {
    const override = (s.overrides || {})[date] || {};
    const open = override.open || s.open;
    const close = override.close || s.close;
    let end = close ? at(date,close) : at(shiftDate(date,1));
    const start = at(date,open || '00:00');
    if (open && close && end <= start) end += DAY;
    return {date,start,end,exact: Boolean(open && close)};
  });
}

export function marketState(market, now = Date.now()) {
  if (market.cancelled) return {id:'cancelled',label:'취소 공지',next:null};
  const list = sessions(market);
  if (!list.length || market.verification !== 'official') return {id:'unconfirmed',label:'일정 확인 필요',next:null};
  const current = list.find(s => s.start <= now && now < s.end);
  if (current) return {id:'active',label:current.exact ? '운영시간에 해당' : '오늘 행사 · 시간 미확인',next:current};
  const next = list.find(s => s.start > now);
  if (next) return {id:'upcoming',label:'다음 운영 예정',next};
  return {id:'ended',label:'종료된 일정',next:null};
}

export function seasonState(market, now = Date.now()) {
  const state = marketState(market,now);
  if (['unconfirmed','cancelled','ended'].includes(state.id)) return state.id;
  return now < sessions(market)[0].start ? 'start' : 'end';
}

export function countdown(target, now = Date.now(), exact = true) {
  if (!exact) {const days=Math.round((at(kstDate(target))-at(kstDate(now)))/DAY);return days<=0?'오늘':`D-${days}`;}
  const seconds = Math.max(0,Math.floor((target - now)/1000));
  const d=Math.floor(seconds/86400), h=Math.floor(seconds%86400/3600), m=Math.floor(seconds%3600/60);
  return d ? `${d}일 ${h}시간` : `${h}시간 ${String(m).padStart(2,'0')}분`;
}

export function selectMarkets(markets, filters, now = Date.now()) {
  const query = (filters.query || '').trim().toLocaleLowerCase('ko');
  return markets.filter(m => {
    const group=seasonState(m,now);
    if (filters.region && m.region !== filters.region) return false;
    if (filters.kind && m.kind !== filters.kind) return false;
    if (query && ![m.name,m.region,m.district,m.location,m.description,...m.tags].join(' ').toLocaleLowerCase('ko').includes(query)) return false;
    if (filters.view === 'active' && !['start','end'].includes(group)) return false;
    if (filters.view === 'today' && (m.cancelled || m.verification !== 'official' || !sessions(m).some(s=>s.start<at(shiftDate(kstDate(now),1)) && s.end>now))) return false;
    if (filters.view === 'ended' && group !== 'ended') return false;
    if (filters.view === 'unconfirmed' && !['unconfirmed','cancelled'].includes(group)) return false;
    return true;
  }).sort((a,b) => {
    if (filters.sort==='name') return a.name.localeCompare(b.name,'ko');
    if (filters.view==='ended') return (sessions(b).at(-1)?.end||0)-(sessions(a).at(-1)?.end||0);
    return (marketState(a,now).next?.start||Infinity)-(marketState(b,now).next?.start||Infinity) || a.name.localeCompare(b.name,'ko');
  });
}
