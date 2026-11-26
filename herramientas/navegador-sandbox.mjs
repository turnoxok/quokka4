import {chromium} from 'playwright';import fs from 'fs';
const D='/tmp/r3/dist/',N='/tmp/r3/node_modules/';
const map=[[/esm\.sh\/react@18\.3\.1$/,'react'],[/esm\.sh\/react@18\.3\.1\/jsx-runtime/,'jsx-runtime'],[/esm\.sh\/react@18\.3\.1\/jsx-dev-runtime/,'jsx-dev-runtime'],[/esm\.sh\/react-dom@18\.3\.1$/,'react-dom'],[/esm\.sh\/react-dom@18\.3\.1\/client/,'react-dom-client'],
[/esm\.sh\/three@0\.160\.0$/,'three'],[/SVGLoader/,'svgloader'],[/BufferGeometryUtils/,'bgutils'],[/esm\.sh\/zustand/,'zustand'],[/esm\.sh\/@react-three\/fiber/,'fiber'],[/esm\.sh\/@react-three\/drei/,'drei'],[/esm\.sh\/@react-three\/postprocessing/,'rtpost'],[/esm\.sh\/postprocessing/,'postproc'],[/mp4-muxer/,'muxer']];
export async function open(url,{w=1200,h=800,mobile=false,delay=0,bps=0}={}){
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,...(mobile?{isMobile:true,hasTouch:true}:{}),acceptDownloads:true});
  const pg=await ctx.newPage();
  pg.on('console',m=>{const t=m.text();if(/BABEL|rror/.test(t)&&!/ERR_TUNNEL|Failed to load resource/.test(t))console.log('CONSOLE',t.slice(0,300));});
  await pg.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>{
    const u=r.request().url();
    for(const [re,f] of map) if(re.test(u)) return r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(D+f+'.js')});
    if(/unpkg\.com\/lenis/.test(u)) return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(N+'lenis/dist/lenis.min.js')});
    if(/babel/.test(u)) return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(N+'@babel/standalone/babel.min.js')});
    if(/fonts\.googleapis/.test(u)) return r.fulfill({status:200,contentType:'text/css',body:''});
    return r.abort();});
  if(delay||bps){await pg.route(/^http:\/\/localhost.*\/assets\//,async r=>{try{const resp=await r.fetch();const body=await resp.body();await new Promise(x=>setTimeout(x,delay+(bps?body.length/bps*1000:0)));await r.fulfill({response:resp,body});}catch(e){try{await r.abort();}catch(_){}}});}
  await pg.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  return {b,pg,ctx};
}
