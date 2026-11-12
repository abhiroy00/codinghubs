import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DiagramPlayer } from './DiagramPlayer'
import { DIAGRAMS } from './diagrams'
import { PracticeSandbox } from './PracticeSandbox'
import { useAcademySeo } from './useAcademySeo'
import './academy.css'
import './visual-lab.css'

export function VisualLab(){
  const [params,setParams]=useSearchParams()
  const [tab,setTab]=useState<'visual'|'practice'>('visual')
  const active=DIAGRAMS.find(d=>d.id===params.get('diagram'))||DIAGRAMS[0]
  useAcademySeo(`${active.subtitle} — Interactive visual lab | Coding Hubs`,'Explore attention, vector similarity, gradient descent and engineering workflows with step-by-step controls.','/visual-lab/')
  useEffect(()=>{document.title=`${active.subtitle} — Interactive visual lab | Coding Hubs`},[active])
  return <div className="academy"><main className="vl-page"><nav className="vl-breadcrumb" aria-label="Breadcrumb"><Link to="/learn/">Learning library</Link> / Visual lab</nav><header className="vl-page-title"><p className="academy-eyebrow">OPEN THE BLACK BOX</p><h1>Make the abstract<br/><em>feel obvious.</em></h1><p>One concept. One operation at a time. Change the inputs and follow the math.</p></header><div className="vl-mode"><button aria-pressed={tab==='visual'} onClick={()=>setTab('visual')}>Interactive explanations</button><button aria-pressed={tab==='practice'} onClick={()=>setTab('practice')}>Coding practice</button></div>{tab==='visual'?<div className="vl-layout"><aside className="vl-library" aria-label="Choose a visualization"><p>EXPLORE THE INTERNALS</p>{DIAGRAMS.map((d,i)=><button key={d.id} aria-pressed={active.id===d.id} onClick={()=>setParams({diagram:d.id})}><span>{String(i+1).padStart(2,'0')}</span><div><b>{d.subtitle}</b><small>{d.kind==='pipeline'?'Step-by-step workflow':d.kind==='vectors'?'Rotatable 3D projection':'Interactive mathematics'}</small></div><span>↗</span></button>)}<div className="vl-side-note"><b>You control the pace.</b><p>Nothing plays automatically. Every explanation is also available as text, with a simplified view for spatial diagrams.</p></div></aside><DiagramPlayer key={active.id} definition={active}/></div>:<PracticeSandbox/>}</main></div>
}
