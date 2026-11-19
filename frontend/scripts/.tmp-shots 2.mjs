import { chromium } from '@playwright/test'
const [out, ...routes] = process.argv.slice(2)
const b = await chromium.launch()
for (const [w,h,tag] of [[390,844,'m'],[1440,900,'d']]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, reducedMotion:'reduce' })
  const p = await ctx.newPage()
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
  for (const r of routes) {
    await p.goto('http://127.0.0.1:4173'+r,{waitUntil:'networkidle'}).catch(e=>errs.push(String(e)))
    await p.waitForTimeout(600)
    const sw = await p.evaluate(()=>document.documentElement.scrollWidth)
    const name = (r.replace(/\W+/g,'-').replace(/^-|-$/g,'')||'home')
    await p.screenshot({ path:`${out}/${name}-${tag}.png`, fullPage:true })
    console.log(tag, r, 'scrollWidth', sw, errs.splice(0).join(' | ').slice(0,300))
  }
  await ctx.close()
}
await b.close()
