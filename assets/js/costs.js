// Percentuais em %, tarifa fixa na moeda de cotação. VALORES DE EXEMPLO: confirme IOF, tarifas e spread da sua instituição.
export const PROFILES={
  ref:{nome:'Sem custos (referência)',bs:0,ss:0,iofB:0,iofS:0,fee:0,fixed:0},
  especie:{nome:'Espécie / casa de câmbio',bs:3,ss:3,iofB:3.5,iofS:0.38,fee:0,fixed:0},
  remessa:{nome:'Remessa internacional',bs:0.6,ss:0.6,iofB:3.5,iofS:0.38,fee:0.5,fixed:0},
  cartao:{nome:'Cartão internacional / conta global',bs:1.5,ss:1.5,iofB:3.5,iofS:0.38,fee:0,fixed:0},
  custom:{nome:'Personalizado',bs:1,ss:1,iofB:0,iofS:0,fee:0,fixed:0}
};
const f=x=>x/100;
// Compra com A (moeda de cotação) a 'ref' e vende depois; devolve o preço de referência de saída que zera o resultado.
export function roundTrip(p,ref,A){
  const buyPrice=ref*(1+f(p.bs));
  const units=Math.max(0,(A-p.fixed)/(1+f(p.iofB))/(1+f(p.fee))/buyPrice);
  const sellK=(1-f(p.ss))*(1-f(p.iofS))*(1-f(p.fee));
  const proceeds=x=>units*x*sellK-p.fixed;
  const bePrice=(A+p.fixed)/(units*sellK);
  return{buyPrice,units,proceeds,bePrice,breakEvenPct:(bePrice/ref-1)*100};
}
// Conversão em um sentido: buying=true quando se paga em BRL para obter moeda estrangeira.
export function convertNet(p,A,ref,buying){
  const received=buying?(A-p.fixed)*ref/(1+f(p.bs))/(1+f(p.iofB))/(1+f(p.fee)):A*ref*(1-f(p.ss))*(1-f(p.iofS))*(1-f(p.fee))-p.fixed;
  const refAmount=A*ref;return{received,refAmount,costPct:(1-received/refAmount)*100,effRate:received/A};
}
const erf=x=>{const t=1/(1+0.3275911*Math.abs(x)),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y};
// Chance (modelo normal sem tendência) de o movimento superar o ponto de equilíbrio; sigma em %.
export const probExceed=(be,sigma)=>0.5*(1-erf(be/sigma/Math.SQRT2));
