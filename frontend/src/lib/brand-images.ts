import small from '../assets/brand/logo-288.webp'
import large from '../assets/brand/logo-720.webp'

/** Vite fingerprints these files so a year-long cache is safe when the logo changes. */
export const BRAND_LOGO_SRCSET = `${small} 288w, ${large} 720w`
