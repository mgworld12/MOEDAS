export function sma(a,n){return a.map((_,i)=>i<n-1?null:a.slice(i-n+1,i+1).reduce((s,x)=>s+x,0)/n)}
export function ema(a,n){
  const k=2/(n+1),o=Array(a.length).fill(null),st=a.findIndex(x=>x!=null);
  if(st<0||a.length-st<n)return o;
  let e=0;for(let i=st;i<st+n;i++)e+=a[i];e/=n;o[st+n-1]=e;
  for(let i=st+n;i<a.length;i++){e=a[i]*k+e*(1-k);o[i]=e}return o;
}
export function rsi(a,n=14){
  const o=Array(a.length).fill(null);if(a.length<=n)return o;
  let g=0,l=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];d>0?g+=d:l-=d}g/=n;l/=n;
  const f=()=>l===0?100:100-100/(1+g/l);o[n]=f();
  for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;o[i]=f()}return o;
}
export function macd(a,f=12,s=26,g=9){
  const e1=ema(a,f),e2=ema(a,s),line=a.map((_,i)=>e1[i]==null||e2[i]==null?null:e1[i]-e2[i]),sig=ema(line,g);
  return{line,signal:sig,hist:line.map((x,i)=>x==null||sig[i]==null?null:x-sig[i])};
}
export function bollinger(a,n=20,k=2){
  return a.map((_,i)=>{if(i<n-1)return null;const w=a.slice(i-n+1,i+1),m=w.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(w.reduce((s,x)=>s+(x-m)**2,0)/n);return{up:m+k*sd,mid:m,low:m-k*sd}});
}
export function dailyVol(a,n=60){
  const r=[];for(let i=Math.max(1,a.length-n);i<a.length;i++)r.push(Math.log(a[i]/a[i-1]));
  const m=r.reduce((s,x)=>s+x,0)/r.length;return Math.sqrt(r.reduce((s,x)=>s+(x-m)**2,0)/(r.length-1));
}
