// Controlled local lab measurements; these are PerformanceObserver metrics, not Lighthouse or field data.
import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const mode=process.argv[2]||'before'
const routes=mode==='new'?['/newsletter/','/brochures/','/my-account?section=interview']:mode==='before'?['/','/interview-prep/','/interview-prep/generative-ai/levels/1/articles/ai-ml-deep-learning/','/courses/generative-ai/']:['/','/interview/','/interview/generative-ai/levels/1/articles/ai-ml-deep-learning/','/courses/generative-ai/']
const browser=await chromium.launch({channel:'chrome',headless:true})
const results=[]
try{
 for(const path of routes){
  const runs=[]
  for(let i=0;i<3;i++){
   const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'})
   const page=await context.newPage();const cdp=await context.newCDPSession(page)
   await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
   await page.addInitScript(()=>{window.__lab={lcp:0,lcpElement:'',cls:0,longTaskBlocking:0};new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__lab.lcp=e.startTime;window.__lab.lcpElement=e.element?.tagName+' '+(e.element?.id||e.element?.className||'')}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__lab.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())window.__lab.longTaskBlocking+=Math.max(0,e.duration-50)}).observe({type:'longtask',buffered:true})})
   if(path.startsWith('/my-account')){const response=await context.request.post('https://localhost:5181/api/auth/login/',{data:{username:'review_student',password:'Review-local-only-384!'}});const auth=await response.json();if(!auth.access)throw Error('Isolated profile login failed');await page.addInitScript(auth=>{localStorage.setItem('ch_access',auth.access);localStorage.setItem('ch_refresh',auth.refresh);localStorage.setItem('ch_user',JSON.stringify(auth.user));localStorage.setItem('ch_auth_identity','review-performance')},auth)}
   await page.goto((mode==='new'?'https://localhost:5181':'http://127.0.0.1:5174')+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(5000)
   runs.push(await page.evaluate(()=>({...window.__lab,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime||null,transferBytes:performance.getEntriesByType('resource').reduce((s,e)=>s+e.transferSize,0)+performance.getEntriesByType('navigation')[0].transferSize})))
   await context.close()
  }
  const median=key=>[...runs.map(r=>r[key])].sort((a,b)=>a-b)[1]
  results.push({path,runs,median:{fcp:median('fcp'),lcp:median('lcp'),cls:median('cls'),longTaskBlocking:median('longTaskBlocking'),transferBytes:median('transferBytes')},lcpElement:runs[1].lcpElement});console.log(mode,path,JSON.stringify(results.at(-1).median))
 }
 await writeFile(new URL(`../../artifacts/platform/performance-${mode}.json`,import.meta.url),JSON.stringify({method:'Chrome PerformanceObserver; 390x844; CPU x4; 150ms RTT; 1.6Mbps down; 3 cold contexts; 5s observation; not Lighthouse TBT or field data',results},null,2))
}finally{await browser.close()}
