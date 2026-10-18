import { useRef } from 'react'
import { ExpertCTA } from '../components/ExpertCTA'
import { CompaniesQuotes } from '../components/home/CompaniesQuotes'
import { ComparePrograms } from '../components/home/ComparePrograms'
import { DemoMasterclass } from '../components/home/DemoMasterclass'
import { FinalCTA } from '../components/home/FinalCTA'
import { Hero } from '../components/home/Hero'
import { Learners } from '../components/home/Learners'
import { NotTechnical } from '../components/home/NotTechnical'
import { Opportunity } from '../components/home/Opportunity'
import { PostsMarquee } from '../components/home/PostsMarquee'
import { ProgramsStack } from '../components/home/ProgramsStack'
import { RiskCards } from '../components/home/RiskCards'
import { ToolsOrbit } from '../components/home/ToolsOrbit'
import { useReveal } from '../hooks/useReveal'

export function Home() {
  const ref = useRef<HTMLDivElement>(null)
  useReveal(ref)

  return (
    <div ref={ref}>
      <Hero />
      <CompaniesQuotes />
      <RiskCards />
      <ToolsOrbit />
      <ProgramsStack />
      <ComparePrograms />
      <PostsMarquee />
      <Opportunity />
      <NotTechnical />
      <DemoMasterclass />
      <Learners />
      <FinalCTA />
      <ExpertCTA />
    </div>
  )
}
