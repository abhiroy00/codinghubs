// Inspect every relevant directive, including duplicate tags and googlebot overrides.
export function inspectSeoHtml(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html
  const tags = head.replace(/<!--[\s\S]*?-->/g, '').match(/<(?:meta|link)\b[^>]*>/gi) ?? []
  const robots = [], canonicals = []
  for (const tag of tags) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)]
      .map(([, key, double, single, bare]) => [key.toLowerCase(), double ?? single ?? bare]))
    const name = attrs.name?.toLowerCase()
    if (/^<meta\b/i.test(tag) && (name === 'robots' || name === 'googlebot')) robots.push({ name, content: attrs.content ?? '' })
    if (/^<link\b/i.test(tag) && attrs.rel?.toLowerCase() === 'canonical') canonicals.push(attrs.href ?? '')
  }
  return { robots, canonicals, noindex: robots.some(tag => excludesIndexing(tag.content)) }
}

export const excludesIndexing = value => /(?:^|[\s,:;])(?:noindex|none)(?=$|[\s,;])/i.test(value)
