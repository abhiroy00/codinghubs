import team from './team.json'
import './home-team.css'

/** Team profiles and links supplied by the reference Coding Hubs website. */
export function HomeTeam() {
  return (
    <section className="home-team" id="team" aria-labelledby="team-title">
      <div className="home-team-inner">
        <h2 id="team-title">Meet Our Teams</h2>
        <div className="home-team-grid">
          {team.map((person, index) => (
            <article className="home-team-card" key={person.name} aria-labelledby={`team-person-${index}`}>
              <img className="home-team-photo" src={person.image} alt={person.name} width={136} height={136} loading="lazy" decoding="async" />
              <p className="home-team-headline">{person.headline}</p>
              <blockquote>{person.bio}</blockquote>
              <h3 id={`team-person-${index}`}>{person.name}</h3>
              <p className="home-team-role">{person.role}</p>
              <a href={person.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`Connect with ${person.name} on LinkedIn`}>Connect on LinkedIn</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
