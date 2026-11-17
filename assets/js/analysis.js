import {sma,rsi,macd,bollinger,dailyVol} from './indicators.js';
import {roundTrip,probExceed} from './costs.js';
export const HORIZONS=[2,7,15,30];
const last=a=>a[a.length-1];
export function analyze(points,profile,amount=10000){
  const c=points.map(p=>p.c);
  if(c.length<60)return{error:`Dados insuficientes: são necessários ao menos 60 pontos diários (há ${c.length}). Escolha um período maior.`};
  const px=last(c),s20=last(sma(c,20)),s50=last(sma(c,50)),r=last(rsi(c,14)),mh=last(macd(c).hist),b=last(bollinger(c,20,2)),pb=(px-b.low)/(b.up-b.low);
  const signals=[
    {n:'Tendência (SMA20 × SMA50)',txt:`${s20.toFixed(4)} × ${s50.toFixed(4)}`,v:s20>s50?1:-1},
    {n:'Preço × SMA50',txt:`${px.toFixed(4)} × ${s50.toFixed(4)}`,v:px>s50?1:-1},
    {n:'MACD (histograma)',txt:mh.toFixed(5),v:mh>0?1:-1},
    {n:'RSI(14)',txt:r.toFixed(1),v:r<30?1:r>70?-1:0},
    {n:'Bollinger (%B)',txt:(pb*100).toFixed(0)+'%',v:pb<.15?1:pb>.85?-1:0}
  ];
  const score=signals.reduce((s,x)=>s+x.v,0)/signals.length;
  const vol=dailyVol(c,60),be=roundTrip(profile,px,amount).breakEvenPct;
  const rows=HORIZONS.map(h=>{
    const sigma=vol*Math.sqrt(h)*100,prob=probExceed(be,sigma);
    const verdict=prob<0.25?'Aguardar — custos pesam mais que o movimento típico':score>=0.4?'Possível compra':score<=-0.4?'Possível venda':'Aguardar — sinais mistos';
    return{h,sigma,prob,verdict};
  });
  return{signals,score,be,vol:vol*100,rows,px};
}
