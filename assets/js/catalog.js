// Esquemas: x e y de 0 a 1 (y maior = preço maior). Linhas tracejadas = [x1,y1,x2,y2]. 'c' = candles [abertura,máx,mín,fechamento].
const F=(nome,fam,dir,ctx,pts,lines=[],auto=false)=>({nome,fam,dir,ctx,pts,lines,auto});
const M=(f,nome,dir,ctx,auto=false)=>F(nome,f.fam,dir,ctx,f.pts.map(([x,y])=>[x,1-y]),f.lines.map(([a,b,c,d])=>[a,1-b,c,1-d]),auto);
const C=(nome,dir,ctx,c,auto=false)=>({nome,fam:'Candles',dir,ctx,c,pts:[],lines:[],auto});
const OCO=F('Ombro-cabeça-ombro','Reversão','baixa','Após uma alta, três topos com o central mais alto. Fechamento abaixo da linha de pescoço sugere reversão para baixa.',[[0,.2],[.15,.55],[.3,.35],[.5,.85],[.7,.35],[.85,.55],[1,.2]],[[.3,.35,1,.35]],true);
const TD=F('Topo duplo','Reversão','baixa','Dois topos no mesmo nível após uma alta. Fechamento abaixo do vale entre eles confirma a reversão.',[[0,.2],[.25,.8],[.5,.45],[.75,.8],[1,.2]],[[.25,.45,1,.45]],true);
const TT=F('Topo triplo','Reversão','baixa','Três topos no mesmo nível: a resistência foi testada três vezes. Rompimento do suporte confirma a reversão.',[[0,.2],[.15,.75],[.3,.45],[.5,.75],[.7,.45],[.85,.75],[1,.2]],[[.3,.45,1,.45]]);
const TA=F('Triângulo ascendente','Triângulos','alta','Resistência horizontal e fundos cada vez mais altos. Rompimento da resistência costuma indicar alta.',[[0,.3],[.15,.8],[.3,.45],[.45,.8],[.6,.6],[.75,.8],[.88,.72],[1,.95]],[[0,.8,.85,.8],[0,.3,.88,.72]],true);
const BA=F('Bandeira de alta','Continuidade','alta','Alta forte (mastro) seguida de pequena correção inclinada. Rompimento para cima retoma a alta.',[[0,.1],[.3,.8],[.45,.65],[.55,.72],[.7,.58],[.8,.65],[1,.98]],[[.3,.82,.8,.66],[.3,.62,.8,.46]]);
const CA=F('Cunha ascendente','Cunhas','baixa','Máximas e mínimas sobem, mas o canal se estreita. O desfecho comum é rompimento para baixo.',[[0,.2],[.15,.5],[.25,.4],[.45,.7],[.55,.6],[.75,.85],[.85,.75],[1,.3]],[[0,.2,.85,.75],[.15,.5,.8,.88]]);
const CH=F('Canal de alta','Canais e consolidação','alta','Preço sobe entre duas linhas paralelas inclinadas. Atenção ao rompimento da linha inferior.',[[0,.1],[.2,.4],[.3,.3],[.5,.6],[.6,.5],[.8,.8],[.9,.7],[1,.9]],[[0,.05,1,.7],[0,.35,1,1]],true);
export const FIGURAS=[
  OCO,M(OCO,'Ombro-cabeça-ombro invertido','alta','Após uma queda, três fundos com o central mais profundo. Fechamento acima da linha de pescoço sugere reversão para alta.',true),
  TD,M(TD,'Fundo duplo','alta','Dois fundos no mesmo nível após uma queda. Fechamento acima do topo entre eles confirma a reversão.',true),
  TT,M(TT,'Fundo triplo','alta','Três fundos no mesmo nível: o suporte foi testado três vezes. Rompimento da resistência confirma a reversão.'),
  TA,M(TA,'Triângulo descendente','baixa','Suporte horizontal e topos cada vez mais baixos. Rompimento do suporte costuma indicar baixa.',true),
  F('Triângulo simétrico','Triângulos','neutro','Topos descendentes e fundos ascendentes convergem. A direção só fica definida no rompimento.',[[0,.2],[.15,.85],[.3,.3],[.5,.75],[.65,.4],[.8,.65],[1,.9]],[[0,.9,.8,.6],[0,.2,.8,.5]],true),
  BA,M(BA,'Bandeira de baixa','baixa','Queda forte (mastro) seguida de pequena correção inclinada para cima. Rompimento para baixo retoma a queda.'),
  F('Flâmula','Continuidade','neutro','Movimento forte seguido de consolidação em triângulo pequeno. Costuma continuar a tendência anterior.',[[0,.1],[.3,.8],[.45,.6],[.55,.76],[.65,.66],[.75,.72],[1,.98]],[[.3,.8,.78,.7],[.3,.5,.78,.7]]),
  CA,M(CA,'Cunha descendente','alta','Máximas e mínimas caem, mas o canal se estreita. O desfecho comum é rompimento para cima.'),
  CH,M(CH,'Canal de baixa','baixa','Preço cai entre duas linhas paralelas inclinadas. Atenção ao rompimento da linha superior.',true),
  F('Canal lateral','Canais e consolidação','neutro','Preço oscila entre suporte e resistência horizontais, sem tendência definida.',[[0,.3],[.2,.7],[.4,.3],[.6,.7],[.8,.3],[1,.7]],[[0,.75,1,.75],[0,.25,1,.25]],true),
  F('Retângulo','Canais e consolidação','neutro','Consolidação entre suporte e resistência; costuma terminar em rompimento na direção da tendência anterior.',[[0,.2],[.1,.7],[.3,.3],[.5,.7],[.7,.3],[.85,.7],[1,.95]],[[0,.72,.9,.72],[0,.28,.9,.28]]),
  F('Xícara com alça','Formação especial','alta','Fundo arredondado em U seguido de pequena correção (alça). Rompimento da borda da xícara sugere alta.',[[0,.8],[.1,.6],[.25,.35],[.4,.25],[.55,.3],[.7,.55],[.8,.8],[.87,.68],[.94,.64],[1,.9]],[[0,.8,.8,.8]]),
  C('Martelo','alta','Corpo pequeno no topo e sombra inferior longa após queda: vendedores perderam força.',[[.9,.92,.72,.74],[.75,.77,.58,.6],[.55,.64,.1,.62]],true),
  C('Martelo invertido','alta','Corpo pequeno embaixo e sombra superior longa após queda; precisa de confirmação no candle seguinte.',[[.9,.92,.72,.74],[.75,.77,.58,.6],[.5,.92,.46,.58]]),
  C('Estrela cadente','baixa','Corpo pequeno embaixo e sombra superior longa após alta: compradores perderam força.',[[.3,.52,.28,.5],[.5,.72,.48,.7],[.66,.98,.62,.7]],true),
  C('Engolfo de alta','alta','Candle de alta cobre o corpo do candle de baixa anterior, após queda.',[[.9,.92,.72,.74],[.7,.72,.5,.52],[.48,.78,.46,.74]],true),
  C('Engolfo de baixa','baixa','Candle de baixa cobre o corpo do candle de alta anterior, após alta.',[[.3,.5,.28,.48],[.48,.7,.46,.68],[.72,.74,.4,.42]],true),
  C('Doji','neutro','Abertura e fechamento quase iguais: indecisão. O contexto e o candle seguinte dão a leitura.',[[.4,.6,.38,.58],[.58,.62,.4,.6],[.5,.8,.2,.51]],true),
  C('Estrela da manhã','alta','Três candles: queda, pequeno corpo com gap e alta forte. Sinal de reversão para alta.',[[.9,.92,.5,.52],[.4,.45,.3,.35],[.5,.9,.48,.85]]),
  C('Estrela da noite','baixa','Três candles: alta, pequeno corpo com gap e queda forte. Sinal de reversão para baixa.',[[.5,.9,.48,.85],[.9,.97,.86,.92],[.88,.9,.45,.5]])
];
export function svg(f){
  const X=x=>4+x*92,Y=y=>4+(1-y)*52;let s='';
  if(f.c){const w=84/f.c.length;f.c.forEach(([o,h,l,c],i)=>{const cx=8+i*w+w/2,col=c>=o?'var(--up)':'var(--dn)';s+=`<line x1="${cx}" x2="${cx}" y1="${Y(h)}" y2="${Y(l)}" stroke="${col}" stroke-width="2"/><rect x="${cx-7}" y="${Y(Math.max(o,c))}" width="14" height="${Math.max(2,Math.abs(Y(o)-Y(c)))}" fill="${col}"/>`})}
  else s+=f.lines.map(([a,b,c,d])=>`<line x1="${X(a)}" y1="${Y(b)}" x2="${X(c)}" y2="${Y(d)}" stroke="var(--mut)" stroke-dasharray="3 3"/>`).join('')+`<polyline points="${f.pts.map(([x,y])=>X(x)+','+Y(y)).join(' ')}" fill="none" stroke="var(--ac)" stroke-width="2.2" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 100 60" width="100%" height="70" role="img" aria-label="Esquema: ${f.nome}">${s}</svg>`;
}
// Modelo da figura ajustado às últimas w barras (faixa de preço dessas barras).
export function template(f,P,w=45){
  const n=P.length,w2=Math.min(w,n),seg=P.slice(n-w2),lo=Math.min(...seg.map(p=>p.l)),hi=Math.max(...seg.map(p=>p.h)),pad=(hi-lo)*.05;
  const X=x=>seg[Math.round(x*(w2-1))].t,Y=y=>lo+pad+y*(hi-lo-2*pad);
  return{key:'tpl|'+f.nome,nome:f.nome,dir:f.dir,estado:'Modelo sobre o gráfico',ident:P[n-1].t,pts:f.pts.map(([x,y])=>({t:X(x),p:Y(y)})),lines:f.lines.map(([a,b,c,d])=>({t1:X(a),p1:Y(b),t2:X(c),p2:Y(d)})),q:null,crit:[f.ctx,'Modelo ilustrativo: arraste e ajuste a transparência para compará-lo com o preço. Não é uma detecção.'],conf:null,inval:null,single:false};
}
