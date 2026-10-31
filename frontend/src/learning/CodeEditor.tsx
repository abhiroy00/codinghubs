import { useEffect, useRef, useState } from 'react'

type Lang = { id: number; name: string; starter: string }

const hello = (c: string, body: string) => `${c} Write your code here\n${body}`
/** Languages offered by the public Judge0 runner (id = Judge0 language id). JavaScript runs inside the browser instead. */
const LANGS: Lang[] = [
  { id: 113, name: 'Python', starter: 'name = input()\nprint(f"Hello, {name or \'world\'}!")\n' },
  { id: 102, name: 'JavaScript', starter: 'console.log("Hello, world!")\n' },
  { id: 101, name: 'TypeScript', starter: 'const greet = (name: string): string => `Hello, ${name}!`\nconsole.log(greet("world"))\n' },
  { id: 91, name: 'Java', starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n' },
  { id: 103, name: 'C', starter: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    return 0;\n}\n' },
  { id: 105, name: 'C++', starter: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n' },
  { id: 51, name: 'C#', starter: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, world!");\n    }\n}\n' },
  { id: 107, name: 'Go', starter: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, world!")\n}\n' },
  { id: 108, name: 'Rust', starter: 'fn main() {\n    println!("Hello, world!");\n}\n' },
  { id: 98, name: 'PHP', starter: '<?php\necho "Hello, world!\\n";\n' },
  { id: 72, name: 'Ruby', starter: 'puts "Hello, world!"\n' },
  { id: 111, name: 'Kotlin', starter: 'fun main() {\n    println("Hello, world!")\n}\n' },
  { id: 83, name: 'Swift', starter: 'print("Hello, world!")\n' },
  { id: 112, name: 'Scala', starter: '@main def hello(): Unit = println("Hello, world!")\n' },
  { id: 99, name: 'R', starter: 'cat("Hello, world!\\n")\n' },
  { id: 46, name: 'Bash', starter: 'echo "Hello, world!"\n' },
  { id: 82, name: 'SQL (SQLite)', starter: "SELECT 'Hello, world!' AS greeting;\n" },
  { id: 90, name: 'Dart', starter: 'void main() {\n  print("Hello, world!");\n}\n' },
  { id: 85, name: 'Perl', starter: 'print "Hello, world!\\n";\n' },
  { id: 64, name: 'Lua', starter: 'print("Hello, world!")\n' },
  { id: 61, name: 'Haskell', starter: 'main :: IO ()\nmain = putStrLn "Hello, world!"\n' },
  { id: 57, name: 'Elixir', starter: 'IO.puts("Hello, world!")\n' },
  { id: 58, name: 'Erlang', starter: '-module(main).\n-export([main/0]).\nmain() -> io:format("Hello, world!~n").\n' },
  { id: 86, name: 'Clojure', starter: '(println "Hello, world!")\n' },
  { id: 88, name: 'Groovy', starter: 'println "Hello, world!"\n' },
  { id: 87, name: 'F#', starter: 'printfn "Hello, world!"\n' },
  { id: 59, name: 'Fortran', starter: 'program hello\n  print *, "Hello, world!"\nend program hello\n' },
  { id: 67, name: 'Pascal', starter: "program Hello;\nbegin\n  writeln('Hello, world!');\nend.\n" },
  { id: 65, name: 'OCaml', starter: 'let () = print_endline "Hello, world!"\n' },
  { id: 66, name: 'Octave', starter: 'disp("Hello, world!")\n' },
  { id: 79, name: 'Objective-C', starter: '#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@"Hello, world!");\n    return 0;\n}\n' },
  { id: 55, name: 'Common Lisp', starter: '(format t "Hello, world!~%")\n' },
  { id: 56, name: 'D', starter: 'import std.stdio;\n\nvoid main() {\n    writeln("Hello, world!");\n}\n' },
  { id: 77, name: 'COBOL', starter: '       IDENTIFICATION DIVISION.\n       PROGRAM-ID. HELLO.\n       PROCEDURE DIVISION.\n           DISPLAY "Hello, world!".\n           STOP RUN.\n' },
  { id: 45, name: 'Assembly (NASM)', starter: hello(';', 'section .text\n') },
  { id: 69, name: 'Prolog', starter: ':- initialization(main).\nmain :- write(\'Hello, world!\'), nl.\n' },
  { id: 84, name: 'Visual Basic', starter: 'Module Program\n    Sub Main()\n        Console.WriteLine("Hello, world!")\n    End Sub\nEnd Module\n' },
  { id: 47, name: 'Basic (FreeBASIC)', starter: 'print "Hello, world!"\n' },
  { id: 0, name: 'Plain text (notes)', starter: '' },
]

const RUNNER = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true'
const enc = (s: string) => btoa(unescape(encodeURIComponent(s)))
const dec = (s: string | null) => {
  if (!s) return ''
  try {
    return decodeURIComponent(escape(atob(s)))
  } catch {
    return s
  }
}

type Result = { status: string; stdout: string; stderr: string; time?: string; ok: boolean }

function runJavaScript(code: string, stdin: string): Promise<Result> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.style.display = 'none'
    const out: string[] = []
    const err: string[] = []
    let failed = false
    const start = performance.now()
    const finish = (status: string, ok: boolean) => {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      frame.remove()
      resolve({ status, stdout: out.join(''), stderr: err.join(''), time: ((performance.now() - start) / 1000).toFixed(2), ok })
    }
    const timer = setTimeout(() => finish('Time limit exceeded (5 s)', false), 5000)
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow) return
      const d = e.data as { t: string; s?: string }
      if (d.t === 'log') out.push(`${d.s}\n`)
      else if (d.t === 'err') err.push(`${d.s}\n`)
      else if (d.t === 'fail') {
        failed = true
        err.push(`${d.s}\n`)
      } else if (d.t === 'done') finish(failed ? 'Runtime error' : 'Accepted', !failed)
    }
    window.addEventListener('message', onMessage)
    // the program text travels as a JSON string and is evaluated, so a syntax error is reported instead of silencing the page
    const payload = JSON.stringify(code).replace(/<\//g, '<\\/')
    frame.srcdoc = `<script>
const send=(t,s)=>parent.postMessage({t,s},'*');
const show=(a)=>a.map(x=>typeof x==='string'?x:(()=>{try{return JSON.stringify(x)}catch(e){return String(x)}})()).join(' ');
console.log=console.info=(...a)=>send('log',show(a));console.error=console.warn=(...a)=>send('err',show(a));
window.onerror=(m)=>{send('fail',String(m));return true};window.onunhandledrejection=(e)=>send('fail',String(e.reason));
const stdin=${JSON.stringify(stdin).replace(/<\//g, '<\\/')};
try{(0,eval)(${payload})}catch(e){send('fail',String(e))}
setTimeout(()=>parent.postMessage({t:'done'},'*'),400);
</script>`
    document.body.appendChild(frame)
  })
}

async function runRemote(lang: Lang, code: string, stdin: string): Promise<Result> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 25000)
  try {
    const res = await fetch(RUNNER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_code: enc(code), language_id: lang.id, stdin: enc(stdin) }), signal: ctl.signal })
    if (res.status === 429) return { status: 'The free code runner is busy', stdout: '', stderr: 'Too many runs right now. Please try again in a minute.', ok: false }
    if (!res.ok) return { status: 'Runner unavailable', stdout: '', stderr: `The code runner answered ${res.status}. Please try again.`, ok: false }
    const d = await res.json()
    const stderr = [dec(d.compile_output), dec(d.stderr), d.message ? dec(d.message) : ''].filter(Boolean).join('\n')
    return { status: d.status?.description ?? 'Done', stdout: dec(d.stdout), stderr, time: d.time, ok: d.status?.id === 3 }
  } catch {
    return { status: 'Could not reach the code runner', stdout: '', stderr: 'Check your internet connection and try again.', ok: false }
  } finally {
    clearTimeout(t)
  }
}

const read = (k: string, fallback: string) => {
  try {
    return localStorage.getItem(k) ?? fallback
  } catch {
    return fallback
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

/** Code editor with a language picker (about 40 languages) and a Run button. JavaScript runs in the browser; other languages run on a public runner. */
export function CodeEditor({ storageKey, hint }: { storageKey: string; hint?: string }) {
  const [langName, setLangName] = useState(() => read(`ch_ce_lang_${storageKey}`, 'Python'))
  const lang = LANGS.find((l) => l.name === langName) ?? LANGS[0]
  const [code, setCode] = useState(() => read(`ch_ce_${storageKey}_${lang.name}`, lang.starter))
  const [stdin, setStdin] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const gutter = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCode(read(`ch_ce_${storageKey}_${lang.name}`, lang.starter))
    setResult(null)
    write(`ch_ce_lang_${storageKey}`, lang.name)
  }, [lang.name, storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const lines = code.split('\n').length
  const onChange = (v: string) => {
    setCode(v)
    write(`ch_ce_${storageKey}_${lang.name}`, v)
  }
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget
      const s = el.selectionStart
      onChange(`${code.slice(0, s)}    ${code.slice(el.selectionEnd)}`)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4 })
    }
  }
  const run = async () => {
    if (lang.id === 0 || busy) return
    setBusy(true)
    setResult(null)
    setResult(lang.name === 'JavaScript' ? await runJavaScript(code, stdin) : await runRemote(lang, code, stdin))
    setBusy(false)
  }

  return (
    <div className="ce">
      <div className="ce-bar">
        <label className="ce-lang">
          <span className="sr-only">Language</span>
          <select value={lang.name} onChange={(e) => setLangName(e.target.value)} aria-label="Language">
            {LANGS.map((l) => (<option key={l.name} value={l.name}>{l.name}</option>))}
          </select>
        </label>
        <button type="button" className="ce-reset" onClick={() => onChange(lang.starter)}>Reset</button>
        <button type="button" className="ce-run" onClick={() => void run()} disabled={busy || lang.id === 0}>{busy ? 'Running…' : lang.id === 0 ? 'Notes only' : 'Run ▶'}</button>
      </div>
      <div className="ce-box">
        <div className="ce-gutter" ref={gutter} aria-hidden="true">{Array.from({ length: lines }, (_, i) => (<span key={i}>{i + 1}</span>))}</div>
        <textarea className="ce-text" value={code} spellCheck={false} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop }} aria-label="Code editor" />
      </div>
      {lang.id !== 0 && (
        <details className="ce-input">
          <summary>Input (stdin)</summary>
          <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} spellCheck={false} placeholder="Text that your program reads from standard input" aria-label="Program input" />
        </details>
      )}
      <div className="ce-out" role="status" aria-live="polite">
        {!result && !busy && <p className="ce-muted">{hint ?? 'Run your code to see the output here.'}</p>}
        {busy && <p className="ce-muted">Running…</p>}
        {result && (
          <>
            <p className={`ce-status ${result.ok ? 'ok' : 'bad'}`}>{result.status}{result.time ? ` · ${result.time}s` : ''}</p>
            {result.stdout && (<><h4>Output</h4><pre>{result.stdout}</pre></>)}
            {result.stderr && (<><h4>Errors</h4><pre className="ce-err">{result.stderr}</pre></>)}
            {!result.stdout && !result.stderr && <p className="ce-muted">The program finished without printing anything.</p>}
          </>
        )}
      </div>
      <p className="ce-note">{lang.name === 'JavaScript' ? 'JavaScript runs inside your browser.' : 'This language runs on a free public code runner (Judge0): your code is sent there to be executed, so do not paste passwords or private data. Heavy use may be rate-limited.'}</p>
    </div>
  )
}
