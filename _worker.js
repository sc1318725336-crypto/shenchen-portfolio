export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.shenchen.click") {
      url.protocol = "https:";
      url.hostname = "shenchen.click";
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};