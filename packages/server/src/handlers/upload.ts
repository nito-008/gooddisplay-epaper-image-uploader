import { Context } from "hono";
import { Bindings } from "../types";

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 480;
const EXPECTED_FILE_SIZE = (TARGET_WIDTH * TARGET_HEIGHT) / 8; // 48000 bytes

export const handleUpload = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.arrayBuffer();

  if (body.byteLength !== EXPECTED_FILE_SIZE) {
    return c.text(
      `Invalid file size. Expected ${EXPECTED_FILE_SIZE} bytes, got ${body.byteLength}.`,
      400
    );
  }

  await c.env.IMAGES.put("latest_binary", body);
  return c.text("OK");
};
