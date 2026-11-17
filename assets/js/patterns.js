// Padrões detectados só com barras já fechadas; 'ident' = barra em que o pivô final ficou confirmado (sem olhar o futuro).
const K=4,hv=(p,s)=>s>0?p.h:-p.l,lv=(p,s)=>s>0?p.l:-p.h;
function pivots(P,s){const o=[];for(let i=K;i<P.length-K;i++){const v=hv(P[i],s);let ok=true;for(let j=i-K;j<=i+K;j++)if(j!==i&&hv(P[j],s)>v){ok=false;break}if(ok)o.push(i)}return o}
const clamp=x=>Math.max(0,Math.min(1,x));
export function detect(P,ohlc=true){
  const out=[],end=P.length-1;
  for(const s of [1,-1]){
    const top=s>0,pv=pivots(P,s),pr=i=>s*hv(P[i],s),tr=i=>s*lv(P[i],s);
    const low=(a,b)=>{let m=a;for(let i=a;i<=b;i++)if(lv(P[i],s)<lv(P[m],s))m=i;return m};
    const after=(from,f)=>{for(let i=from+1;i<=end;i++){const r=f(i);if(r)return r}return null};
    for(let n=1;n<pv.length;n++){ // topo/fundo duplo
      const a=pv[n-1],b=pv[n],m=low(a,b),pm=lv(P[m],s),pa=hv(P[a],s),pb=hv(P[b],s);
      const diff=Math.abs(pa-pb)/Math.abs(pa),depth=(Math.min(pa,pb)-pm)/Math.abs(pa);
      if(b-a<8||diff>.015||depth<.015)continue;
      const id=b+K,conf=after(id,i=>s*P[i].c<pm?'Confirmada':null),inv=after(id,i=>s*P[i].c>Math.max(pa,pb)+Math.abs(pa)*.003?'Invalidada':null);
      out.push(mk(top?'Topo duplo':'Fundo duplo',top?'baixa':'alta',inv&&!conf?inv:conf||'Confirmação pendente',P,id,[a,m,b].map((i,j)=>({t:P[i].t,p:j==1?tr(i):pr(i)})),[{t:P[a].t,p1:tr(m),t2:P[end].t,p2:tr(m)}],
        Math.round(100*(.5*clamp(1-diff/.015)+.5*clamp(depth/.04))),[`Diferença entre os ${top?'topos':'fundos'}: ${(diff*100).toFixed(2)}% (máx. 1,5%)`,`Profundidade: ${(depth*100).toFixed(1)}%`,`Separação: ${b-a} barras`],
        {p:tr(m),txt:`Fechamento ${top?'abaixo':'acima'} de ${tr(m).toFixed(4)}`},{p:Math.max(pa,pb)*s,txt:`Fechamento ${top?'acima':'abaixo'} de ${(Math.max(pa,pb)*s).toFixed(4)}`}));
    }
    for(let n=2;n<pv.length;n++){ // ombro-cabeça-ombro (invertido)
      const [a,b,c]=[pv[n-2],pv[n-1],pv[n]],m1=low(a,b),m2=low(b,c),ha=hv(P[a],s),hb=hv(P[b],s),hc=hv(P[c],s);
      const head=(hb-Math.max(ha,hc))/Math.abs(hb),sym=Math.abs(ha-hc)/Math.abs(ha);
      if(head<.02||sym>.03||b-a<5||c-b<5)continue;
      const n1=lv(P[m1],s),n2=lv(P[m2],s),line=i=>n1+(n2-n1)*(i-m1)/(m2-m1),id=c+K;
      const conf=after(id,i=>s*P[i].c<line(i)?'Confirmada':null),inv=after(id,i=>s*P[i].c>hb?'Invalidada':null);
      out.push(mk(top?'Ombro-cabeça-ombro':'Ombro-cabeça-ombro invertido',top?'baixa':'alta',inv&&!conf?inv:conf||'Confirmação pendente',P,id,[a,m1,b,m2,c].map((i,j)=>({t:P[i].t,p:j%2?tr(i):pr(i)})),[{t:P[m1].t,p1:s*n1,t2:P[end].t,p2:s*line(end)}],
        Math.round(100*(.5*clamp(1-sym/.03)+.5*clamp(head/.06))),[`Simetria dos ombros: diferença de ${(sym*100).toFixed(2)}% (máx. 3%)`,`Cabeça acima dos ombros em ${(head*100).toFixed(1)}%`],
        {p:s*line(end),txt:'Fechamento rompendo a linha de pescoço'},{p:s*hb,txt:`Fechamento além da cabeça (${(s*hb).toFixed(4)})`}));
    }
  }
  if(ohlc)for(let i=Math.max(6,P.length-90);i<P.length;i++){ // candles (barra fechada)
    const c=P[i],pv=P[i-1],body=Math.abs(c.c-c.o),rg=c.h-c.l,lo=Math.min(c.o,c.c)-c.l,up=c.h-Math.max(c.o,c.c),dn=c.c<P[i-5].c,upT=c.c>P[i-5].c;
    const add=(n,d,why)=>out.push(mk(n,d,'Identificada',P,i,[{t:c.t,p:d==='alta'?c.l:c.h}],[],null,[why],null,null,true));
    if(rg<=0)continue;
    if(body<=.1*rg)add('Doji','neutro','Corpo ≤ 10% da amplitude');
    else if(dn&&lo>=2*body&&up<=.3*body)add('Martelo','alta','Sombra inferior ≥ 2× o corpo após queda');
    else if(upT&&up>=2*body&&lo<=.3*body)add('Estrela cadente','baixa','Sombra superior ≥ 2× o corpo após alta');
    if(dn&&pv.c<pv.o&&c.c>c.o&&c.o<=pv.c&&c.c>=pv.o&&body>Math.abs(pv.c-pv.o))add('Engolfo de alta','alta','Corpo altista engolfa o baixista anterior');
    if(upT&&pv.c>pv.o&&c.c<c.o&&c.o>=pv.c&&c.c<=pv.o&&body>Math.abs(pv.c-pv.o))add('Engolfo de baixa','baixa','Corpo baixista engolfa o altista anterior');
  }
  return out;
}
function mk(nome,dir,estado,P,id,pts,lines,q,crit,conf,inval,single=false){
  return{key:`${nome}|${P[id].t}`,nome,dir,estado,ident:P[id].t,pts,lines:lines.map(l=>({t1:l.t,p1:l.p1,t2:l.t2,p2:l.p2})),q,crit,conf,inval,single};
}
