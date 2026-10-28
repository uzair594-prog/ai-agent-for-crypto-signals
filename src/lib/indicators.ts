export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (period < 1 || values.length < period) return out;
  const k = 2 / (period + 1);
  let current = values.slice(0, period).reduce((a,b)=>a+b,0) / period;
  out[period - 1] = current;
  for (let i=period;i<values.length;i++){ current = values[i] * k + current * (1-k); out[i] = current; }
  return out;
}
export function rsi(values: number[], period=14): (number|null)[] {
  const out: (number|null)[] = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain=0, loss=0;
  for(let i=1;i<=period;i++){const d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}
  let avgGain=gain/period, avgLoss=loss/period;
  const calc=()=>avgLoss===0?100:100-(100/(1+avgGain/avgLoss));
  out[period]=calc();
  for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];avgGain=(avgGain*(period-1)+Math.max(d,0))/period;avgLoss=(avgLoss*(period-1)+Math.max(-d,0))/period;out[i]=calc();}
  return out;
}
export function macd(values:number[]): {macd:(number|null)[]; signal:(number|null)[]} {
  const fast=ema(values,12), slow=ema(values,26);
  const line=values.map((_,i)=>fast[i]===null||slow[i]===null?null:(fast[i] as number)-(slow[i] as number));
  const valid=line.map(v=>v??0);
  const sig=ema(valid,9);
  return {macd:line,signal:line.map((v,i)=>v===null||i<33?null:sig[i])};
}
export function atr(candles:Candle[],period=14):(number|null)[] {
  const tr=candles.map((c,i)=>i===0?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-candles[i-1].close),Math.abs(c.low-candles[i-1].close)));
  const out:(number|null)[]=Array(candles.length).fill(null);
  if(candles.length<period)return out;
  let value=tr.slice(0,period).reduce((a,b)=>a+b,0)/period;out[period-1]=value;
  for(let i=period;i<tr.length;i++){value=(value*(period-1)+tr[i])/period;out[i]=value;}
  return out;
}
