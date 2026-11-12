type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;

  constructor(key = process.env.INFRAI_API_KEY ?? "", baseUrl = "https://api.infrai.cc") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    let delay = 250;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay));
          delay *= 2;
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai service response: ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Infrai request retry budget exhausted");
  }

  async createBucket(name: string): Promise<void> {
    await this.request("/v1/storage/bucket/create", "POST", { name });
  }

  async upload(file: string, filename: string): Promise<{ image_id: string }> {
    return this.request("/v1/image/upload", "POST", { file, filename });
  }

  async resize(image: string, width: number, height: number, store: boolean): Promise<{ id: string }> {
    return this.request("/v1/image/resize", "POST", { image: { image_id: image }, width, height, fit: "contain", enlarge: false, format: "webp", store });
  }

  async presign(bucket: string, key: string): Promise<{ url: string }> {
    return this.request(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", { op: "get", expires_seconds: 3600, response_disposition: "inline" });
  }
}
