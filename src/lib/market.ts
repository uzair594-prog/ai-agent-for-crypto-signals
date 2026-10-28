import type { Candle } from "./indicators";
const BASE = "https://api.mexc.com";
export type MarketQuote = { symbol:string; price:number|null; changePct:number|null; volume:number|null; high:number|null; low:number|null; updatedAt:string; source:string; error?:string };
export async function getTicker(symbol:string):Promise<MarketQuote>{
  const safe=symbol.toUpperCase().replace(/[^A-Z0-9]/g,"");
  try{
    const res=await fetch(`${BASE}/api/v3/ticker/24hr?symbol=${encodeURIComponent(safe)}`,{cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!res.ok)throw new Error(`Exchange HTTP ${res.status}`);
    const d=await res.json();
    return {symbol:safe,price:Number(d.lastPrice),changePct:Number(d.priceChangePercent),volume:Number(d.volume),high:Number(d.highPrice),low:Number(d.lowPrice),updatedAt:new Date(Number(d.closeTime)||Date.now()).toISOString(),source:"MEXC public spot API"};
  }catch(e){return {symbol:safe,price:null,changePct:null,volume:null,high:null,low:null,updatedAt:new Date().toISOString(),source:"MEXC public spot API",error:e instanceof Error?e.message:"Market data unavailable"};}
}
export async function getCandles(symbol:string,interval="1h",limit=200):Promise<Candle[]>{
  const safe=symbol.toUpperCase().replace(/[^A-Z0-9]/g,"");
  const allowed=["1m","5m","15m","30m","1h","4h","1d","1w"];
  if(!allowed.includes(interval))throw new Error("Unsupported interval");
  // MEXC spot klines uses 60m for hourly candles (not 1h). Keep app-facing intervals human-readable.
  const exchangeInterval:Record<string,string>={"1h":"60m","1w":"1W"};
  const apiInterval=exchangeInterval[interval]||interval;
  const res=await fetch(`${BASE}/api/v3/klines?symbol=${encodeURIComponent(safe)}&interval=${encodeURIComponent(apiInterval)}&limit=${Math.min(500,Math.max(50,limit))}`,{cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw new Error(`Candle API HTTP ${res.status}`);
  const raw=await res.json();
  if(!Array.isArray(raw))throw new Error("Unexpected candle response");
  return raw.map((row: unknown) => {
    if (!Array.isArray(row)) return null;
    const values = row as unknown[];
    return { time: Number(values[0]), open: Number(values[1]), high: Number(values[2]), low: Number(values[3]), close: Number(values[4]), volume: Number(values[5]) } satisfies Candle;
  }).filter((c): c is Candle => c !== null && Number.isFinite(c.close) && c.close > 0);
}
