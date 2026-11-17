export const clean=s=>String(s??'').replace(/[<>&"'`]/g,'').slice(0,80);
const KEYS=['ops','profiles','alerts','fig','profile','theme'];
export function makeBackup(S){const d={app:'investimento-em-moedas',versao:1,exportadoEm:new Date().toISOString()};for(const k of KEYS)d[k]=S[k];return JSON.stringify(d,null,1)}
const D=/^\d{4}-\d{2}-\d{2}$/,C=/^[A-Z]{3}$/,fin=Number.isFinite;
export function parseBackup(text){
  let d;try{d=JSON.parse(text)}catch{return{erro:'Arquivo inválido: não é um JSON.'}}
  if(d?.app!=='investimento-em-moedas')return{erro:'Este arquivo não é um backup do Investimento em Moedas.'};
  if(!Array.isArray(d.ops)||!d.ops.every(o=>o&&fin(o.id)&&['compra','venda'].includes(o.tipo)&&C.test(o.moeda)&&D.test(o.date)&&fin(o.qtd)&&o.qtd>0&&fin(o.total)&&o.total>0&&fin(o.taxas)&&o.taxas>=0&&o.taxas<=o.total))return{erro:'Há operações inválidas no arquivo. Nada foi importado.'};
  const dados={ops:d.ops.map(o=>({id:o.id,tipo:o.tipo,moeda:o.moeda,date:o.date,qtd:o.qtd,total:o.total,taxas:o.taxas,inst:clean(o.inst),sim:!!o.sim})),alerts:[]};
  if(d.profiles!=null){
    const F=['bs','ss','iofB','iofS','fee','fixed'];
    if(typeof d.profiles!=='object'||!Object.values(d.profiles).every(p=>p&&typeof p.nome==='string'&&F.every(k=>fin(p[k]))))return{erro:'Perfis de custos inválidos. Nada foi importado.'};
    dados.profiles=Object.fromEntries(Object.entries(d.profiles).map(([k,p])=>[clean(k),{nome:clean(p.nome),...Object.fromEntries(F.map(f=>[f,p[f]]))}]));
  }
  if(d.alerts!=null){
    if(!Array.isArray(d.alerts)||!d.alerts.every(a=>a&&fin(a.id)&&C.test(a.moeda)&&fin(a.alvo)&&a.alvo>0))return{erro:'Alertas inválidos. Nada foi importado.'};
    dados.alerts=d.alerts.map(a=>({id:a.id,moeda:a.moeda,alvo:a.alvo,descr:clean(a.descr),ativo:!!a.ativo,disparado:fin(a.disparado)?a.disparado:undefined,preco:fin(a.preco)?a.preco:undefined}));
  }
  if(d.fig&&typeof d.fig==='object'&&!Array.isArray(d.fig))dados.fig=d.fig;
  if(['dark','light','system'].includes(d.theme))dados.theme=d.theme;
  if(typeof d.profile==='string')dados.profile=clean(d.profile);
  return{dados};
}
// Alertas de venda: dispara quando a cotação de referência chega ao alvo.
export const hits=(alerts,moeda,px)=>alerts.filter(a=>a.ativo&&a.moeda===moeda&&px>=a.alvo);
