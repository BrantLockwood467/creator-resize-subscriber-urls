import assert from "node:assert/strict";
import { publishThumbnail } from "./thumbnail_service.ts";

class FakeClient {
  calls: string[] = [];
  async createBucket(name: string) { this.calls.push(`bucket:${name}`); }
  async upload(file: string, filename: string) { this.calls.push(`upload:${filename}:${file}`); return { image_id: "source-1" }; }
  async resize(image: string, width: number, height: number, store: boolean) { this.calls.push(`resize:${image}:${width}x${height}:${store}`); return { id: "thumb-1" }; }
  async presign(bucket: string, key: string) { this.calls.push(`presign:${bucket}:${key}`); return { url: "https://cdn.example/thumb.webp" }; }
}

const client = new FakeClient();
const result = await publishThumbnail({ creatorId: "c-17", filename: "portrait.jpg", fileBase64: "data", assetKey: "c-17/thumb.webp" }, client as never);
assert.deepEqual(result, { creatorId: "c-17", width: 640, height: 640, url: "https://cdn.example/thumb.webp" });
assert.deepEqual(client.calls, ["bucket:creator-c-17", "upload:portrait.jpg:data", "resize:source-1:640x640:true", "presign:creator-c-17:c-17/thumb.webp"]);
console.log("thumbnail decision test passed");
