# Next.js 16 Static Export + Docker + Nginx + Runtime Environment Variables

This project demonstrates how to deploy a **Next.js 16 application** using:

- **Static Export** (`output: "export"`)
- **Docker & Docker Compose**
- **Nginx static hosting**
- **Dynamic runtime environment variables** (without rebuilding)
- **Runtime `env.js` injection using entrypoint scripts**

This setup ensures you can deploy the same image to **dev / staging / production**, and inject environment variables at runtime instead of baking them during the build.

---

## 🚀 Why This Setup?

By default, Next.js environment variables (`NEXT_PUBLIC_*`) are **baked into the build** and cannot be changed at runtime.

This is a problem for containerized deployments because:

- You need different API URLs for dev, staging, prod
- You should not rebuild images just to change env variables
- Static export has **no Node.js server**, so `process.env` does not work in the browser

### ✔ This project solves that by:

1. Using `output: "export"` (Next.js 16)
2. Serving static files with **Nginx**
3. Injecting runtime environment variables into `/env.js`
4. Loading `/env.js` before the app loads
5. Reading env values using `window.env.*`

Result:

> **You can now inject dynamic env variables at runtime WITHOUT rebuilding your Docker image.**

---

## 📁 Project Structure

```
.
├── next.config.ts
├── package.json
├── Dockerfile
├── docker-compose.yml
├── entrypoint.sh
├── env.template.js
├── types
│    └── env.d.ts
└── public/
    └── ... (Next.js static files)
```

---

## ⚙️ Next.js Configuration (Static Export)

Next.js 16 removed `next export`.  
Static export is enabled through `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Enables static export
};

export default nextConfig;
```

When running `npm run build`, the static files are generated inside:

```
/out
```

---

## 🐳 Dockerfile (Two-Stage Build)

```dockerfile
# ---- Stage 1: Build Next.js ----
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build  # Output will be in /app/out

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY --from=builder /app/out ./

# Copy runtime env injection files
COPY env.template.js ./env.template.js
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔧 Runtime Environment Injection

### `env.template.js`

```js
window.env = {
  API_URL: "$API_URL",
  NODE_ENV: "$NODE_ENV"
};
```

Placeholders (`$API_URL`, `$NODE_ENV`) are replaced at container **startup**, not build time.

---

### `entrypoint.sh`

```bash
#!/bin/sh
set -e

envsubst < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js

exec "$@"
```

---

## 🧩 TypeScript Support (`env.d.ts`)

Since we are accessing runtime variables using `window.env`, TypeScript needs to know that this object exists.

Create a file named **`env.d.ts`** in the project root:

```ts
export {};

declare global {
  interface Window {
    env: {
      API_URL: string;
      NODE_ENV: string;
      [key: string]: string;
    };
  }
}
```

This prevents:

```
Property 'env' does not exist on type 'Window'.
```

Now TypeScript fully understands `window.env.API_URL`.

---

## 📄 Loading env.js in your App

Inside `_document.tsx`:

```tsx
<script src="/env.js"></script>
```

This ensures `window.env` loads before your Next.js app executes.

---

## 🎯 Using Runtime Env In Your Next.js App

```tsx
"use client";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    console.log("API URL:", window.env.API_URL);
  }, []);

  return <div>API URL: {window.env.API_URL}</div>;
}
```

---

## 🐳 docker-compose.yml

```yaml
services:
  nextapp:
    build: .
    ports:
      - "8000:80"
    environment:
      - API_URL=https://api.production.com
      - NODE_ENV=production
```

---

## 🏗 Run the App

### Build:
```bash
docker compose build --no-cache
```

### Start:
```bash
docker compose up
```

### App runs at:
```
http://localhost:8000
```

---

## 🔥 Why This Works

| Feature | Explanation |
|--------|-------------|
| Static export | Pure HTML/JS bundle served by Nginx |
| No Node server | Fully client-side rendering |
| Runtime env.js | Injects environment variables dynamically |
| Docker entrypoint | Generates `env.js` every time container starts |
| No rebuild needed | Env values changed via docker-compose |

---

## 🧪 Adding New Env Variables

1. Add to `env.template.js`:
```js
MY_KEY: "$MY_KEY"
```

2. Add to `docker-compose.yml`:
```yaml
environment:
  - MY_KEY=12345
```

3. Use in Next.js:
```tsx
console.log(window.env.MY_KEY)
```

No rebuild required.

---

## 🏁 Conclusion

This setup is production-grade and provides full runtime configuration support for Next.js static export deployments. Reuse the same Docker image for any environment and inject values dynamically.

---

## ⭐ Optional Enhancements

- Add Nginx caching headers  
- Enable gzip/brotli compression  
- Add health checks  
- Integrate CI/CD
