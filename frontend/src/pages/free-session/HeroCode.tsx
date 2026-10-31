/** Decorative coding animation for the hero: an editor window whose code keeps sliding up, plus floating tech chips. */
const CODE: string[] = [
  '<i class="c"># Build your first AI agent</i>',
  '<i class="k">from</i> openai <i class="k">import</i> OpenAI',
  '<i class="k">import</i> pandas <i class="k">as</i> pd',
  '',
  'client = <i class="f">OpenAI</i>()',
  '',
  '<i class="k">def</i> <i class="f">ask_ai</i>(question):',
  '    reply = client.chat.completions.<i class="f">create</i>(',
  '        model=<i class="s">"gpt-4o"</i>,',
  '        messages=[{<i class="s">"role"</i>: <i class="s">"user"</i>,',
  '                   <i class="s">"content"</i>: question}],',
  '    )',
  '    <i class="k">return</i> reply.choices[<i class="n">0</i>].message.content',
  '',
  '<i class="c">// React + AI in the browser</i>',
  '<i class="k">const</i> [answer, setAnswer] = <i class="f">useState</i>(<i class="s">""</i>)',
  '<i class="k">async function</i> <i class="f">onSubmit</i>(q) {',
  '  <i class="k">const</i> res = <i class="k">await</i> <i class="f">fetch</i>(<i class="s">"/api/ask"</i>, {',
  '    method: <i class="s">"POST"</i>, body: q })',
  '  <i class="f">setAnswer</i>(<i class="k">await</i> res.<i class="f">text</i>())',
  '}',
  '',
  '<i class="c"># Data analytics with Python</i>',
  'df = pd.<i class="f">read_csv</i>(<i class="s">"sales.csv"</i>)',
  'top = df.<i class="f">groupby</i>(<i class="s">"city"</i>).sum().<i class="f">head</i>(<i class="n">5</i>)',
  '<i class="f">print</i>(top)  <i class="c"># ready for your portfolio</i>',
  '',
]

export function HeroCode() {
  const html = CODE.map((l, i) => `<span class="ln">${String(i + 1).padStart(2, '0')}</span>${l || '&nbsp;'}`).join('\n')
  return (
    <div className="hero-code" aria-hidden="true">
      <div className="code-win">
        <div className="code-bar">
          <span className="d r" /><span className="d y" /><span className="d g" />
          <b>ai_agent.py</b>
          <em>● live</em>
        </div>
        <div className="code-view">
          <div className="code-track">
            <pre dangerouslySetInnerHTML={{ __html: html }} />
            <pre dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
      <span className="chip-float c1">Python</span>
      <span className="chip-float c2">Generative AI</span>
      <span className="chip-float c3">React</span>
      <span className="chip-float c4">Data Science</span>
    </div>
  )
}
