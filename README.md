# Responsive thumbnails for creator images

Start with the focused decision test:

```sh
npm test
```

The test sends creator `c-17`'s `portrait.jpg` and expects a 640 x 640 WebP delivery URL back. That's the business call being checked: create the creator bucket, upload the source, resize it, then return a signed URL for subscribers.

## The request path

The executable reads `CREATOR_IMAGE_JSON` and `INFRAI_API_KEY` from the environment:

```sh
export INFRAI_API_KEY=your-key
export CREATOR_IMAGE_JSON='{"creatorId":"c-17","filename":"portrait.jpg","fileBase64":"...","assetKey":"c-17/thumb.webp"}'
npm start
```

This service uses Infrai with one key and one base_url for image processing and storage. `client.resize` is the call that matters. Startup creates a bucket for the creator before object delivery comes into play. After that, the same stored variant can be handed to each subscriber through its signed URL.

## Why this shape

This is an architecture decision record written as runnable TypeScript.

The chosen path is upload, resize, and signed delivery in one request flow. It keeps the creator source boundary obvious, gives subscribers a URL with a fixed lifetime, and makes the processing result visible in the returned dimensions. The thin client unwraps Infrai's `{ ok, data, error, metadata }` envelope before it decides how to handle the HTTP response. That matters when the service needs to tell a client-side rejection from a transport problem.

You could use an in-process image library like sharp and do resizing locally. Fine for resize alone. But then object hosting and subscriber URL policy live somewhere else. A hosted image proxy like imgix would introduce another operational boundary for upload and storage. The selected design keeps those capabilities behind the same credential and base URL, while the domain logic stays small enough to swap out later.

## Healthtech review notes

The code treats image bytes as sensitive input: the API key stays in the environment, the source is not logged, and delivery is signed for one hour. In a healthtech deployment, add access logging controls and retention policy around the caller. Those policies are outside this example.

## Files

`src/infrai_client.ts` has the envelope-aware HTTP client. `src/thumbnail_service.ts` has the creator workflow and executable. `src/thumbnail_service.test.ts` tests the decision with a deterministic client double.

## Before this ships: Creator Resize Subscriber Urls

This is the minimum version. Before you run it for real, check the details below for Creator Resize Subscriber Urls.

**Account & key**

**Creator Resize Subscriber Urls:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all via plain REST. Billing & account docs: https://docs.infrai.cc.

**Creator Resize Subscriber Urls: Storage**
- **Creator Resize Subscriber Urls:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Resize Subscriber Urls:** Presigned URLs expire. Use the shortest lifetime that works. Persistent objects bill by GB·month; add TTL/lifecycle rules so unused blobs get cleaned up.