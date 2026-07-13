const state = {
  selected: new Set(['ACL Injury', 'Return to Play Protocols']),
};

const GROUP_LABELS = {
  clinicalAreas: 'Clinical areas',
  conditions: 'Conditions',
  interventions: 'Interventions',
};

async function loadTaxonomy() {
  const res = await fetch('/api/taxonomy');
  return res.json();
}

function renderTagGroups(taxonomy) {
  const container = document.getElementById('tag-groups');
  container.innerHTML = '';
  for (const groupKey of ['clinicalAreas', 'conditions', 'interventions']) {
    const tags = taxonomy[groupKey] || [];
    const group = document.createElement('div');
    group.className = 'tag-group';

    const heading = document.createElement('h3');
    heading.textContent = GROUP_LABELS[groupKey] || groupKey;
    group.appendChild(heading);

    for (const tag of tags) {
      const chip = document.createElement('span');
      chip.className = 'tag-chip' + (state.selected.has(tag) ? ' selected' : '');
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        if (state.selected.has(tag)) state.selected.delete(tag);
        else state.selected.add(tag);
        chip.classList.toggle('selected');
      });
      group.appendChild(chip);
    }
    container.appendChild(group);
  }
}

function formatArticle(article) {
  const wrapper = document.createElement('div');
  wrapper.className = 'article';

  const title = document.createElement('p');
  title.className = 'article-title';
  if (article.url) {
    const link = document.createElement('a');
    link.href = article.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = article.title || '(untitled)';
    title.appendChild(link);
  } else {
    title.textContent = article.title || '(untitled)';
  }
  wrapper.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'article-meta';
  const dateLabel = article.publishedDate
    ? new Date(article.publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : article.year;
  meta.textContent = [article.journal, dateLabel, article.source].filter(Boolean).join(' • ');
  wrapper.appendChild(meta);

  const explanation = document.createElement('span');
  explanation.className = 'article-explanation';
  explanation.textContent = article.explanation;
  wrapper.appendChild(explanation);

  return wrapper;
}

async function loadFeed() {
  const feedEl = document.getElementById('feed');
  const statusEl = document.getElementById('feed-status');
  const button = document.getElementById('load-feed');

  const tags = Array.from(state.selected);
  if (tags.length === 0) {
    feedEl.innerHTML = '<p class="empty-state">Select at least one interest tag above.</p>';
    return;
  }

  button.disabled = true;
  statusEl.textContent = 'Loading…';
  statusEl.className = 'status';
  feedEl.innerHTML = '<p class="empty-state">Fetching from Europe PMC and OpenAlex…</p>';

  try {
    const res = await fetch(`/api/feed?tags=${encodeURIComponent(tags.join(','))}`);
    const data = await res.json();

    if (data.error) {
      feedEl.innerHTML = `<p class="empty-state">Error: ${data.error}</p>`;
      statusEl.textContent = '';
      return;
    }

    if (data.mode === 'live') {
      statusEl.textContent = 'Live data (Europe PMC + OpenAlex)';
      statusEl.className = 'status live';
    } else {
      statusEl.textContent = 'Offline fallback — showing cached sample dataset';
      statusEl.className = 'status cached-fallback';
    }

    feedEl.innerHTML = '';
    if (data.articles.length === 0) {
      feedEl.innerHTML = '<p class="empty-state">No articles matched. Try different tags.</p>';
      return;
    }
    for (const article of data.articles) {
      feedEl.appendChild(formatArticle(article));
    }
  } catch (err) {
    feedEl.innerHTML = `<p class="empty-state">Request failed: ${err.message}</p>`;
  } finally {
    button.disabled = false;
  }
}

async function init() {
  const taxonomy = await loadTaxonomy();
  renderTagGroups(taxonomy);
  document.getElementById('load-feed').addEventListener('click', loadFeed);
  loadFeed();
}

init();
