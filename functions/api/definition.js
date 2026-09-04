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

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const word = (url.searchParams.get('word') || '').trim().toLowerCase();

  if (!/^[a-z]{2,30}$/.test(word)) {
    return json({ ok: false, error: 'invalid_word' }, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'WordUnscramble.eu definition proxy',
        },
      },
    );

    if (!response.ok) {
      return json({ ok: true, found: false, word }, 200, true);
    }

    const entries = await response.json();
    const entry = Array.isArray(entries) ? entries[0] : null;
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    const meaning = meanings.find(
      (item) => Array.isArray(item?.definitions) && item.definitions.some((d) => d?.definition),
    );
    const definition = meaning?.definitions?.find((item) => item?.definition)?.definition;

    if (!definition) {
      return json({ ok: true, found: false, word }, 200, true);
    }

    return json(
      {
        ok: true,
        found: true,
        word,
        partOfSpeech: meaning?.partOfSpeech || 'Definition',
        definition,
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
