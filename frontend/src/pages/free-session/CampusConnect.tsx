import './campus-connect.css'

export function CampusConnect() {
  return (
    <section className="campus-connect" id="campus-connect" aria-labelledby="campus-connect-title">
      <div className="wrap">
        <header className="campus-connect-heading">
          <h2 id="campus-connect-title">Campus <span>Connect</span></h2>
          <p>Learn beyond classrooms with practical training, real-world projects, and industry exposure.</p>
        </header>
        <img className="campus-connect-banner" src="/assets/campus-connect.webp"
          alt="Coding Hub Campus Connect at Ganga Institute of Technology and Management — student community, interactive sessions, certification and expert faculty support"
          width={1600} height={759} loading="lazy" decoding="async" />
      </div>
    </section>
  )
}
