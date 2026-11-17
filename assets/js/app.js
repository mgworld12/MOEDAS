import {CURRENCIES,FAVORITES,PERIODS,SYM,badge} from './config.js';
import {kvGet,kvSet} from './storage.js';
import {getSeries,wiseAdapter} from './sources.js';
import {analyze} from './analysis.js';
import {PROFILES,roundTrip,convertNet} from './costs.js';
import {sma,ema,bollinger} from './indicators.js';
import {detect} from './patterns.js';
import {FIGURAS,svg,template} from './catalog.js';
import {positions,sellProjection,parseOp} from './portfolio.js';
import {makeBackup,parseBackup,clean,hits} from './backup.js';

const $=(s,r=document)=>r.querySelector(s), last=a=>a[a.length-1];
const nf=(n,d=4)=>Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=n=>Number.isFinite(n)?(n>0?'+':'')+n.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%':'—';
const cls=n=>n>0?'up':n<0?'dn':'';
const cur=(sel)=>Object.entries(CURRENCIES).map(([k,v])=>`<option value="${k}"${k===sel?' selected':''}>${SYM[k]} ${k} — ${v}</option>`).join('');
const when=t=>new Date(t).toLocaleString('pt-BR');
let S={view:'inicio',base:'USD',quote:'BRL',days:180,profile:'especie',amount:10000,theme:'dark',cf:'BRL',ct:'USD',ind:{sma20:false,sma50:false,ema:false,bb:false},ops:[],alerts:[],fig:{},fo:.6,fw:2,figAll:false,pat:false,sel:null,tw:45,profiles:structuredClone(PROFILES)};
const save=()=>kvSet('state',S);
const prof=()=>S.profiles[S.profile];

function theme(){document.documentElement.dataset.theme=S.theme==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):S.theme}
const err=(e,pair)=>`<p class="warn">Não foi possível obter ${pair}: ${e.message}. ARS não está nas fontes atuais; outros pares dependem da disponibilidade do Banco Central/BCE.</p>`;
const srcNote=r=>`<p class="note">Fonte: ${r.source}. Último dado: ${last(r.points).t}. Consultado em ${when(r.fetchedAt)}.${r.stale?` <b class="warn">Dados desatualizados (fonte indisponível: ${r.error}).</b>`:''} Cotação de referência, não é preço executável.</p>`;

function render(){
  document.querySelectorAll('#nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.v===S.view));
  const m=$('#main');({inicio:viewInicio,conversor:viewConv,analise:viewAnalise,figuras:viewFiguras,carteira:viewCarteira,custos:viewCustos})[S.view](m);
}
const go=v=>{S.view=v;save();render()};

async function viewInicio(m){
  m.innerHTML='<h2>Pares acompanhados</h2><div class="grid" id="cards"></div><p class="note">Toque em um par para abrir a análise. Variações calculadas sobre cotações de referência diárias.</p>';
  for(const [b,q] of FAVORITES){
    const c=document.createElement('button');c.className='card';c.innerHTML=`<b>${badge(b)}${badge(q)}${b}/${q}</b><span class="mut">carregando…</span>`;$('#cards').append(c);
    c.onclick=()=>{S.base=b;S.quote=q;go('analise')};
    getSeries(b,q,40).then(r=>{
      const cl=r.points.map(p=>p.c),n=cl.length,x=last(cl),v1=(x/cl[n-2]-1)*100,v5=(x/cl[Math.max(0,n-6)]-1)*100,v30=(x/cl[0]-1)*100;
      const mn=Math.min(...cl),mx=Math.max(...cl),pts=cl.map((y,i)=>`${(i/(n-1)*100).toFixed(1)},${(28-(y-mn)/(mx-mn||1)*26).toFixed(1)}`).join(' ');
      c.innerHTML=`<b>${badge(b)}${badge(q)}${b}/${q}</b><span class="v">${nf(x,x<1?5:4)}</span><svg viewBox="0 0 100 30" width="100%" height="30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5" class="${cls(v30)}"/></svg><span class="mut">dia <b class="${cls(v1)}">${pct(v1)}</b> · 5 pregões <b class="${cls(v5)}">${pct(v5)}</b> · período <b class="${cls(v30)}">${pct(v30)}</b></span><span class="note">${r.stale?'desatualizado · ':''}${last(r.points).t}</span>`;
    }).catch(()=>{c.innerHTML=`<b>${badge(b)}${badge(q)}${b}/${q}</b><span class="warn">indisponível</span>`});
  }
}

function viewConv(m){
  m.innerHTML=`<h2>Conversor com custos</h2><div class="row">
  <label>Valor<input id="v" type="number" min="0" step="any" value="${S.amount}"></label>
  <label>De<select id="f">${cur(S.cf)}</select></label><button id="sw" aria-label="Inverter moedas">⇄</button>
  <label>Para<select id="t">${cur(S.ct)}</select></label>
  <label>Perfil de custos<select id="p">${Object.entries(S.profiles).map(([k,p])=>`<option value="${k}"${k===S.profile?' selected':''}>${p.nome}</option>`).join('')}</select></label></div>
  <div id="out" class="panel"></div>`;
  const calc=async()=>{
    S.amount=+$('#v').value;S.cf=$('#f').value;S.ct=$('#t').value;S.profile=$('#p').value;save();
    const o=$('#out');o.textContent='Consultando…';
    try{const r=await getSeries(S.cf,S.ct,10),ref=last(r.points).c,c=convertNet(prof(),S.amount,ref,S.cf==='BRL');
      o.innerHTML=`<p class="mut">Pela cotação de referência (${nf(ref,5)})</p><p class="big">${nf(c.refAmount,2)} ${S.ct}</p>
      <p class="mut">Líquido estimado com “${prof().nome}”</p><p class="big ${cls(-c.costPct)}">${nf(c.received,2)} ${S.ct}</p>
      <p>Custo total estimado: <b>${nf(c.costPct,2)}%</b> · cotação efetiva ${nf(c.effRate,5)}</p>${srcNote(r)}<p class="note">Perfis e percentuais são editáveis na aba Custos; os valores iniciais são exemplos.</p>`;
    }catch(e){o.innerHTML=err(e,`${S.cf}/${S.ct}`)}
  };
  $('#sw').onclick=()=>{const a=$('#f').value;$('#f').value=$('#t').value;$('#t').value=a;calc()};
  m.querySelectorAll('input,select').forEach(e=>e.onchange=calc);calc();
}

function chart(el,r,show){
  const css=getComputedStyle(document.documentElement),g=n=>css.getPropertyValue(n).trim();
  el.innerHTML='';
  const ch=LightweightCharts.createChart(el,{autoSize:true,layout:{background:{color:'transparent'},textColor:g('--mut')},grid:{vertLines:{color:g('--line')},horzLines:{color:g('--line')}},rightPriceScale:{borderColor:g('--line')},timeScale:{borderColor:g('--line')}});
  const ser=r.ohlc?ch.addCandlestickSeries({upColor:g('--up'),downColor:g('--dn'),borderVisible:false,wickUpColor:g('--up'),wickDownColor:g('--dn')}):ch.addLineSeries({color:g('--ac'),lineWidth:2});
  ser.setData(r.ohlc?r.points.map(p=>({time:p.t,open:p.o,high:p.h,low:p.l,close:p.c})):r.points.map(p=>({time:p.t,value:p.c})));
  const c=r.points.map(p=>p.c),line=(arr,color,w=1)=>ch.addLineSeries({color,lineWidth:w,priceLineVisible:false,lastValueVisible:false}).setData(arr.map((v,i)=>v==null?null:{time:r.points[i].t,value:v}).filter(Boolean));
  if(show.sma20)line(sma(c,20),'#f0b429');if(show.sma50)line(sma(c,50),'#b48cff');if(show.ema)line(ema(c,12),'#ff8f5a');
  if(show.bb){const b=bollinger(c);[['up'],['mid'],['low']].forEach(([k])=>line(b.map(x=>x&&x[k]),'#7f8c9b'))}
  ch.timeScale().fitContent();return{ch,ser};
}

async function viewAnalise(m){
  m.innerHTML=`<h2 id="ttl">Análise de tendência e vantagem líquida</h2><div class="row"><button id="colar">Colar dados da operação</button>
  <label>Moeda<select id="b">${cur(S.base)}</select></label><label>Contra<select id="q">${cur(S.quote)}</select></label>
  <div class="seg" role="group" aria-label="Período">${PERIODS.map(([d,l])=>`<button data-d="${d}" aria-pressed="${d===S.days}">${l}</button>`).join('')}</div>
  <label>Perfil de custos<select id="p">${Object.entries(S.profiles).map(([k,p])=>`<option value="${k}"${k===S.profile?' selected':''}>${p.nome}</option>`).join('')}</select></label>
  <label>Valor da operação<input id="a" type="number" min="1" value="${S.amount}"></label></div>
  <div class="row">${[['sma20','SMA 20'],['sma50','SMA 50'],['ema','EMA 12'],['bb','Bollinger']].map(([k,l])=>`<label style="flex-direction:row;gap:6px"><input type="checkbox" data-i="${k}" ${S.ind[k]?'checked':''}>${l}</label>`).join('')}</div>
  <div class="row"><label style="flex-direction:row;gap:6px"><input type="checkbox" data-p="pat" ${S.pat?'checked':''}>Figuras detectadas automaticamente</label><label style="flex-direction:row;gap:6px"><input type="checkbox" data-p="figAll" ${S.figAll?'checked':''}>Ocultar todas as figuras</label><label>Transparência<input type="range" data-p="fo" min=".05" max="1" step=".05" value="${S.fo}"></label><label>Espessura<input type="range" data-p="fw" min="1" max="5" step="1" value="${S.fw}"></label><button id="rst">Restaurar posições</button>${S.sel?`<span>Figura: <b>${S.sel}</b> <button id="selx">Remover</button></span><label>Tamanho do modelo (barras)<input type="range" data-p="tw" min="15" max="150" step="5" value="${S.tw}"></label>`:''}</div>
  <div id="chart" role="img" aria-label="Gráfico do par"></div><p class="note">Arraste uma figura para movê-la (ela fica numa camada própria e não altera preços). Passe o mouse ou toque para ver o nome; clique sem arrastar para abrir os detalhes.</p><div id="detalhe"></div><div id="lista"></div><div id="res"></div>`;
  const run=async()=>{
    S.base=$('#b').value;S.quote=$('#q').value;S.profile=$('#p').value;S.amount=+$('#a').value||10000;save();
    const res=$('#res');res.textContent='Consultando…';$('#ttl').innerHTML=badge(S.base)+badge(S.quote)+'Análise de tendência e vantagem líquida';
    try{
      const r=await getSeries(S.base,S.quote,S.days);const {ch,ser}=chart($('#chart'),r,S.ind);const a=analyze(r.points,prof(),S.amount);const det=S.pat||S.sel?detect(r.points,r.ohlc):[];let pats=S.pat?det:[],msg='';
      if(S.sel){const f=FIGURAS.find(x=>x.nome===S.sel),hit=det.filter(p=>p.nome===S.sel);if(hit.length)pats=[...pats.filter(p=>!hit.includes(p)),...hit.slice(-3)];else if(f&&!f.c)pats=[...pats,template(f,r.points,S.tw)];else msg=`Não encontrei “${S.sel}” neste período${r.ohlc?'':' (esta fonte só tem fechamento diário; candles exigem pares com BRL via PTAX)'}. Tente outro par ou período.`}
      $('#detalhe').innerHTML=msg?`<p class="warn">${msg}</p>`:'';
      if(pats.length)overlay($('#chart'),ch,ser,pats,S.fig,k=>showPat(pats.find(p=>p.key===k)));
      if(pats.length||S.pat)patList(pats);else $('#lista').innerHTML='';
      res.innerHTML=srcNote(r)+(r.ohlc?'':'<p class="note">Esta fonte fornece apenas o fechamento diário; o gráfico é de linha.</p>')+(a.error?`<p class="warn">${a.error}</p>`:`
      <h3>Sinais técnicos</h3><table><tr><th>Indicador</th><th>Valor</th><th>Leitura</th></tr>${a.signals.map(s=>`<tr><td>${s.n}</td><td>${s.txt}</td><td class="${s.v>0?'up':s.v<0?'dn':'mut'}">${s.v>0?'favorece alta':s.v<0?'favorece baixa':'neutro'}</td></tr>`).join('')}</table>
      <h3>Vantagem líquida por horizonte</h3>
      <p>Para sair no zero a zero com “${prof().nome}”, a cotação precisa se mover <b>${pct(a.be)}</b> entre a compra e a venda. Volatilidade diária recente: ${nf(a.vol,2)}%.</p>
      <table><tr><th>Horizonte</th><th>Variação típica (±1σ)</th><th>Chance de superar o equilíbrio</th><th>Leitura</th></tr>${a.rows.map(x=>`<tr><td>${x.h} dias</td><td>±${nf(x.sigma,2)}%</td><td>${nf(x.prob*100,0)}%</td><td>${x.verdict}</td></tr>`).join('')}</table>
      <p class="note">A leitura combina os sinais técnicos (placar ${nf(a.score,2)} de −1 a +1) com os custos. A chance usa a volatilidade histórica sem assumir tendência; é uma estimativa, não uma previsão. Padrões gráficos, radar e backtesting ainda não estão nesta versão.</p>`);
    }catch(e){$('#chart').innerHTML='';res.innerHTML=err(e,`${S.base}/${S.quote}`)}
  };
  m.querySelectorAll('select,#a').forEach(e=>e.onchange=run);
  m.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{S.days=+b.dataset.d;m.querySelectorAll('[data-d]').forEach(x=>x.setAttribute('aria-pressed',x===b));run()});
  m.querySelectorAll('[data-i]').forEach(c=>c.onchange=()=>{S.ind[c.dataset.i]=c.checked;run()});
  m.querySelectorAll('[data-p]').forEach(c=>c.onchange=()=>{S[c.dataset.p]=c.type==='range'?+c.value:c.checked;save();if(c.type!=='range'||c.dataset.p==='tw')run()});
  $('#rst').onclick=()=>{S.fig={};save();run()};
  if($('#selx'))$('#selx').onclick=()=>{S.sel=null;save();viewAnalise(m)};
  $('#colar').onclick=async()=>{const o=await colar();if(!o)return;if(o.moeda&&o.moeda!=='BRL'){S.base=o.moeda;S.quote='BRL'}const a=o.total||(o.qtd&&o.cotacao?o.qtd*o.cotacao:0);if(a)S.amount=a;save();viewAnalise(m)};run();
}

const FIELDS=[['bs','Spread de compra (%)'],['ss','Spread de venda (%)'],['iofB','IOF na compra (%)'],['iofS','IOF na venda (%)'],['fee','Tarifa percentual (%)'],['fixed','Tarifa fixa (moeda de cotação)']];
async function viewCustos(m){
  m.innerHTML=`<h2>Custos e ponto de equilíbrio</h2><div class="row">
  <label>Perfil<select id="p">${Object.entries(S.profiles).map(([k,p])=>`<option value="${k}"${k===S.profile?' selected':''}>${p.nome}</option>`).join('')}</select></label>
  <label>Par<select id="b">${cur(S.base)}</select></label><label>Cotado em<select id="q">${cur(S.quote)}</select></label>
  <label>Valor investido<input id="a" type="number" min="1" value="${S.amount}"></label></div>
  <div class="row">${FIELDS.map(([k,l])=>`<label>${l}<input data-k="${k}" type="number" step="any" value="${prof()[k]}"></label>`).join('')}</div>
  <p class="note">Os valores iniciais são exemplos, não tarifas reais. Informe os de sua instituição e confirme o IOF vigente. Comparação automática de instituições e a Wise: ${wiseAdapter.motivo}</p><div id="out"></div>`;
  const run=async()=>{
    S.profile=$('#p').value;S.base=$('#b').value;S.quote=$('#q').value;S.amount=+$('#a').value||10000;
    m.querySelectorAll('[data-k]').forEach(i=>prof()[i.dataset.k]=+i.value||0);save();
    const o=$('#out');o.textContent='Consultando…';
    try{
      const r=await getSeries(S.base,S.quote,10),ref=last(r.points).c,t=roundTrip(prof(),ref,S.amount);
      o.innerHTML=`<div class="panel"><p>Cotação de referência: <b>${nf(ref,5)}</b> · preço de compra efetivo: <b>${nf(t.buyPrice,5)}</b> · quantidade: <b>${nf(t.units,2)} ${S.base}</b></p>
      <p>Preço de referência para sair no zero a zero: <b>${nf(t.bePrice,5)}</b> (<b>${pct(t.breakEvenPct)}</b>)</p></div>
      <h3>Resultado por cenário de saída</h3><table><tr><th>Movimento da cotação</th><th>Cotação de referência</th><th>Resultado líquido</th></tr>
      ${[-5,-2,-1,0,1,2,5,10].map(d=>{const x=ref*(1+d/100),n=t.proceeds(x)-S.amount;return`<tr><td>${pct(d)}</td><td>${nf(x,5)}</td><td class="${cls(n)}">${nf(n,2)} (${pct(n/S.amount*100)})</td></tr>`}).join('')}</table>
      <h3>Comparação entre perfis (mesmo valor)</h3><table><tr><th>Perfil</th><th>Equilíbrio de ida e volta</th></tr>${Object.values(S.profiles).map(p=>`<tr><td>${p.nome}</td><td>${pct(roundTrip(p,ref,S.amount).breakEvenPct)}</td></tr>`).join('')}</table>${srcNote(r)}`;
    }catch(e){o.innerHTML=err(e,`${S.base}/${S.quote}`)}
  };
  m.querySelectorAll('select,input').forEach(e=>e.onchange=run);
  $('#p').onchange=()=>{S.profile=$('#p').value;viewCustos(m)};run();
}

(async()=>{
  const s=await kvGet('state');if(s)S={...S,...s,profiles:{...PROFILES,...s.profiles}};
  S.ind={sma20:false,sma50:false,ema:false,bb:false};S.pat=false;S.sel=null; // o gráfico sempre abre limpo
  theme();
  $('#theme').onclick=()=>{S.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';theme();save();render()};
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>S.theme==='system'&&theme());
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  render();checkAlerts();setInterval(checkAlerts,3e5);
})();

function showPat(p){
  if(!p)return;
  $('#detalhe').innerHTML=`<div class="panel"><b>${p.nome}</b> — direção potencial: ${p.dir} · estado: <b>${p.estado}</b><p class="note">Identificada na barra de ${p.ident} (barra em que o último pivô foi confirmado). Estados: formação, identificada, confirmação pendente, confirmada, invalidada.</p>
  ${p.q!=null?`<p>Qualidade estimada: <b>${p.q}/100</b> — nota de forma, não é probabilidade de acerto.</p>`:''}<ul>${p.crit.map(c=>`<li>${c}</li>`).join('')}</ul>
  ${p.conf?`<p>Região de confirmação: ${p.conf.txt}<br>Região de invalidação: ${p.inval.txt}</p>`:''}</div>`;
}
function patList(pats){
  const L=$('#lista');
  L.innerHTML=pats.length?`<h3>Padrões encontrados (${pats.length})</h3><table><tr><th>Exibir</th><th>Padrão</th><th>Direção</th><th>Estado</th><th>Identificado</th><th>Qualidade</th></tr>${pats.slice().reverse().map(p=>`<tr><td><input type="checkbox" data-k="${p.key}" ${S.fig[p.key]?.hide?'':'checked'}></td><td><a href="#" data-s="${p.key}">${p.nome}</a></td><td>${p.dir}</td><td>${p.estado}</td><td>${p.ident}</td><td>${p.q??'—'}</td></tr>`).join('')}</table>`:'<p class="note">Nenhum padrão com critérios suficientes neste período.</p>';
  L.querySelectorAll('[data-k]').forEach(c=>c.onchange=()=>{(S.fig[c.dataset.k]??={dx:0,dy:0}).hide=!c.checked;save()});
  L.querySelectorAll('[data-s]').forEach(a=>a.onclick=e=>{e.preventDefault();showPat(pats.find(p=>p.key===a.dataset.s))});
}
function overlay(el,ch,ser,pats,fig,pick){
  const cv=document.createElement('canvas');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';el.append(cv);
  const ctx=cv.getContext('2d'),ts=ch.timeScale(),css=getComputedStyle(document.documentElement),ac=new AbortController(),v=n=>css.getPropertyValue(n).trim();
  let hov=null,drag=null,mx=0,my=0,shapes=[];
  const o=k=>fig[k]??={dx:0,dy:0,hide:false};
  const P=(t,p,k)=>{const x=ts.timeToCoordinate(t),y=ser.priceToCoordinate(p);return x==null||y==null?null:[x+o(k).dx,y+o(k).dy]};
  const build=()=>{shapes=S.figAll?[]:pats.filter(p=>!o(p.key).hide).map(p=>({p,pts:p.pts.map(q=>P(q.t,q.p,p.key)),lines:p.lines.map(l=>[P(l.t1,l.p1,p.key),P(l.t2,l.p2,p.key)])}))};
  const dseg=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/L));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)};
  const hit=e=>{const r=el.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;mx=x;my=y;
    for(const s of shapes.slice().reverse()){const ok=s.pts.filter(Boolean);
      if(s.p.single){if(ok[0]&&Math.hypot(x-ok[0][0],y-ok[0][1]-(s.p.dir==='alta'?14:-14))<12)return s.p}
      else{for(let i=1;i<ok.length;i++)if(dseg(x,y,ok[i-1],ok[i])<8)return s.p;for(const [a,b] of s.lines)if(a&&b&&dseg(x,y,a,b)<8)return s.p}}
    return null};
  el.addEventListener('pointerdown',e=>{const h=hit(e);hov=h;if(!h)return;e.stopPropagation();e.preventDefault();drag={k:h.key,x:e.clientX,y:e.clientY,o:{...o(h.key)},moved:false}},true);
  addEventListener('pointermove',e=>{if(drag){const d=o(drag.k);d.dx=drag.o.dx+e.clientX-drag.x;d.dy=drag.o.dy+e.clientY-drag.y;drag.moved=drag.moved||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>3;const r=el.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top}else if(e.pointerType==='mouse'){hov=hit(e);el.style.cursor=hov?'grab':''}},{signal:ac.signal});
  addEventListener('pointerup',()=>{if(drag){if(!drag.moved)pick(drag.k);save();drag=null}},{signal:ac.signal});
  (function frame(){
    if(!el.isConnected){ac.abort();return}
    const r=el.getBoundingClientRect(),d=devicePixelRatio||1,w=Math.round(r.width*d),h=Math.round(r.height*d);
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
    ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);build();
    for(const s of shapes){
      ctx.globalAlpha=S.fo;ctx.strokeStyle=ctx.fillStyle=v(s.p.dir==='alta'?'--up':s.p.dir==='baixa'?'--dn':'--warn');ctx.lineWidth=S.fw;
      const ok=s.pts.filter(Boolean);ctx.setLineDash(s.p.estado==='Invalidada'?[2,4]:[]);
      if(s.p.single){if(ok[0]){ctx.beginPath();ctx.arc(ok[0][0],ok[0][1]+(s.p.dir==='alta'?14:-14),6,0,7);ctx.stroke()}}
      else{ctx.beginPath();ok.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();ctx.setLineDash([6,4]);
        for(const [a,b] of s.lines)if(a&&b){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}}
      ctx.setLineDash([]);
    }
    if(hov){const t=`${hov.nome} — ${hov.estado}`;ctx.globalAlpha=1;ctx.font='13px "IBM Plex Sans",sans-serif';const w2=ctx.measureText(t).width;ctx.fillStyle=v('--panel');ctx.fillRect(mx+10,my-28,w2+14,24);ctx.fillStyle=v('--tx');ctx.fillText(t,mx+17,my-11)}
    requestAnimationFrame(frame);
  })();
}

const num=id=>{const x=parseFloat($(id).value);return Number.isFinite(x)?x:NaN};
async function viewCarteira(m){
  const cs=Object.keys(CURRENCIES).filter(c=>c!=='BRL'),pos=positions(S.ops),sp=prof(),k=(1-sp.ss/100)*(1-sp.iofS/100)*(1-sp.fee/100),R=(n)=>nf(n,2);
  m.innerHTML=`<h2>Carteira, simulador e projeção de venda</h2>
  <div class="panel"><h3 style="margin-top:0">Registrar operação</h3><div class="row">
  <label>Tipo<select id="ot"><option>compra</option><option>venda</option></select></label><label>Moeda<select id="om">${cs.map(c=>`<option>${c}</option>`).join('')}</select></label>
  <label>Data<input id="od" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Quantidade<input id="oq" type="number" step="any" min="0"></label>
  <label>Total em R$ (compra: pago com taxas; venda: recebido)<input id="oT" type="number" step="any" min="0"></label><label>Taxas e IOF dentro do total (R$)<input id="of" type="number" step="any" min="0" value="0"></label>
  <label>Instituição<input id="oi"></label><label style="flex-direction:row;gap:6px"><input type="checkbox" id="os">simulação</label><button id="colar">Colar dados</button><button id="oadd">Registrar</button></div><p id="oprev" class="note"></p></div>
  <h3>Posições (operações reais)</h3><div id="pos">Consultando…</div>
  <div class="panel"><h3 style="margin-top:0">Projeção de venda <button id="cpy">Copiar resumo</button></h3><div class="row">
  <label>Moeda<select id="pm">${cs.map(c=>`<option>${c}</option>`).join('')}</select></label><label>Quantidade comprada<input id="pq" type="number" step="any"></label><label>Total pago em R$ (com taxas)<input id="pT" type="number" step="any"></label><label>Taxas pagas dentro do total (R$)<input id="pf" type="number" step="any" value="0"></label>
  <label>Cotação de venda alvo<input id="px" type="number" step="any"></label><label>Lucro desejado (R$)<input id="pL" type="number" step="any"></label><label>Lucro desejado (%)<input id="pP" type="number" step="any"></label></div>
  <p class="note">Custos de venda do perfil “${sp.nome}”: spread ${sp.ss}%, IOF ${sp.iofS}%, tarifa ${sp.fee}% + ${sp.fixed} fixa (ajuste na aba Custos). Venda com troca para outra moeda: ainda não incluída.</p><div id="pout"></div></div>
  <h3>Alertas de preço de venda</h3><div id="al"></div><h3>Operações registradas</h3><div id="ops"></div>
  <div class="panel"><h3 style="margin-top:0">Backup</h3><p class="note">Seus dados ficam só neste navegador; limpar os dados do navegador apaga tudo. Exporte um arquivo para guardar ou levar a outro aparelho.</p><div class="row"><button id="bex">Exportar backup (JSON)</button><label>Importar backup<input id="bim" type="file" accept=".json,application/json"></label></div></div>`;
  const prev=()=>{const q=num('#oq'),T=num('#oT'),f=num('#of')||0;$('#oprev').innerHTML=q>0&&T>0?`Valor da moeda: <b>${R(T-f)}</b> · taxas: <b>${R(f)}</b> · cotação paga: <b>${nf((T-f)/q,4)}</b> · preço com taxas: <b>${nf(T/q,4)}</b>`:''};
  ['#oq','#oT','#of'].forEach(i=>$(i).oninput=prev);
  $('#oadd').onclick=()=>{
    const o={id:Date.now(),tipo:$('#ot').value,moeda:$('#om').value,date:$('#od').value,qtd:num('#oq'),total:num('#oT'),taxas:num('#of')||0,inst:clean($('#oi').value),sim:$('#os').checked};
    if(!(o.qtd>0&&o.total>0&&o.taxas<=o.total&&o.date))return alert('Informe data, quantidade e total válidos (as taxas não podem passar do total).');
    const sd=positions(S.ops).find(p=>p.moeda===o.moeda)?.qtd||0;
    if(o.tipo==='venda'&&!o.sim&&o.qtd>sd+1e-9)return alert(`Saldo insuficiente: você tem ${nf(sd,2)} ${o.moeda} registrados.`);
    S.ops.push(o);save();viewCarteira(m);
  };
  let resumo='';
  const addAlert=async(alvo,descr)=>{if(!(alvo>0))return;S.alerts.push({id:Date.now(),moeda:$('#pm').value,alvo:+(+alvo).toFixed(6),descr:clean(descr),ativo:true});save();if('Notification' in window&&Notification.permission==='default')try{await Notification.requestPermission()}catch{}refreshAlerts();checkAlerts()};
  const proj=()=>{
    const i={qtd:num('#pq'),total:num('#pT'),taxas:num('#pf')||0},x=num('#px'),L=num('#pL'),Lp=num('#pP'),out=$('#pout');
    if(!(i.qtd>0&&i.total>0)){out.innerHTML='<p class="note">Informe quantidade e total pago para projetar.</p>';resumo='';return}
    const p=sellProjection(sp,i),rows=[],add=(a,h,ap,ad)=>rows.push({a,h,ap,ad}),rs=n=>`<b class="${cls(n)}">${R(n)} (${pct(n/i.total*100)})</b>`;
    add('Valor da moeda / taxas pagas',`${R(i.total-i.taxas)} / ${R(i.taxas)}`);add('Cotação paga (só a moeda)',nf(p.paid,4));add('Preço médio com taxas',nf(p.avg,4));
    add('Cotação de venda para empatar (com custos de venda)',`<b>${nf(p.be,4)}</b> (${pct((p.be/p.paid-1)*100)} sobre a cotação paga)`,p.be,'empate');
    if(x>0)add(`Resultado vendendo tudo a ${nf(x,4)}`,rs(p.result(x)),x,'preço alvo');
    if(L>0)add(`Cotação para lucrar ${R(L)}`,`<b>${nf(p.priceFor(L),4)}</b>`,p.priceFor(L),`lucro de R$ ${R(L)}`);
    if(Lp>0)add(`Cotação para lucrar ${Lp}%`,`<b>${nf(p.priceFor(i.total*Lp/100),4)}</b>`,p.priceFor(i.total*Lp/100),`lucro de ${Lp}%`);
    if(x>0&&L>0)add(`Quantidade a vender a ${nf(x,4)} para realizar ${R(L)}`,(n=>n==null?'<span class="warn">Este preço não cobre o custo médio</span>':n>i.qtd?`<span class="warn">Precisa de ${nf(n,2)}, mais que os ${nf(i.qtd,2)} comprados</span>`:`<b>${nf(n,4)}</b> (recebe ${R(n*x*p.k-sp.fixed)})`)(p.unitsFor(x,L)));
    out.innerHTML=`<table>${rows.map(r=>`<tr><td>${r.a}</td><td>${r.h}${r.ap?` <button data-al="${r.ap}" data-d="${r.ad}">Alertar</button>`:''}</td></tr>`).join('')}</table><p class="note">Valores em reais sobre cotações de referência; spread, IOF e tarifas de venda saem do perfil de custos. “Alertar” avisa quando a cotação de referência chegar a esse preço. Estimativa, não garantia.</p>`;
    resumo=`Projeção de venda — ${$('#pm').value}\n`+rows.map(r=>`${r.a}: ${r.h.replace(/<[^>]+>/g,'')}`).join('\n');
    out.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>addAlert(+b.dataset.al,b.dataset.d));
  };
  m.querySelectorAll('#pq,#pT,#pf,#px,#pL,#pP').forEach(e=>e.oninput=proj);proj();
  $('#cpy').onclick=()=>navigator.clipboard?.writeText(resumo).then(()=>{$('#cpy').textContent='Copiado'}).catch(()=>alert('Não foi possível copiar.'));
  $('#colar').onclick=async()=>{const o=await colar();if(!o)return;const set=(i,v)=>{if(v!=null&&!Number.isNaN(v))$(i).value=+(+v).toFixed(8)};
    if(o.tipo)$('#ot').value=o.tipo;if(o.moeda)$('#om').value=o.moeda;if(o.date)$('#od').value=o.date;
    if(o.moeda)$('#pm').value=o.moeda;set('#oq',o.qtd);set('#oT',o.total);set('#of',o.taxas);set('#pq',o.qtd);set('#pT',o.total);set('#pf',o.taxas);prev();proj();
    if(o.qtdCalculada)alert('A quantidade foi calculada: (total − taxas) ÷ cotação. Confira antes de registrar.')};
  const row=o=>`<tr><td>${o.date}</td><td>${o.tipo}${o.sim?' (simulação)':''}</td><td>${o.moeda}</td><td>${nf(o.qtd,2)}</td><td>${R(o.total)}</td><td>${R(o.taxas)}</td><td>${clean(o.inst)}</td><td><button data-del="${o.id}">Excluir</button></td></tr>`;
  $('#ops').innerHTML=S.ops.length?`<table><tr><th>Data</th><th>Tipo</th><th>Moeda</th><th>Qtd.</th><th>Total R$</th><th>Taxas R$</th><th>Instituição</th><th></th></tr>${S.ops.slice().sort((a,b)=>a.date<b.date?1:-1).map(row).join('')}</table>`:'<p class="note">Nenhuma operação registrada. Simulações não entram nas posições.</p>';
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Excluir esta operação?')){S.ops=S.ops.filter(o=>o.id!=b.dataset.del);save();viewCarteira(m)}});
  refreshAlerts=()=>{const A=S.alerts;if($('#al'))$('#al').innerHTML=A.length?`<table><tr><th>Moeda</th><th>Avisar quando chegar a</th><th>Motivo</th><th>Estado</th><th></th></tr>${A.map(a=>`<tr><td>${badge(a.moeda)}${a.moeda}</td><td>${nf(a.alvo,4)}</td><td>${clean(a.descr)}</td><td>${a.ativo?'Ativo':a.disparado?`Disparado em ${new Date(a.disparado).toLocaleString('pt-BR')} (${nf(a.preco,4)})`:'Inativo'}</td><td><button data-ad="${a.id}">Excluir</button></td></tr>`).join('')}</table><p class="note">O app confere a cada 5 minutos enquanto estiver aberto, com a cotação de referência do Banco Central. Com o app fechado não há aviso.</p>`:'<p class="note">Nenhum alerta. Use “Alertar” na projeção de venda.</p>';m.querySelectorAll('[data-ad]').forEach(b=>b.onclick=()=>{S.alerts=S.alerts.filter(a=>a.id!=b.dataset.ad);save();refreshAlerts()})};
  refreshAlerts();
  $('#bex').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([makeBackup(S)],{type:'application/json'}));a.download=`moedas-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
  $('#bim').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>5e6)return alert('Arquivo grande demais para um backup.');const r=parseBackup(await f.text());if(r.erro)return alert(r.erro);
    if(!confirm(`Substituir os dados atuais por ${r.dados.ops.length} operações e ${r.dados.alerts.length} alertas do arquivo?`))return;
    Object.assign(S,r.dados,{profiles:{...S.profiles,...(r.dados.profiles||{})}});if(!S.profiles[S.profile])S.profile='especie';theme();save();viewCarteira(m)};
  const px=await Promise.all(pos.map(p=>getSeries(p.moeda,'BRL',10).then(r=>last(r.points).c).catch(()=>null)));
  $('#pos').innerHTML=pos.length?`<table><tr><th>Moeda</th><th>Saldo</th><th>Preço médio (com taxas)</th><th>Custo total</th><th>Cotação atual</th><th>Líquido se vender (perfil)</th><th>Não realizado</th><th>Realizado</th><th></th></tr>${pos.map((p,j)=>{const v=px[j],liq=v==null?null:p.qtd*v*k-sp.fixed*(p.qtd>0),nr=liq==null||p.qtd<=0?null:liq-p.custo;return`<tr><td>${badge(p.moeda)}${p.moeda}</td><td>${nf(p.qtd,2)}</td><td>${nf(p.pm,4)}</td><td>${R(p.custo)}</td><td>${v==null?'—':nf(v,4)}</td><td>${liq==null?'—':R(liq)}</td><td class="${cls(nr)}">${nr==null?'—':`${R(nr)} (${pct(nr/p.custo*100)})`}</td><td class="${cls(p.real)}">${R(p.real)}</td><td><button data-fill="${j}">Projetar</button></td></tr>`}).join('')}</table>`:'<p class="note">Sem posições reais ainda.</p>';
  m.querySelectorAll('[data-fill]').forEach(b=>b.onclick=()=>{const p=pos[b.dataset.fill];if(p.qtd<=0)return;$('#pm').value=p.moeda;$('#pq').value=+p.qtd.toFixed(8);$('#pT').value=+p.custo.toFixed(2);$('#pf').value=0;$('#pq').scrollIntoView({block:'center'});proj()});
}

async function colar(){
  let t='';try{t=await navigator.clipboard.readText()}catch{t=prompt('Cole aqui os dados da operação (compra ou venda):')||''}
  const o=parseOp(t,Object.keys(CURRENCIES).filter(c=>c!=='BRL'));
  if(!(o.moeda||o.total||o.qtd)){alert('Não encontrei dados de operação no texto copiado. Inclua moeda, quantidade, total e taxas.');return null}
  return o;
}
function viewFiguras(m){
  const fams=['Todas',...new Set(FIGURAS.map(f=>f.fam))];
  m.innerHTML=`<h2>Figuras de análise gráfica</h2><div class="row"><label>Família<select id="ff">${fams.map(f=>`<option>${f}</option>`).join('')}</select></label></div>
  <p class="note">As figuras clássicas usadas no Forex. “Ver no gráfico” abre a análise e mostra a figura sobre o gráfico: na posição em que foi detectada ou, nos modelos manuais, sobre as últimas barras. Depois ajuste a transparência para comparar com o preço.</p><div class="grid" id="fg"></div>`;
  const draw=()=>{const v=$('#ff').value;$('#fg').innerHTML=FIGURAS.filter(f=>v==='Todas'||f.fam===v).map(f=>`<div class="panel" style="margin:0">${svg(f)}<b>${f.nome}</b><div class="note">${f.fam} · direção potencial: ${f.dir} · ${f.auto?'detecção automática':'modelo manual'}</div><p style="margin:6px 0;font-size:13px">${f.ctx}</p><button data-f="${f.nome}">Ver no gráfico</button></div>`).join('');
    m.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{S.sel=b.dataset.f;S.pat=false;go('analise')})};
  $('#ff').onchange=draw;draw();
}

let refreshAlerts=()=>{};
function notify(msg){
  let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','alert');document.body.append(t)}
  const r=document.createElement('div'),sp=document.createElement('span'),b=document.createElement('button');sp.textContent=msg;b.textContent='Fechar';b.onclick=()=>r.remove();r.append(sp,b);t.append(r);
  if('Notification' in window&&Notification.permission==='granted'){const f=()=>new Notification('Investimento em Moedas',{body:msg});try{navigator.serviceWorker?.ready.then(g=>g.showNotification('Investimento em Moedas',{body:msg})).catch(f)}catch{f()}}
}
async function checkAlerts(){
  const act=S.alerts.filter(a=>a.ativo);if(!act.length)return;
  for(const mo of new Set(act.map(a=>a.moeda))){
    let px;try{px=last((await getSeries(mo,'BRL',10)).points).c}catch{continue}
    for(const a of hits(S.alerts,mo,px)){a.ativo=false;a.disparado=Date.now();a.preco=px;notify(`${a.moeda} chegou a ${nf(px,4)} (alvo ${nf(a.alvo,4)}, ${a.descr}).`)}
  }
  save();if(S.view==='carteira')refreshAlerts();
}
