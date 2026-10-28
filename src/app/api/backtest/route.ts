import { NextRequest, NextResponse } from "next/server";
import { getCandles } from "@/lib/market";
import { ema } from "@/lib/indicators";
export const dynamic = "force-dynamic";
// Educational spot-only EMA crossover simulation; never emits a current trade instruction.
export async function GET(req:NextRequest){
 const symbol=(req.nextUrl.searchParams.get("symbol")||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
 const interval=req.nextUrl.searchParams.get("interval")||"1h";
 try{
  const candles=await getCandles(symbol,interval,500);
  const closes=candles.map(c=>c.close),fast=ema(closes,12),slow=ema(closes,26);
  const feeBps=10,slippageBps=5,roundTripCost=(feeBps+slippageBps)*2/10000;
  let cash=10000,units=0,entry=0,trades=0,wins=0,peak=10000,maxDrawdown=0;
  const equity:number[]=[];
  for(let i=1;i<candles.length;i++){
   // Avoid look-ahead: yesterday's completed indicators drive today's simulated fill.
   const prevFast=fast[i-1],prevSlow=slow[i-1],nowFast=fast[i],nowSlow=slow[i];
   if(prevFast===null||prevSlow===null||nowFast===null||nowSlow===null){equity.push(cash+units*closes[i]);continue;}
   const crossUp=prevFast<=prevSlow&&nowFast>nowSlow;
   const crossDown=prevFast>=prevSlow&&nowFast<nowSlow;
   if(units===0&&crossUp){entry=closes[i]*(1+slippageBps/10000);units=cash*(1-feeBps/10000)/entry;cash=0;trades++;}
   else if(units>0&&crossDown){const exit=closes[i]*(1-slippageBps/10000);const proceeds=units*exit*(1-feeBps/10000);if(proceeds>units*entry)wins++;cash=proceeds;units=0;}
   const value=cash+units*closes[i];equity.push(value);peak=Math.max(peak,value);maxDrawdown=Math.max(maxDrawdown,(peak-value)/peak);
  }
  const finalValue=cash+units*(closes.at(-1)||0);
  return NextResponse.json({symbol,interval,method:"EMA 12/26 crossover · long-only spot simulation",initialCapital:10000,finalEquity:finalValue,returnPct:(finalValue/10000-1)*100,closedTrades:wins+Math.max(0,trades-(units>0?1:0)),winningClosedTrades:wins,winRatePct:wins+Math.max(0,trades-(units>0?1:0))?wins/(wins+Math.max(0,trades-(units>0?1:0)))*100:null,maxDrawdownPct:maxDrawdown*100,assumedFeeBps:feeBps,assumedSlippageBps:slippageBps,candles:candles.length,from:candles[0]?new Date(candles[0].time).toISOString():null,to:candles.at(-1)?new Date(candles.at(-1)!.time).toISOString():null,openPositionAtEnd:units>0,disclaimer:"Historical educational simulation only. Fees/slippage are assumptions; results are not predictive and do not include funding, taxes, latency or survivorship effects.",ordersEnabled:false},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Backtest failed",ordersEnabled:false},{status:502});}
}
