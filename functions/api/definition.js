function json(data, status = 200, cache = false) {
  const headers = {
    'content-type': 'application/json; charset=UTF-8',
    'X-Content-Type-Options': 'nosniff',
  };
  headers['cache-control'] = cache
    ? 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000'
    : 'no-store';
  return new Response(JSON.stringify(data), { status, headers });
}

function parseDatamuseDefinition(item) {
  if (!item || !Array.isArray(item.defs) || !item.defs.length) return null;
  const raw = item.defs.find(Boolean);
  if (!raw) return null;
  const tab = raw.indexOf('\t');
  const code = tab >= 0 ? raw.slice(0, tab) : '';
  const definition = tab >= 0 ? raw.slice(tab + 1) : raw;
  const parts = {
    n: 'noun',
    v: 'verb',
    adj: 'adjective',
    adv: 'adverb',
    u: 'definition',
  };
  return {
    partOfSpeech: parts[code] || code || 'Definition',
    definition: definition.trim(),
  };
}

async function lookupDatamuse(word, signal) {
  const response = await fetch(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=8`,
    { signal, headers: { accept: 'application/json' } },
  );
  if (!response.ok) return null;
  const items = await response.json();
  if (!Array.isArray(items)) return null;
  const exact = items.find((item) => String(item?.word || '').toLowerCase() === word);
  return parseDatamuseDefinition(exact);
}

async function lookupFreeDictionary(word, signal) {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    { signal, headers: { accept: 'application/json' } },
  );
  if (!response.ok) return null;
  const entries = await response.json();
  const entry = Array.isArray(entries) ? entries[0] : null;
  const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
  const meaning = meanings.find(
    (item) => Array.isArray(item?.definitions) && item.definitions.some((d) => d?.definition),
  );
  const definition = meaning?.definitions?.find((item) => item?.definition)?.definition;
  if (!definition) return null;
  return {
    partOfSpeech: meaning?.partOfSpeech || 'Definition',
    definition,
  };
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const word = (url.searchParams.get('word') || '').trim().toLowerCase();

  if (!/^[a-z]{2,30}$/.test(word)) {
    return json({ ok: false, error: 'invalid_word' }, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);

  try {
    let result = null;

    try {
      result = await lookupDatamuse(word, controller.signal);
    } catch {
      result = null;
    }

    if (!result) {
      try {
        result = await lookupFreeDictionary(word, controller.signal);
      } catch {
        result = null;
      }
    }

    if (!result?.definition) {
      return json({ ok: true, found: false, word }, 200, true);
    }

    return json(
      {
        ok: true,
        found: true,
        word,
        partOfSpeech: result.partOfSpeech || 'Definition',
        definition: result.definition,
        source: 'Datamuse / lexical dictionary data',
      },
      200,
      true,
    );
  } catch {
    return json({ ok: false, error: 'definition_service_unavailable', word }, 503);
  } finally {
    clearTimeout(timer);
  }
}
