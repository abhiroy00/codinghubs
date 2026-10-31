import { INSTITUTE, WHATSAPP } from '../pages/free-session/data'
import { FsIcon } from '../pages/free-session/icons'

/** Round call and WhatsApp buttons fixed at the bottom-right of every page. */
export function FloatingContact() {
  const wa = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`
  return (
    <>
      <a href={INSTITUTE.phoneHref} className="call-float" aria-label={`Call ${INSTITUTE.phone}`}>
        <FsIcon id="i-phone" />
      </a>
      <a href={wa} className="wa-float" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
        <FsIcon id="i-wa" />
      </a>
    </>
  )
}
