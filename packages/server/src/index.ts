import { KVNamespace, Fetcher } from "@cloudflare/workers-types";
import { Hono } from "hono";

type Bindings = {
  IMAGES: KVNamespace;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 480;
const EXPECTED_SIZE = (TARGET_WIDTH * TARGET_HEIGHT) / 8;

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

app.post("/api/upload", async (c) => {
  const body = await c.req.arrayBuffer();
  if (body.byteLength !== EXPECTED_SIZE) {
    return c.json({ error: "Invalid size" }, 400);
  }

  const hashBuffer = await crypto.subtle.digest("SHA-1", body);
  const etag = `"${bufferToHex(hashBuffer)}"`;

  await c.env.IMAGES.put("latest_binary", body, {
    metadata: { etag },
  });

  return c.json({ success: true, etag });
});

app.get("/api/image", async (c) => {
  const { value, metadata } = await c.env.IMAGES.getWithMetadata<{
    etag: string;
  }>("latest_binary", "arrayBuffer");

  if (!value) return c.text("No image", 404);

  const etag = metadata?.etag || "";
  const ifNoneMatch = c.req.header("If-None-Match");

  if (ifNoneMatch && ifNoneMatch === etag) {
    return c.body(null, 304, {
      ETag: etag,
      "Cache-Control": "no-cache",
    });
  }

  return c.body(value, 200, {
    "Content-Type": "application/octet-stream",
    ETag: etag,
    "Cache-Control": "no-cache",
  });
});

app.get("/*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
