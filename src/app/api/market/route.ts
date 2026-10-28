import { NextRequest, NextResponse } from "next/server";
import { getCandles, getTicker } from "@/lib/market";
import { atr, ema, macd, rsi } from "@/lib/indicators";
export const dynamic = "force-dynamic";
export async function GET(req:NextRequest){
  const symbols=(req.nextUrl.searchParams.get("symbols")||"BTCUSDT,ETHUSDT").split(",").slice(0,8).map(s=>s.trim().toUpperCase()).filter(s=>/^[A-Z0-9]{5,16}$/.test(s));
  const interval=req.nextUrl.searchParams.get("interval")||"1h";
  const markets=await Promise.all(symbols.map(async symbol=>{
    const ticker=await getTicker(symbol);
    try{
      const candles=await getCandles(symbol,interval,200);
      const closes=candles.map(c=>c.close);
      const fast=ema(closes,12),slow=ema(closes,26),mom=rsi(closes),m=macd(closes),volatility=atr(candles);
      const last=candles.length-1;
      const freshnessMs=Date.now()-(candles[last]?.time||0);
      const fresh=freshnessMs < (interval==="1d"?172800000:interval==="4h"?28800000:interval==="1h"?7200000:3600000);
      return {...ticker,candleCount:candles.length,interval,lastCandleAt:candles[last]?.time?new Date(candles[last].time).toISOString():null,fresh,indicators:{ema12:fast[last],ema26:slow[last],rsi14:mom[last],macd:m.macd[last],macdSignal:m.signal[last],atr14:volatility[last]},recentCandles:candles.slice(-40)};
    }catch(e){return {...ticker,interval,fresh:false,candleCount:0,indicators:null,recentCandles:[],analysisError:e instanceof Error?e.message:"Analysis unavailable"};}
  }));
  return NextResponse.json({markets,refreshedAt:new Date().toISOString(),mode:"educational-market-context",ordersEnabled:false},{headers:{"Cache-Control":"no-store"}});
}
