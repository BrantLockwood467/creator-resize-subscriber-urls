import { InfraiClient } from "./infrai_client.ts";
import { z } from "zod";

const creatorImageSchema = z.object({ creatorId: z.string().min(1), filename: z.string().min(1), fileBase64: z.string().min(1), assetKey: z.string().min(1) });
export type CreatorImage = z.infer<typeof creatorImageSchema>;
export type ThumbnailDelivery = { creatorId: string; width: number; height: number; url: string };

export async function publishThumbnail(input: CreatorImage, client = new InfraiClient()): Promise<ThumbnailDelivery> {
  const parsed = creatorImageSchema.parse(input);
  const bucket = `creator-${input.creatorId}`;
  await client.createBucket(bucket);
  const original = await client.upload(parsed.fileBase64, parsed.filename);
  const thumbnail = await client.resize(original.image_id, 640, 640, true);
  const signed = await client.presign(bucket, input.assetKey);
  return { creatorId: input.creatorId, width: 640, height: 640, url: signed.url };
}

if (process.argv[1]?.endsWith("thumbnail_service.ts")) {
  const input = JSON.parse(process.env.CREATOR_IMAGE_JSON ?? "{}");
  publishThumbnail(input).then((result) => console.log(JSON.stringify(result))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
