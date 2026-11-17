export const CURRENCIES={BRL:'Real brasileiro',USD:'Dólar americano',EUR:'Euro',GBP:'Libra esterlina',CHF:'Franco suíço',JPY:'Iene japonês',CAD:'Dólar canadense',AUD:'Dólar australiano',ARS:'Peso argentino',MXN:'Peso mexicano',CNY:'Yuan chinês'};
export const FAVORITES=[['USD','BRL'],['EUR','BRL'],['GBP','BRL'],['EUR','USD'],['USD','JPY'],['CHF','BRL'],['CAD','BRL'],['AUD','BRL']];
export const PERIODS=[[90,'90 dias'],[180,'180 dias'],[365,'12 meses'],[1825,'5 anos']];
export const SYM={BRL:'R$',USD:'$',EUR:'€',GBP:'£',CHF:'Fr',JPY:'¥',CAD:'C$',AUD:'A$',ARS:'$',MXN:'$',CNY:'¥'};
const COL={BRL:'#1f8a4c',USD:'#4a7c59',EUR:'#2b4fa3',GBP:'#7a2a5e',CHF:'#c0392b',JPY:'#a8324a',CAD:'#b5442f',AUD:'#1d5fa8',ARS:'#3a8fc4',MXN:'#8a6d2f',CNY:'#c4452d'};
export const badge=c=>`<span class="bd" style="background:${COL[c]||'#556'}" title="${CURRENCIES[c]||c}">${SYM[c]||c}</span>`;
