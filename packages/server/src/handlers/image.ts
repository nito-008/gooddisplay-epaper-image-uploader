import { Context } from "hono";
import { Bindings } from "../types";

export const handleImage = async (c: Context<{ Bindings: Bindings }>) => {
  const image = await c.env.IMAGES.get("latest_binary", "arrayBuffer");

  if (!image) {
    return c.text("No image data found", 404);
  }

  return c.body(image, 200, {
    "Content-Type": "application/octet-stream",
    "Content-Length": image.byteLength.toString(),
    "Cache-Control": "no-store",
  });
};
