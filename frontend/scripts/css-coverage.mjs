// CSS coverage over the main pages. Needs Chrome and a static server on :4181 serving dist/ (see docs/performance/css-plan.md).
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const shell=fs.readFileSync((process.argv[2]||'dist')+'/content-shell.html','utf8')
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'})
const pages=['/','/program/ai-for-all','/locations/','/locations/ai-course-in-rohini-delhi/','/book-a-tutor/','/courses/','/courses/agentic-ai/','/interview-prep/agentic-ai/','/certificates/','/policies','/login','/store','/blog','/projects','/cart']
const used={}; const total={}
for(const u of pages){
 const p=await b.newPage();await p.setViewport({width:1280,height:900});await p.evaluateOnNewDocument(()=>localStorage.setItem('ch_registered','1'))
 await p.setRequestInterception(true);p.on('request',r=>{const x=new URL(r.url());if(['/store','/blog','/projects','/cart'].includes(x.pathname)&&r.resourceType()==='document')return r.respond({status:200,contentType:'text/html',body:shell});if(x.pathname.startsWith('/api/'))return r.respond({status:200,contentType:'application/json',body:'[]'});r.continue()})
 await p.coverage.startCSSCoverage()
 await p.goto('http://localhost:4181'+u,{waitUntil:'networkidle0'}).catch(()=>{});await new Promise(r=>setTimeout(r,800))
 // exercise common states
 await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>d.open=true);window.scrollTo(0,document.body.scrollHeight)});await new Promise(r=>setTimeout(r,400))
 const cov=await p.coverage.stopCSSCoverage()
 for(const c of cov){const k=c.url.split('/').pop().split('?')[0].replace(/-[A-Za-z0-9_]{8}\./,'.');total[k]=c.text.length;used[k]=used[k]||new Uint8Array(c.text.length);for(const r of c.ranges)for(let i=r.start;i<r.end;i++)used[k][i]=1}
 await p.close()}
for(const k of Object.keys(total)){const u=used[k].reduce((a,x)=>a+x,0);console.log(k.padEnd(28),Math.round(total[k]/1024)+'KB total',Math.round(u/1024)+'KB used on these 15 pages',Math.round((1-u/total[k])*100)+'% unused')}
await b.close()
