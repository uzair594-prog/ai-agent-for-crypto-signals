"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
type Market={symbol:string;price:number|null;changePct:number|null;volume:number|null;high:number|null;low:number|null;updatedAt:string;source:string;error?:string;fresh?:boolean;candleCount?:number;interval?:string;lastCandleAt?:string|null;indicators?:{ema12:number|null;ema26:number|null;rsi14:number|null;macd:number|null;macdSignal:number|null;atr14:number|null}|null;recentCandles:{time:number;open:number;high:number;low:number;close:number;volume:number}[];analysisError?:string};
type Payload={markets:Market[];refreshedAt:string;mode:string;ordersEnabled:boolean};
const fmt=(n:number|null|undefined)=>n==null||!Number.isFinite(n)?"—":n.toLocaleString("en-US",{maximumFractionDigits:n>100?2:6});
export default function Home(){
 const [payload,setPayload]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[symbol,setSymbol]=useState("BTCUSDT"),[interval,setInterval]=useState("1h"),[tab,setTab]=useState("Overview");
 const load=useCallback(async()=>{try{setError("");const r=await fetch(`/api/market?symbols=${encodeURIComponent("BTCUSDT,ETHUSDT,SOLUSDT")}&interval=${interval}`,{cache:"no-store"});if(!r.ok)throw new Error("Market endpoint unavailable");setPayload(await r.json());}catch(e){setError(e instanceof Error?e.message:"Unable to load market data");}finally{setLoading(false);}},[interval]);
 useEffect(()=>{
  void load();
  const symbols=["BTCUSDT","ETHUSDT","SOLUSDT"];
  let socket:WebSocket|null=null, retry:number|undefined, closed=false;
  const connect=()=>{
   if(closed)return;
   socket=new WebSocket("wss://wbs.mexc.com/ws");
   socket.onopen=()=>socket?.send(JSON.stringify({method:"SUBSCRIPTION",params:symbols.map(s=>"spot@public.deals.v3.api@"+s),id:Date.now()}));
   socket.onmessage=(event)=>{
    try{
     const msg=JSON.parse(String(event.data));
     const channel=String(msg.c||"");
     const symbol=channel.split("@").at(-1);
     const deals=msg.d?.deals;
     if(!symbol||!Array.isArray(deals)||!deals.length)return;
     const latest=deals[deals.length-1], price=Number(latest.p);
     if(!Number.isFinite(price)||price<=0)return;
     setPayload(prev=>prev?({...prev,refreshedAt:new Date().toISOString(),mode:"live-websocket",markets:prev.markets.map(m=>m.symbol===symbol?({...m,price,updatedAt:new Date().toISOString(),source:"MEXC WebSocket live trades",fresh:true}):m)}):prev);
    }catch{/* Ignore malformed exchange frames; REST refresh remains the fallback. */}
   };
   socket.onclose=()=>{if(!closed)retry=window.setTimeout(connect,2500)};
   socket.onerror=()=>socket?.close();
  };
  connect();
  const refresh=window.setInterval(()=>void load(),30000);
  return()=>{closed=true;window.clearInterval(refresh);if(retry)window.clearTimeout(retry);socket?.close();};
 },[load]);
 const market=payload?.markets.find(m=>m.symbol===symbol)||payload?.markets[0];
 const stats=useMemo(()=>{const rows=market?.recentCandles||[];if(rows.length<3)return null;const start=rows[0].close,end=rows[rows.length-1].close;return {bars:rows.length,change:(end/start-1)*100,high:Math.max(...rows.map(c=>c.high)),low:Math.min(...rows.map(c=>c.low))};},[market]);
 const chart=market?.recentCandles||[];
 return <main className="shell">
  <aside className="sidebar"><a className="brand" href="#"><span className="brand-icon">◈</span><span>MARKET<span className="brand-muted">/INTEL</span><small>RESEARCH TERMINAL</small></span></a><div className="side-label">WORKSPACE</div>{["Overview","Backtesting","News & sentiment","History & analytics"].map((t,i)=><button key={t} className={tab===t?"nav-item active":"nav-item"} onClick={()=>{if(t==="Backtesting")window.location.href="/backtesting";else if(t==="News & sentiment")window.location.href="/news";else setTab(t)}}><span>{["▦","⌁","◉","▤"][i]}</span>{t}</button>)}<div className="side-bottom"><span className="status-dot"/> READ-ONLY MODE <small>Order execution disabled</small></div></aside>
  <section className="content"><header className="topbar"><div><span className="eyebrow">MARKET INTELLIGENCE / LIVE DATA</span><h1>{tab}</h1></div><div className="top-actions"><span className="live-pill"><i/> LIVE WEBSOCKET</span><button className="refresh" onClick={()=>void load()} disabled={loading}>{loading?"Refreshing…":"↻ Refresh"}</button></div></header>
   <div className="risk-banner"><div className="risk-icon">!</div><div><strong>Research mode · no trade recommendations</strong><p>Live spot-market context and historical indicators only. No leveraged LONG/SHORT calls, entry instructions, stop-loss/target levels or order execution.</p></div><span className="guard">RISK FIRST</span></div>
   {error&&<div className="error">{error}. Check your connection and refresh.</div>}
   <div className="section-head"><div><h2>Market watch</h2><p>Live MEXC trade ticks over WebSocket · candles refresh every 30 seconds</p></div><label>INTERVAL <select value={interval} onChange={e=>setInterval(e.target.value)}><option value="15m">15 minutes</option><option value="1h">1 hour</option><option value="4h">4 hours</option><option value="1d">1 day</option></select></label></div>
   <div className="market-grid">{(payload?.markets||[{symbol:"BTCUSDT"},{symbol:"ETHUSDT"},{symbol:"SOLUSDT"}] as Market[]).map(m=><button key={m.symbol} className={"market-card "+(symbol===m.symbol?"selected":"")} onClick={()=>setSymbol(m.symbol)}><div className="coin-row"><span className="coin-icon">{m.symbol.slice(0,1)}</span><span><b>{m.symbol.replace("USDT","")}</b><small>{m.symbol}</small></span><span className="coin-arrow">↗</span></div><strong className="price">{fmt(m.price)}</strong><span className={m.changePct==null?"neutral":m.changePct>=0?"positive":"negative"}>{m.changePct==null?"Waiting for data":`${m.changePct>=0?"+":""}${m.changePct.toFixed(2)}% 24h`}</span></button>)}</div>
   <div className="two-col"><section className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">PRICE HISTORY</span><h2>{symbol.replace("USDT","")} <span>/ USDT</span></h2></div><span className="small-tag">SPOT · {interval}</span></div>
    {chart.length>1?<><div className="chart-summary"><div><small>LATEST CLOSE</small><strong>{fmt(chart[chart.length-1].close)}</strong></div><div><small>WINDOW HIGH</small><strong>{fmt(stats?.high)}</strong></div><div><small>WINDOW LOW</small><strong>{fmt(stats?.low)}</strong></div></div><div className="sparkline" aria-label="Recent closing price history"><svg viewBox="0 0 720 210" preserveAspectRatio="none" role="img"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#68e0b0" stopOpacity=".22"/><stop offset="100%" stopColor="#68e0b0" stopOpacity="0"/></linearGradient></defs>{[40,90,140,190].map(y=><line key={y} x1="0" x2="720" y1={y} y2={y} stroke="#202b36" strokeDasharray="4 5"/>)}<path d={chart.map((c,i)=>{const min=Math.min(...chart.map(x=>x.close)),max=Math.max(...chart.map(x=>x.close));const x=i/(chart.length-1)*720,y=190-(c.close-min)/(max-min||1)*160;return `${i?"L":"M"} ${x} ${y}`;}).join(" ")+ " L 720 210 L 0 210 Z"} fill="url(#fill)"/><path d={chart.map((c,i)=>{const min=Math.min(...chart.map(x=>x.close)),max=Math.max(...chart.map(x=>x.close));return `${i?"L":"M"} ${i/(chart.length-1)*720} ${190-(c.close-min)/(max-min||1)*160}`;}).join(" ")} fill="none" stroke="#68e0b0" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg></div><div className="chart-foot"><span>{new Date(chart[0].time).toLocaleString()}</span><span>{new Date(chart[chart.length-1].time).toLocaleString()}</span></div></>:<div className="empty-chart">{loading?"Loading market candles…":"No candle history available yet."}</div>}
   </section>
   <section className="panel"><div className="panel-head"><div><span className="eyebrow">TECHNICAL CONTEXT</span><h2>Indicator snapshot</h2></div><span className="small-tag">NOT A SIGNAL</span></div><div className="indicator-list">{[["EMA 12",market?.indicators?.ema12],["EMA 26",market?.indicators?.ema26],["RSI · 14",market?.indicators?.rsi14],["MACD",market?.indicators?.macd],["MACD signal",market?.indicators?.macdSignal],["ATR · 14",market?.indicators?.atr14]].map(([name,value])=><div className="indicator-row" key={String(name)}><span>{name}</span><strong>{fmt(value as number|null)}</strong></div>)}</div><div className="context-note"><span>ⓘ</span><p>Indicators describe historical price behavior. They are not validated predictions and do not imply a profitable setup.</p></div></section></div>
   <div className="section-head lower-head"><div><h2>{tab==="Overview"?"Data quality & system status":tab}</h2><p>Transparent system state · no fabricated results</p></div></div>
   <div className="status-grid"><div className="status-card"><span className="status-kicker">DATA FRESHNESS</span><strong className={market?.fresh?"positive":"neutral"}>{loading?"CHECKING":market?.fresh?"FRESH":"UNVERIFIED"}</strong><p>{market?.lastCandleAt?new Date(market.lastCandleAt).toLocaleString():"Waiting for candle timestamp"}</p></div><div className="status-card"><span className="status-kicker">HISTORICAL SAMPLE</span><strong>{market?.candleCount||0} candles</strong><p>{market?.interval||interval} interval · public spot candles</p></div><div className="status-card"><span className="status-kicker">PERSISTENT WORKER</span><strong className="neutral">NOT CONFIGURED</strong><p>Background scheduling requires a worker host and persistent database.</p></div><div className="status-card"><span className="status-kicker">NEWS SENTIMENT</span><strong className="neutral">NOT CONNECTED</strong><p>No news feed is connected; no sentiment score is fabricated.</p></div></div>
   <section className="panel history-panel"><div className="panel-head"><div><span className="eyebrow">RECENT OBSERVATIONS</span><h2>Latest candles</h2></div><span className="small-tag">{chart.length} ROWS</span></div><div className="table-wrap"><table><thead><tr><th>TIME</th><th>OPEN</th><th>HIGH</th><th>LOW</th><th>CLOSE</th><th>VOLUME</th></tr></thead><tbody>{chart.slice(-10).reverse().map(c=><tr key={c.time}><td>{new Date(c.time).toLocaleString()}</td><td>{fmt(c.open)}</td><td>{fmt(c.high)}</td><td>{fmt(c.low)}</td><td>{fmt(c.close)}</td><td>{fmt(c.volume)}</td></tr>)}</tbody></table>{chart.length===0&&<div className="empty-table">No historical rows available.</div>}</div></section>
   <footer><span>CRYPTO MARKET INTELLIGENCE</span><span>DATA SOURCE: {market?.source||"PUBLIC EXCHANGE API"}</span><span>NO ORDER EXECUTION · EDUCATIONAL USE ONLY</span></footer>
  </section>
 </main>;
}
