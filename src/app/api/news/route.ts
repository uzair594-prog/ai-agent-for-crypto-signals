import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
type Item={title:string;link:string;publishedAt:string|null;source:string;sentiment:"positive"|"negative"|"mixed"|"neutral";score:number};
const positive=["surge","rally","approval","approved","adoption","inflow","growth","record high","partnership","launch","bullish","upgrade","breakthrough"];
const negative=["hack","exploit","lawsuit","ban","outflow","crash","selloff","bearish","fraud","liquidation","risk","decline","investigation"];
function scoreText(text:string){const s=text.toLowerCase();let score=0;for(const w of positive)if(s.includes(w))score++;for(const w of negative)if(s.includes(w))score--;return {score:Math.max(-1,Math.min(1,score/3)),sentiment:score>0?"positive" as const:score<0?"negative" as const:"neutral" as const};}
export async function GET(){
 try{
  const r=await fetch("https://www.coindesk.com/arc/outboundfeeds/rss/",{cache:"no-store",signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw new Error("News feed unavailable");
  const xml=await r.text();
  const entries=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,20);
  const items:Item[]=entries.map(([_,body])=>{
   const read=(tag:string)=>{const raw=body.match(new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)<\\/"+tag+">","i"))?.[1]||"";return raw.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();};
   const title=read("title"),link=read("link"),date=read("pubDate"),s=scoreText(title);
   return {title,link,publishedAt:date?new Date(date).toISOString():null,source:"CoinDesk RSS",...s};
  }).filter(x=>x.title&&x.link);
  return NextResponse.json({items,updatedAt:new Date().toISOString(),method:"Headline keyword lexicon (experimental; title-only)",warning:"This is a rough headline classifier, not a financial sentiment model or trade signal."},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({items:[],updatedAt:new Date().toISOString(),status:"unavailable",error:e instanceof Error?e.message:"News feed unavailable",warning:"No sentiment is fabricated when the source cannot be reached."},{headers:{"Cache-Control":"no-store"}});
 }
}
