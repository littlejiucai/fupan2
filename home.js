'use strict';
const menu=document.querySelector('#menu-button'),nav=document.querySelector('#main-nav');
function closeMenu(){if(!menu||!nav)return;menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus()}});
const initial=document.querySelector('#initial-content');
if(initial){
let content=JSON.parse(initial.textContent),category='全部',busy=false;
const $=s=>document.querySelector(s),dotDate=s=>s.replaceAll('-','.');
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function safeHref(h){return typeof h==='string'&&/^\.\/[a-z0-9-]+\.html$/.test(h)}
function valid(data){return data?.schemaVersion===1&&typeof data.version==='string'&&Array.isArray(data.reviews)&&data.reviews.length>0&&Array.isArray(data.articles)&&data.articles.length>0&&data.reviews.every(r=>datePattern.test(r.date)&&typeof r.title==='string'&&typeof r.summary==='string'&&safeHref(r.href)&&Array.isArray(r.tags)&&r.tags.every(t=>typeof t==='string'))&&data.articles.every(a=>typeof a.title==='string'&&typeof a.category==='string'&&typeof a.summary==='string'&&typeof a.updatedAt==='string'&&typeof a.searchText==='string'&&safeHref(a.href))}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function applyArchiveFilter(){const q=$('#archive-search').value.trim().toLowerCase().replaceAll('.','-').replaceAll('/','-');let count=0;document.querySelectorAll('.archive-row').forEach(row=>{row.hidden=!row.dataset.search.includes(q);if(!row.hidden)count++});$('#archive-count').textContent=`显示 ${count} / ${content.reviews.length} 份已留存复盘`;$('#archive-empty').hidden=count>0}
function applyEssayFilter(){const q=$('#essay-search').value.trim().toLowerCase();let count=0;document.querySelectorAll('.essay-card').forEach(card=>{card.hidden=!(category==='全部'||card.dataset.category===category)||!card.dataset.search.includes(q);if(!card.hidden)count++});$('#essay-count').textContent=`显示 ${count} / ${content.articles.length} 篇研究笔记`;$('#essay-empty').hidden=count>0}
function render(data){
 content=data;const sorted=[...data.reviews].sort((a,b)=>b.date.localeCompare(a.date)),r=sorted[0];
 const fields={shortDate:dotDate(r.date.slice(5)),year:r.date.slice(0,4),yearMonth:r.date.slice(0,7).replace('-',' / '),day:r.date.slice(8),title:r.title,summary:r.summary,strategyState:r.leaderState?.state||'待判断',strategyAsOf:`截至${r.date}收盘`,strategyReason:r.leaderState?.reason||'本日策略状态待补充，请查看当日复盘。'};
 document.querySelectorAll('[data-latest]').forEach(e=>e.textContent=fields[e.dataset.latest]);
 document.querySelectorAll('[data-latest-link]').forEach(e=>e.setAttribute('href',r.href));
 $('#latest-cutoff').textContent=`数据截至 ${dotDate(r.date.slice(5))} ${r.dataCutoff?r.dataCutoff.slice(11,16):'时间待补充'} · 北京时间`;
 $('#latest-tags').replaceChildren(...r.tags.map(t=>el('span','',t)));
 $('#archive-list').replaceChildren(...sorted.map(r=>{const a=el('a','archive-row');a.href=r.href;a.dataset.search=`${r.date} ${r.title} ${r.summary}`.toLowerCase();const time=el('time','',dotDate(r.date));time.dateTime=r.date;const copy=el('span');copy.append(el('b','',r.title),el('small','',r.summary));const arrow=el('span','row-arrow','↗');arrow.setAttribute('aria-hidden','true');a.append(time,copy,arrow);return a}));
 const categories=['全部',...new Set(data.articles.map(a=>a.category))];if(!categories.includes(category))category='全部';
 $('.filters').replaceChildren(...categories.map(c=>{const b=el('button','filter-chip',c);b.dataset.filter=c;b.setAttribute('aria-pressed',String(c===category));return b}));
 $('#essay-list').replaceChildren(...data.articles.map((a,i)=>{const card=el('a','essay-card');card.href=a.href;card.dataset.category=a.category;card.dataset.search=`${a.title} ${a.summary} ${a.category} ${a.searchText}`.toLowerCase();const top=el('div','essay-top');top.append(el('span','category',a.eyebrow),el('span','essay-number',String(i+1).padStart(2,'0')));const bottom=el('div','essay-bottom');bottom.append(el('span','',`方法笔记 · ${dotDate(a.updatedAt)}`));const arrow=el('span','','↗');arrow.setAttribute('aria-hidden','true');bottom.append(arrow);card.append(top,el('h3','',a.title),el('p','',a.summary),bottom);return card}));
 applyArchiveFilter();applyEssayFilter();
}
$('.filters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;category=b.dataset.filter;$('.filters').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applyEssayFilter()});
$('#archive-search').addEventListener('input',applyArchiveFilter);$('#essay-search').addEventListener('input',applyEssayFilter);
async function refreshContent(manual=false){
 if(busy)return;busy=true;const button=$('#refresh-content');button.disabled=true;button.setAttribute('aria-busy','true');if(manual)$('#update-status').textContent='正在检查已发布目录…';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(`./content-index.json?check=${Date.now()}`,{cache:'no-store',credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw Error('目录暂时不可用');const data=await response.json();if(!valid(data))throw Error('目录格式不完整');const changed=data.version!==content.version;if(changed)render(data);const latest=[...content.reviews].sort((a,b)=>b.date.localeCompare(a.date))[0];const time=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());$('#update-status').textContent=`${changed?'目录已更新':'已检查'} ${time} · 最新报告 ${latest.date}`;
 }catch{$('#update-status').textContent='检查更新失败 · 仍显示最近已加载内容，可稍后重试'}
 finally{clearTimeout(timeout);busy=false;button.disabled=false;button.removeAttribute('aria-busy')}
}
render(content);$('#refresh-content').addEventListener('click',()=>refreshContent(true));refreshContent();
setInterval(()=>{if(!document.hidden)refreshContent()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshContent()});
}
