// Shared source adapters used by both the live server and the offline
// sample-dataset builder script.

async function fetchEuropePMC(tags, signal) {
  const query = tags.map((t) => `"${t}"`).join(' OR ');
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
    query
  )}&format=json&pageSize=25&resultType=core&sort=P_PDATE_D+desc`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Europe PMC HTTP ${res.status}`);
  const data = await res.json();
  const results = (data.resultList && data.resultList.result) || [];
  return results.map((r) => ({
    source: 'Europe PMC',
    title: r.title || '',
    abstract: r.abstractText || '',
    journal: r.journalTitle || r.journalInfo?.journal?.title || '',
    year: r.pubYear ? Number(r.pubYear) : null,
    publishedDate: r.firstPublicationDate || r.electronicPublicationDate || null,
    doi: r.doi ? r.doi.toLowerCase() : null,
    pmid: r.pmid || null,
    url: r.doi ? `https://doi.org/${r.doi}` : r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : null,
    pubTypes: r.pubTypeList && r.pubTypeList.pubType ? r.pubTypeList.pubType : [],
  }));
}

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return '';
  const positions = [];
  let maxPos = 0;
  for (const word of Object.keys(invertedIndex)) {
    for (const pos of invertedIndex[word]) {
      positions[pos] = word;
      if (pos > maxPos) maxPos = pos;
    }
  }
  return positions.join(' ');
}

async function fetchOpenAlex(tags, signal) {
  const query = tags.join(' OR ');
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(
    query
  )}&per-page=25&sort=publication_date:desc`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  const data = await res.json();
  const results = data.results || [];
  return results
    .filter((r) => {
      // Exclude institutional-repository deposits (theses, dissertations) —
      // OpenAlex's top-level `type` misclassifies many of these as
      // "article", but the source and raw type reveal the truth, and
      // they're not peer-reviewed literature appropriate for this feed.
      const sourceType = r.primary_location?.source?.type;
      const rawType = (r.primary_location?.raw_type || '').toLowerCase();
      if (sourceType === 'repository') return false;
      if (rawType.includes('thesis') || rawType.includes('dissertation')) return false;
      return true;
    })
    .map((r) => ({
      source: 'OpenAlex',
      title: r.title || r.display_name || '',
      abstract: reconstructAbstract(r.abstract_inverted_index),
      journal: r.primary_location?.source?.display_name || '',
      year: r.publication_year || null,
      publishedDate: r.publication_date || null,
      doi: r.doi ? r.doi.replace('https://doi.org/', '').toLowerCase() : null,
      pmid: null,
      url: r.doi || r.id || null,
      pubTypes: r.type ? [r.type] : [],
    }));
}

function dedupe(articles) {
  const byKey = new Map();
  for (const a of articles) {
    const key = a.doi ? `doi:${a.doi}` : `title:${(a.title || '').toLowerCase().trim()}:${a.year}`;
    if (!byKey.has(key)) {
      byKey.set(key, a);
    } else {
      const existing = byKey.get(key);
      if (!existing.abstract && a.abstract) byKey.set(key, a);
    }
  }
  return Array.from(byKey.values());
}

module.exports = { fetchEuropePMC, fetchOpenAlex, reconstructAbstract, dedupe };
