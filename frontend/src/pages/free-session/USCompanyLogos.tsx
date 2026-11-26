import './us-company-logos.css'

const COMPANIES = [
  { name: 'Google', image: 'google.png', href: 'https://www.google.com/' },
  { name: 'Microsoft', image: 'microsoft.png', href: 'https://www.microsoft.com/' },
  { name: 'Amazon Web Services', image: 'aws.png', href: 'https://aws.amazon.com/' },
  { name: 'NVIDIA', image: 'nvidia.svg', href: 'https://www.nvidia.com/' },
  { name: 'GitHub', image: 'github.png', href: 'https://github.com/' },
] as const

/** Editorial links to US technology brands, displayed separately from student placement records. */
export function USCompanyLogos() {
  return (
    <section className="us-company-logos" aria-labelledby="us-companies-title">
      <div className="us-company-inner">
        <h2 id="us-companies-title">Explore US Technology Companies</h2>
        <ul className="us-company-grid">
          {COMPANIES.map(company => (
            <li key={company.name}>
              <a href={company.href} target="_blank" rel="noopener noreferrer">
                <img src={`/assets/us-brands/${company.image}`} alt={company.name} width={160} height={64} loading="lazy" decoding="async" />
                <span className="sr-only"> — official website (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
