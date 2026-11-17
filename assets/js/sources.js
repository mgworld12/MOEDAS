import {kvGet,kvSet} from './storage.js';
export const BCB=['AUD','CAD','CHF','EUR','GBP','JPY','USD'];
const iso=d=>d.toISOString().slice(0,10), ago=n=>new Date(Date.now()-n*864e5);
const us=d=>{const [y,m,dd]=iso(d).split('-');return `${m}-${dd}-${y}`};
async function jget(u){const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
async function bcb(code,days){
  const u=`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='${code}'&@dataInicial='${us(ago(days))}'&@dataFinalCotacao='${us(new Date())}'&$top=20000&$format=json`;
  const by={};
  for(const v of (await jget(u)).value||[]){
    if(!(v.cotacaoCompra>0&&v.cotacaoVenda>0))continue;
    (by[v.dataHoraCotacao.slice(0,10)]??=[]).push([v.dataHoraCotacao,(v.cotacaoCompra+v.cotacaoVenda)/2]);
  }
  return Object.keys(by).sort().map(t=>{const a=by[t].sort((p,q)=>p[0]<q[0]?-1:1).map(z=>z[1]);return{t,o:a[0],h:Math.max(...a),l:Math.min(...a),c:a[a.length-1]}});
}
async function ecb(b,q,days){
  const j=await jget(`https://api.frankfurter.dev/v1/${iso(ago(days))}..${iso(new Date())}?base=${b}&symbols=${q}`);
  return Object.entries(j.rates||{}).sort().filter(([,r])=>r[q]>0).map(([t,r])=>({t,o:r[q],h:r[q],l:r[q],c:r[q]}));
}
const SRC_BCB='Banco Central do Brasil — PTAX (média compra/venda; máxima e mínima vêm dos boletins do dia)';
export async function getSeries(b,q,days){
  const key=`s:${b}${q}:${days}`;
  try{
    if(b===q)throw new Error('Escolha moedas diferentes');
    let points,source,ohlc;
    if(q==='BRL'&&BCB.includes(b)){points=await bcb(b,days);source=SRC_BCB;ohlc=true}
    else if(b==='BRL'&&BCB.includes(q)){points=(await bcb(q,days)).map(p=>({t:p.t,o:1/p.o,h:1/p.l,l:1/p.h,c:1/p.c}));source=SRC_BCB+' (invertida)';ohlc=true}
    else{points=await ecb(b,q,days);source='Frankfurter — taxas de referência do BCE (fechamento diário)';ohlc=false}
    if(!points.length)throw new Error('Par sem dados nas fontes integradas');
    const r={points,source,ohlc,fetchedAt:Date.now(),stale:false};await kvSet(key,r);return r;
  }catch(e){const c=await kvGet(key);if(c)return{...c,stale:true,error:e.message};throw e}
}
export const wiseAdapter={id:'wise',disponivel:false,motivo:'A Wise exige token privado. Ative por um serviço intermediário (veja README); até lá, os custos usam os perfis configuráveis.'};
