export interface BrowserRunResult { status: string; stdout: string; stderr: string; time?: string; ok: boolean }

// Opaque-origin frame + CSP-constrained worker. Never executes on the app thread or server.
export function runBrowserJavaScript(code: string, stdin = ''): Promise<BrowserRunResult> {
  if (code.length > 50000 || stdin.length > 20000) return Promise.resolve({status:'Input limit exceeded',stdout:'',stderr:'Keep code below 50,000 characters and input below 20,000.',ok:false})
  return new Promise(resolve=>{
    const start=performance.now(), frame=document.createElement('iframe')
    frame.setAttribute('sandbox','allow-scripts');frame.hidden=true;frame.title='Isolated code execution'
    let settled=false
    const finish=(data:Omit<BrowserRunResult,'time'>)=>{if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();resolve({...data,time:((performance.now()-start)/1000).toFixed(2)})}
    const timer=window.setTimeout(()=>finish({status:'Time limit exceeded (3 s)',stdout:'',stderr:'The isolated worker was stopped.',ok:false}),3000)
    function receive(event:MessageEvent){
      if(event.source!==frame.contentWindow)return
      if(event.data?.type==='ready'){frame.contentWindow?.postMessage({code,stdin},'*');return}
      if(event.data?.type==='result'){
        const d=event.data
        finish({status:typeof d.status==='string'?d.status.slice(0,100):'Runtime error',stdout:typeof d.stdout==='string'?d.stdout.slice(0,20000):'',stderr:typeof d.stderr==='string'?d.stderr.slice(0,4000):'',ok:d.ok===true})
      }
    }
    window.addEventListener('message',receive)
    frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'; img-src 'none'; media-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><script>
    let worker;
    const send=(d)=>parent.postMessage(d,'*');
    addEventListener('message',e=>{
      if(e.source!==parent||worker||typeof e.data.code!=='string')return;
      const source=\`onmessage=async e=>{
        let lines=[],size=0,errors=[],ok=true;
        const show=(v)=>typeof v==='string'?v:(()=>{try{return JSON.stringify(v)}catch{return String(v)}})();
        const log=(...args)=>{const line=args.map(show).join(' ');size+=line.length;if(size>20000||lines.length>=200)throw Error('Output limit exceeded');lines.push(line)};
        console.log=console.info=log;console.warn=console.error=(...args)=>{if(errors.length<30)errors.push(args.map(show).join(' ').slice(0,1000))};
        try{await new Function('stdin',e.data.code)(e.data.stdin)}catch(error){ok=false;errors.push(String(error).slice(0,2000))}
        postMessage({type:'result',status:ok?'Finished':'Runtime error',stdout:lines.join('\\n'),stderr:errors.join('\\n'),ok});close();
      }\`;
      const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      worker=new Worker(url);URL.revokeObjectURL(url);
      worker.onmessage=e=>{const d=e.data;if(d&&d.type==='result')send(d);worker.terminate()};
      worker.onerror=e=>{send({type:'result',status:'Worker error',stdout:'',stderr:String(e.message).slice(0,2000),ok:false});worker.terminate()};
      worker.postMessage(e.data);
      setTimeout(()=>{worker.terminate();send({type:'result',status:'Time limit exceeded',stdout:'',stderr:'Execution stopped after 2.5 seconds.',ok:false})},2500);
    });send({type:'ready'});
    </script>`
    document.body.appendChild(frame)
  })
}
