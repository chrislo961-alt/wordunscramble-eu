export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.protocol !== 'https:' || url.hostname === 'www.wordunscramble.eu') {
    url.protocol = 'https:';
    url.hostname = 'wordunscramble.eu';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
