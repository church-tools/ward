export const onRequest: PagesFunction = async (context) => {
  if (context.request.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method Not Allowed" }),
      {
        status: 405,
        headers: { "content-type": "application/json" },
      }
    );
  }

  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId") ?? "";

  if (!userId) {
    return new Response(JSON.stringify({ ok: false, error: "Missing userId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // TODO: Wire your approval logic here.

  return new Response(JSON.stringify({ ok: true, userId }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
