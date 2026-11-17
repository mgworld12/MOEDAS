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
