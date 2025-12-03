import { Hono } from "hono";
import { Fetcher, KVNamespace } from "@cloudflare/workers-types";

type Bindings = {
  IMAGES: KVNamespace;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 480;
const EXPECTED_SIZE = (TARGET_WIDTH * TARGET_HEIGHT) / 8;

app.post("/api/upload", async (c) => {
  const body = await c.req.arrayBuffer();
  if (body.byteLength !== EXPECTED_SIZE) {
    return c.json({ error: "Invalid size" }, 400);
  }
  await c.env.IMAGES.put("latest_binary", body);
  return c.json({ success: true });
});

app.get("/api/image", async (c) => {
  const image = await c.env.IMAGES.get("latest_binary", "arrayBuffer");
  if (!image) return c.text("No image", 404);

  return c.body(image, 200, {
    "Content-Type": "application/octet-stream",
    "Cache-Control": "no-store",
  });
});

app.get("/*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
