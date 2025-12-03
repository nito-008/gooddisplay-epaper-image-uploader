import React, { useState, useRef, useEffect } from "react";

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 480;

type ObjectFitTypes = "contain" | "cover" | "fill";

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [objectFit, setObjectFit] = useState<ObjectFitTypes>("contain");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = URL.createObjectURL(file);
    }
    process();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    if (!image) return;

    const sw = image.naturalWidth;
    const sh = image.naturalHeight;
    let scale,
      x = 0,
      y = 0,
      w = TARGET_WIDTH,
      h = TARGET_HEIGHT;

    switch (objectFit) {
      case "contain":
        scale = Math.min(TARGET_WIDTH / sw, TARGET_HEIGHT / sh);
        w = sw * scale;
        h = sh * scale;
        x = (TARGET_WIDTH - w) / 2;
        y = (TARGET_HEIGHT - h) / 2;
        break;
      case "cover":
        scale = Math.max(TARGET_WIDTH / sw, TARGET_HEIGHT / sh);
        w = sw * scale;
        h = sh * scale;
        x = (TARGET_WIDTH - w) / 2;
        y = (TARGET_HEIGHT - h) / 2;
        break;
      case "fill":
        break;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, sw, sh, x, y, w, h);
    process();
  }, [image, objectFit]);

  const process = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);

    await new Promise((r) => setTimeout(r, 50));

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    const data = imageData.data;
    const w = TARGET_WIDTH;
    const h = TARGET_HEIGHT;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const gray =
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        data[idx] = data[idx + 1] = data[idx + 2] = gray;

        const oldVal = data[idx];
        const newVal = oldVal < 128 ? 0 : 255;
        const err = oldVal - newVal;

        data[idx] = data[idx + 1] = data[idx + 2] = newVal;
        data[idx + 3] = 255;

        const distribute = (dx: number, dy: number, factor: number) => {
          if (x + dx >= 0 && x + dx < w && y + dy < h) {
            const nIdx = ((y + dy) * w + (x + dx)) * 4;
            data[nIdx] += (err * factor) / 16;
            data[nIdx + 1] += (err * factor) / 16;
            data[nIdx + 2] += (err * factor) / 16;
          }
        };

        distribute(1, 0, 7);
        distribute(-1, 1, 3);
        distribute(0, 1, 5);
        distribute(1, 1, 1);
      }
    }
    ctx.putImageData(imageData, 0, 0);
    setIsProcessing(false);
  };

  const upload = async () => {
    if (!canvasRef.current) return;
    setIsUploading(true);

    await new Promise((r) => setTimeout(r, 50));

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const w = TARGET_WIDTH;
    const h = TARGET_HEIGHT;
    const imageData = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    const data = imageData.data;

    const packedData = new Uint8Array((w * h) / 8);
    for (let i = 0; i < w * h; i++) {
      const isWhite = data[i * 4] > 127;
      if (!isWhite) {
        packedData[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
      }
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: packedData,
      });
      alert(
        res.ok ? "アップロードに成功しました" : "アップロードに失敗しました"
      );
    } catch (e) {
      console.error(e);
      alert("Error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        margin: "2rem auto",
        textAlign: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h1>電子ペーパー画像アップローダー</h1>
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "24px",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={isProcessing}
        />
        <div>
          <p>Object Fit: </p>
          <select
            value={objectFit}
            onChange={(e) => setObjectFit(e.target.value as ObjectFitTypes)}
            disabled={isProcessing}
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="fill">Fill</option>
          </select>
        </div>
        <button onClick={upload} disabled={isUploading || !image}>
          {isUploading ? "アップロード中..." : "アップロードする"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={TARGET_WIDTH}
        height={TARGET_HEIGHT}
        style={{ border: "1px solid #ccc", maxWidth: "100%" }}
      />
    </div>
  );
}

export default App;
