// Método do preço médio com custo "all-in" (valor da moeda + taxas + IOF). Simulações ficam fora das posições.
export function positions(ops){
  const P={};
  [...ops].filter(o=>!o.sim).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.id-b.id).forEach(o=>{
    const x=P[o.moeda]??={moeda:o.moeda,qtd:0,custo:0,real:0,taxas:0};
    if(o.tipo==='compra'){x.qtd+=o.qtd;x.custo+=o.total;x.taxas+=o.taxas}
    else{const q=Math.min(o.qtd,x.qtd),avg=x.qtd?x.custo/x.qtd:0;x.real+=o.total-avg*q;x.custo-=avg*q;x.qtd-=q}
  });
  return Object.values(P).map(x=>({...x,pm:x.qtd>1e-12?x.custo/x.qtd:0}));
}
const f=x=>x/100;
// Projeção de venda. i: {qtd,total (com taxas),taxas (incluídas no total)}; s: perfil (ss, iofS, fee, fixed da venda).
export function sellProjection(s,i){
  const k=(1-f(s.ss))*(1-f(s.iofS))*(1-f(s.fee)),avg=i.total/i.qtd;
  return{k,avg,paid:(i.total-i.taxas)/i.qtd,
    be:(i.total+s.fixed)/(i.qtd*k),
    result:x=>i.qtd*x*k-s.fixed-i.total,
    priceFor:L=>(i.total+L+s.fixed)/(i.qtd*k),
    unitsFor:(x,L)=>{const d=x*k-avg;return d>0?(L+s.fixed)/d:null}};
}
// Lê texto colado (extrato, comprovante, mensagem) e extrai moeda, tipo, quantidade, total, taxas, cotação e data.
const NUM='(\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?|\\d+(?:[.,]\\d+)?)';
const N=s=>{if(s==null)return undefined;s=s.trim();s=/,\d{1,8}$/.test(s)?s.replace(/\./g,'').replace(',','.'):/^\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,''):s.replace(/,/g,'');const x=parseFloat(s);return Number.isFinite(x)?x:undefined};
export function parseOp(text,codes){
  const T=text.replace(/\u00a0/g,' '),o={},cd=codes.join('|');
  o.moeda=(T.match(new RegExp('\\b('+cd+')\\b','i'))||[])[1]?.toUpperCase();
  if(/compra|comprei|comprar|adquir/i.test(T))o.tipo='compra';else if(/venda|vendi|vender/i.test(T))o.tipo='venda';
  let m=T.match(/(\d{2})\/(\d{2})\/(\d{4})/);if(m)o.date=`${m[3]}-${m[2]}-${m[1]}`;else if(m=T.match(/\d{4}-\d{2}-\d{2}/))o.date=m[0];
  m=T.match(new RegExp('(?:cota[cç][aã]o|taxa de c[aâ]mbio|c[aâ]mbio|pre[cç]o)[^\\d\\n]{0,20}'+NUM,'i'));
  let rest=T;if(m){o.cotacao=N(m[1]);rest=T.replace(m[0],' ')}
  let sum=0,any=false;for(const x of rest.matchAll(new RegExp('(?:taxas?|tarifas?|iof|spread|impostos?|comiss[aã]o)[^\\d\\n]{0,20}'+NUM,'gi'))){const v=N(x[1]);if(v!=null){sum+=v;any=true}}
  if(any)o.taxas=Math.round(sum*1e8)/1e8;
  m=rest.match(new RegExp('(?:total|pago|pagou|recebido)[^\\d\\n]{0,20}'+NUM,'i'))||rest.match(new RegExp('R\\$\\s*'+NUM,'i'));if(m)o.total=N(m[1]);
  m=rest.match(new RegExp('(?:quantidade|qtd|qtde|comprei|vendi)[^\\d\\n]{0,15}'+NUM,'i'))||rest.match(new RegExp(NUM+'\\s*(?:'+cd+')\\b','i'))||rest.match(new RegExp('\\b(?:'+cd+')\\s*'+NUM,'i'));if(m)o.qtd=N(m[1]);
  if(o.qtd==null&&o.total>0&&o.cotacao>0){o.qtd=(o.total-(o.taxas||0))/o.cotacao;o.qtdCalculada=true}
  return o;
}
