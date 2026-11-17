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
  trendPatterns(P,out);
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

// Triângulos e canais: linhas pelos pivôs mais recentes (topos e fundos), com desvio máximo de 0,6% e ao menos 5 toques.
function trendPatterns(P,out){
  const end=P.length-1,from=end-90,H=pivots(P,1).filter(i=>i>=from),Lw=pivots(P,-1).filter(i=>i>=from);
  const fit=(idx,f)=>{const a=idx[0],b=idx[idx.length-1],m=(f(b)-f(a))/(b-a);let dev=0;for(const i of idx)dev=Math.max(dev,Math.abs(f(i)-(f(a)+m*(i-a)))/f(i));return dev<=.006?{a,m,y:f(a),dev}:null};
  for(const [nh,nl] of [[4,4],[4,3],[3,4],[3,3],[4,2],[2,4],[3,2],[2,3]]){
    if(H.length<nh||Lw.length<nl)continue;
    const hi=H.slice(-nh),lo=Lw.slice(-nl),uh=fit(hi,i=>P[i].h),ul=fit(lo,i=>P[i].l);if(!uh||!ul)continue;
    const st=Math.min(hi[0],lo[0]),ie=Math.max(hi[nh-1],lo[nl-1]);if(ie-st<15)continue;
    const U=i=>uh.y+uh.m*(i-uh.a),Dn=i=>ul.y+ul.m*(i-ul.a),w0=U(st)-Dn(st),w1=U(ie)-Dn(ie);if(!(w0>0&&w1>0))continue;
    const av=(U(st)+Dn(st)+U(ie)+Dn(ie))/4,dh=uh.m*(ie-st)/av,dl=ul.m*(ie-st)/av,ratio=w1/w0,fl=d=>Math.abs(d)<.015;let c=null;
    if(ratio<.75){if(fl(dh)&&dl>.015)c=['Triângulo ascendente','alta'];else if(fl(dl)&&dh<-.015)c=['Triângulo descendente','baixa'];else if(dh<-.015&&dl>.015)c=['Triângulo simétrico','neutro']}
    else if(ratio>.85&&ratio<1.15&&Math.abs(dh-dl)<.012){if(dh>.02)c=['Canal de alta','alta'];else if(dh<-.02)c=['Canal de baixa','baixa'];else if(fl(dh)&&fl(dl))c=['Canal lateral','neutro']}
    if(!c)continue;
    const [nome,dir0]=c,tri=nome.startsWith('Tri'),id=ie+K;let ev=null;
    for(let i=id+1;i<=end&&!ev;i++){if(P[i].c>U(i)*1.002)ev='up';else if(P[i].c<Dn(i)*.998)ev='dn'}
    let estado=tri?'Confirmação pendente':'Identificada',dir=dir0;
    if(ev){if(!tri)estado='Invalidada';else if(nome.endsWith('simétrico')){estado='Confirmada';dir=ev==='up'?'alta':'baixa'}else estado=(ev==='up')===(dir0==='alta')?'Confirmada':'Invalidada'}
    const f4=x=>x.toFixed(4),dev=Math.max(uh.dev,ul.dev),touches=nh+nl;
    const pts=[...hi.map(i=>({i,p:P[i].h})),...lo.map(i=>({i,p:P[i].l}))].sort((x,y)=>x.i-y.i).map(({i,p})=>({t:P[i].t,p}));
    out.push(mk(nome,dir,estado,P,id,pts,[{t:P[st].t,p1:U(st),t2:P[end].t,p2:U(end)},{t:P[st].t,p1:Dn(st),t2:P[end].t,p2:Dn(end)}],
      Math.round(100*(.5*clamp(touches/8)+.5*clamp(1-dev/.006))),
      [`Toques: ${nh} nos topos e ${nl} nos fundos`,`Desvio máximo das linhas: ${(dev*100).toFixed(2)}% (máx. 0,6%)`,`Duração: ${ie-st} barras`,tri?`Estreitamento: largura final = ${(ratio*100).toFixed(0)}% da inicial`:`Linhas paralelas: largura final = ${(ratio*100).toFixed(0)}% da inicial`],
      tri?{p:U(end),txt:nome.endsWith('descendente')?`Fechamento abaixo de ${f4(Dn(end))}`:nome.endsWith('ascendente')?`Fechamento acima de ${f4(U(end))}`:`Fechamento acima de ${f4(U(end))} ou abaixo de ${f4(Dn(end))}`}:{p:U(end),txt:`Linha superior em ${f4(U(end))}; inferior em ${f4(Dn(end))}`},
      tri?{p:Dn(end),txt:nome.endsWith('descendente')?`Fechamento acima de ${f4(U(end))}`:nome.endsWith('ascendente')?`Fechamento abaixo de ${f4(Dn(end))}`:'Rompimento falso, com retorno ao interior do triângulo'}:{p:Dn(end),txt:'Fechamento fora das linhas do canal'}));
    return;
  }
}
