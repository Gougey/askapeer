// Lightweight research-feed prototype server. No external dependencies —
// uses Node's built-in http and fetch. Run with: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchEuropePMC, fetchOpenAlex, dedupe } = require('./lib/sources');

const PORT = process.env.PORT || 8787;
const ROOT = __dirname;

// Lightweight access barrier for the /docs section (PRD + technical specs) —
// not real security (hardcoded, no rate limiting), just enough friction to
// keep planning documents out of casual/search-engine reach while the team
// reviews them. Override via env vars so the password isn't only in source
// control if that ever matters.
const DOCS_AUTH_USER = process.env.DOCS_AUTH_USER || 'team';
const DOCS_AUTH_PASS = process.env.DOCS_AUTH_PASS || 'brisk-otter-47';

function requireDocsAuth(req, res) {
  const header = req.headers['authorization'] || '';
  const [scheme, encoded] = header.split(' ');
  const decoded = scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '';
  const separatorIndex = decoded.indexOf(':');
  const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
  const pass = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
  if (user === DOCS_AUTH_USER && pass === DOCS_AUTH_PASS) return true;
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Askapeer docs"',
    'Content-Type': 'text/plain',
  });
  res.end('Authentication required');
  return false;
}
const TAXONOMY = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'taxonomy.json'), 'utf8'));
const SAMPLE_FEED_PATH = path.join(ROOT, 'data', 'sample-feed.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { promise: promise(controller.signal), controller, cancel: () => clearTimeout(timer) };
}

function normaliseEvidenceType(pubTypes) {
  const joined = pubTypes.join(' ').toLowerCase();
  if (joined.includes('meta-analysis')) return 'Meta-Analysis';
  if (joined.includes('systematic review')) return 'Systematic Review';
  if (joined.includes('guideline')) return 'Guideline';
  if (joined.includes('randomized controlled trial') || joined.includes('randomised controlled trial'))
    return 'Randomised Controlled Trial';
  if (joined.includes('review')) return 'Systematic Review';
  if (joined.includes('cohort') || joined.includes('observational')) return 'Cohort Study';
  if (joined.includes('case report') || joined.includes('case reports')) return 'Case Report';
  if (joined.includes('preprint')) return 'Preprint';
  return 'Journal Article';
}

const STOP_WORDS = new Set(['and', 'of', 'to', 'the', 'in', 'on', 'for', '&', 'a']);

function stem(word) {
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem);
}

// Rule-based keyword classifier: a tag matches if all of its significant
// words appear within a small window of each other (in any order), not
// merely somewhere in the same document. Matching the exact phrase is too
// brittle (abstracts say "ACL injuries", not the literal tag string), but
// requiring only co-occurrence anywhere in the text lets common words
// (e.g. "stress", "fracture") false-match unrelated content — a materials-
// science paper on stress fracture in alloys matched our "Stress Fracture"
// tag this way during testing. A proximity window keeps the tolerance for
// word order/inflection while ruling out incidental co-occurrence.
function tagMatches(tag, haystackTokens) {
  const words = tag
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stem);
  if (words.length === 0) return false;
  if (words.length === 1) {
    return haystackTokens.includes(words[0]);
  }
  const windowSize = words.length + 3; // tolerate a couple of filler words
  for (let i = 0; i < haystackTokens.length; i++) {
    const window = haystackTokens.slice(i, i + windowSize);
    if (words.every((w) => window.includes(w))) return true;
  }
  return false;
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function classifyAndScore(article, selectedTags) {
  const haystackTokens = tokenize(`${article.title} ${article.abstract}`);
  const matchedTags = selectedTags.filter((tag) => tagMatches(tag, haystackTokens));
  const evidenceType = normaliseEvidenceType(article.pubTypes);
  const evidenceWeight = TAXONOMY.evidenceTypeWeights[evidenceType] ?? 0.3;

  const currentYear = new Date().getFullYear();
  const age = article.year ? currentYear - article.year : 10;
  const recencyScore = Math.max(0, 1 - age * 0.1);

  const topicScore = matchedTags.length * 1.0;
  const score = topicScore + evidenceWeight + recencyScore;

  const explanationParts = [];
  if (matchedTags.length > 0) {
    explanationParts.push(`matches your interest in ${matchedTags.join(', ')}`);
  }
  explanationParts.push(`evidence type: ${evidenceType}`);
  if (article.publishedDate) {
    explanationParts.push(`published ${formatDate(article.publishedDate)}`);
  } else if (article.year) {
    explanationParts.push(`published ${article.year}`);
  }

  return {
    ...article,
    evidenceType,
    matchedTags,
    score: Math.round(score * 100) / 100,
    explanation: `Recommended because it ${explanationParts.join(' • ')}.`,
  };
}

function rankRelevant(articles, selectedTags) {
  // Only surface articles that actually match at least one selected
  // interest tag — recency/evidence-quality break ties, they don't
  // substitute for topical relevance.
  return articles
    .map((a) => classifyAndScore(a, selectedTags))
    .filter((a) => a.matchedTags.length > 0)
    .sort((a, b) => b.score - a.score);
}

async function buildFeed(selectedTags) {
  const timeoutMs = 6000;
  const epmc = withTimeout((signal) => fetchEuropePMC(selectedTags, signal), timeoutMs);
  const oa = withTimeout((signal) => fetchOpenAlex(selectedTags, signal), timeoutMs);

  const [epmcResult, oaResult] = await Promise.allSettled([epmc.promise, oa.promise]);
  epmc.cancel();
  oa.cancel();

  const live = [];
  const errors = [];
  if (epmcResult.status === 'fulfilled') live.push(...epmcResult.value);
  else errors.push(`Europe PMC: ${epmcResult.reason.message}`);

  if (oaResult.status === 'fulfilled') live.push(...oaResult.value);
  else errors.push(`OpenAlex: ${oaResult.reason.message}`);

  if (live.length === 0) {
    // Both live sources failed — fall back to cached sample dataset.
    const sample = JSON.parse(fs.readFileSync(SAMPLE_FEED_PATH, 'utf8'));
    const deduped = dedupe(sample);
    const scored = rankRelevant(deduped, selectedTags);
    return { articles: scored, mode: 'cached-fallback', errors };
  }

  const deduped = dedupe(live);
  const scored = rankRelevant(deduped, selectedTags);
  return { articles: scored, mode: 'live', errors };
}

function serveStatic(req, res) {
  let urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.join(ROOT, 'public', urlPath);
  if (!filePath.startsWith(path.join(ROOT, 'public'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/docs') && !requireDocsAuth(req, res)) {
    return; // requireDocsAuth already wrote the 401 response
  }

  if (req.url === '/api/taxonomy' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(TAXONOMY));
  }

  if (req.url.startsWith('/api/feed') && req.method === 'GET') {
    try {
      const parsed = new URL(req.url, `http://localhost:${PORT}`);
      const tagsParam = parsed.searchParams.get('tags') || '';
      const selectedTags = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (selectedTags.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Select at least one interest tag.' }));
      }

      const feed = await buildFeed(selectedTags);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(feed));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Research feed prototype running at http://localhost:${PORT}`);
});
