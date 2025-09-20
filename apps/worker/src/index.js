// src/index.js
/**
 * Cloudflare Worker 入口模块
 * 功能：
 * 1) 统一 CORS 处理（基于 env.CORS_ALLOW_ORIGINS 逗号分隔名单，开发默认 "*")
 * 2) 健康检查 GET /healthz
 * 3) 占位 API GET /api/hello
 * 4) R2 列举对象 GET /api/r2-list?prefix=&limit=10
 * 5) R2 读取对象 GET /api/r2-get?key=<objectKey>
 * 6) R2 写入对象 PUT /api/r2-put?key=<objectKey> （请求体为原始字节或文本）
 * 7) EXIF 解析：
 *    - GET /api/exif?key=<objectKey>  从 R2 读取图片并解析 EXIF
 *    - GET /api/exif-url?url=<encodedUrl>  从外部 URL 获取图片并解析 EXIF（调试/对比用）
 */
import exifr from 'exifr'

export default {
  /**
   * 入口处理函数
   * @param {Request} request - 传入的 HTTP 请求对象
   * @param {Record<string, any>} env - 绑定的环境变量与服务（如 R2、KV 等）
   * @param {ExecutionContext} ctx - 执行上下文，用于异步任务
   * @returns {Promise<Response>} - 返回 HTTP 响应
   */
  async fetch(request, env, ctx) {
    // 解析 URL 与方法
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // 解析允许的跨域来源列表，优先使用 env.CORS_ALLOW_ORIGINS，未配置则为 "*"
    const allowListRaw = (env.CORS_ALLOW_ORIGINS || "*").trim();
    const allowList = allowListRaw === "*" ? ["*"] : allowListRaw.split(",").map(s => s.trim()).filter(Boolean);

    /**
     * 处理 CORS 预检请求
     * @returns {Response|null} - 若为预检请求则直接返回响应，否则返回 null 继续后续逻辑
     */
    const preflight = handlePreflight(request, allowList);
    if (preflight) return preflight;

    // 路由分发
    try {
      if (url.pathname === '/healthz' && method === 'GET') {
        return withCORS(json({ status: 'ok' }), request, allowList);
      }

      if (url.pathname === '/api/hello' && method === 'GET') {
        return withCORS(json({ message: 'Hello from Worker API' }), request, allowList);
      }

      if (url.pathname === '/api/r2-list' && method === 'GET') {
        assertR2(env);
        const prefix = url.searchParams.get('prefix') || undefined;
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        const list = await env.R2_BUCKET.list({ prefix, limit: Number.isFinite(limit) ? limit : 10 });
        return withCORS(json(list), request, allowList);
      }

      if (url.pathname === '/api/r2-get' && method === 'GET') {
        assertR2(env);
        const key = url.searchParams.get('key');
        if (!key) return withCORS(json({ error: 'Missing query param: key' }, 400), request, allowList);
        const obj = await env.R2_BUCKET.get(key);
        if (!obj) return withCORS(json({ error: 'Not Found' }, 404), request, allowList);
        // 透传对象（若为 multipart 上传可携带原始类型，这里作为字节返回）
        const headers = new Headers({ 'content-type': obj.httpMetadata?.contentType || 'application/octet-stream' });
        return withCORS(new Response(await obj.arrayBuffer(), { headers }), request, allowList);
      }

      if (url.pathname === '/api/r2-put' && method === 'PUT') {
        assertR2(env);
        const key = url.searchParams.get('key');
        if (!key) return withCORS(json({ error: 'Missing query param: key' }, 400), request, allowList);

        // 尝试推断内容类型
        const contentType = request.headers.get('content-type') || 'application/octet-stream';
        const body = await request.arrayBuffer();
        const putRes = await env.R2_BUCKET.put(key, body, {
          httpMetadata: { contentType },
        });
        return withCORS(json({ ok: true, key, etag: putRes?.etag || null }), request, allowList);
      }

      /**
       * 批量上传图片并解析 EXIF
       * 路由：POST /api/upload-batch?prefix=<可选目录前缀>&limit=<最大文件数，默认20>
       * 表单字段：多文件字段名为 "files"，可选字段 album、tags（逗号分隔）
       * 返回：每个文件的 R2 键、大小、类型以及解析到的 EXIF 简要信息
       */
      if (url.pathname === '/api/upload-batch' && method === 'POST') {
        assertR2(env);
        const form = await request.formData();
        const files = form.getAll('files');
        const album = form.get('album') || '';
        const tags = String(form.get('tags') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const prefix = url.searchParams.get('prefix') || 'uploads';
        const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10)));

        const results = [];
        let count = 0;
        for (const f of files) {
          if (!(f instanceof File)) continue;
          if (count >= limit) break;
          count++;

          const ab = await f.arrayBuffer();
          const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeName(f.name || 'image')}`;
          const contentType = f.type || 'application/octet-stream';

          await env.R2_BUCKET.put(key, ab, {
            httpMetadata: { contentType },
          });

          const exif = await safeParseExif(ab);
          results.push({ key, size: ab.byteLength, contentType, album, tags, exif });
        }

        return withCORS(json({ ok: true, count: results.length, items: results }), request, allowList);
      }

      // EXIF: 从 R2 读取并解析
      if (url.pathname === '/api/exif' && method === 'GET') {
        assertR2(env);
        const key = url.searchParams.get('key');
        if (!key) return withCORS(json({ error: 'Missing query param: key' }, 400), request, allowList);
        const obj = await env.R2_BUCKET.get(key);
        if (!obj) return withCORS(json({ error: 'Not Found' }, 404), request, allowList);
        const buf = await obj.arrayBuffer();
        const exif = await safeParseExif(buf, url.searchParams.get('debug'));
        return withCORS(json({ ok: true, key, exif }), request, allowList);
      }

      // EXIF: 从外部 URL 获取并解析（仅用于调试或外部资源测试）
      if (url.pathname === '/api/exif-url' && method === 'GET') {
        const target = url.searchParams.get('url');
        if (!target) return withCORS(json({ error: 'Missing query param: url' }, 400), request, allowList);
        const res = await fetch(target);
        if (!res.ok) return withCORS(json({ error: `Fetch failed: ${res.status}` }, 502), request, allowList);
        const buf = await res.arrayBuffer();
        const exif = await safeParseExif(buf, url.searchParams.get('debug'));
        return withCORS(json({ ok: true, source: target, exif }), request, allowList);
      }

      return withCORS(json({ error: 'Not Found' }, 404), request, allowList);
    } catch (err) {
      // 统一错误处理
      console.error('Worker error:', err);
      return withCORS(json({ error: 'Internal Server Error' }, 500), request, allowList);
    }
  },
};

/**
 * 构造 JSON 响应的帮助函数
 * @param {any} data - 要序列化为 JSON 的数据
 * @param {number} [status=200] - HTTP 状态码
 * @returns {Response} - JSON 响应
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * CORS 预检处理
 * @param {Request} request - HTTP 请求
 * @param {string[]} allowList - 允许的来源列表（若包含 "*" 则对所有来源放行）
 * @returns {Response|null} - 预检响应或 null（非预检）
 */
function handlePreflight(request, allowList) {
  if (request.method.toUpperCase() !== 'OPTIONS') return null;

  const reqOrigin = request.headers.get('Origin') || '';
  const allowAll = allowList.includes('*');
  const allowed = allowAll || allowList.includes(reqOrigin);

  const headers = new Headers();
  if (allowed) {
    headers.set('Access-Control-Allow-Origin', allowAll ? '*' : reqOrigin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return new Response(null, { status: allowed ? 204 : 403, headers });
}

/**
 * 为响应添加 CORS 头
 * @param {Response} resp - 原响应
 * @param {Request} request - 原请求（用于取 Origin）
 * @param {string[]} allowList - 允许的来源列表（若包含 "*" 则对所有来源放行）
 * @returns {Response} - 带 CORS 头的响应
 */
function withCORS(resp, request, allowList) {
  const reqOrigin = request.headers.get('Origin') || '';
  const allowAll = allowList.includes('*');
  const allowed = allowAll || allowList.includes(reqOrigin);

  const headers = new Headers(resp.headers);
  if (allowed) {
    headers.set('Access-Control-Allow-Origin', allowAll ? '*' : reqOrigin);
    headers.set('Vary', 'Origin');
  }
  return new Response(resp.body, { status: resp.status, headers });
}

/**
 * 断言已配置 R2 绑定
 * @param {Record<string, any>} env - 环境变量
 * @throws {Error} - 当未绑定 R2 时抛出错误
 */
function assertR2(env) {
  if (!env || !env.R2_BUCKET) {
    throw new Error('R2 not configured. Please set [[r2_buckets]] and binding=R2_BUCKET in wrangler.toml');
  }
}

/**
 * 安全化文件名
 * @param {string} name - 原始文件名
 * @returns {string} - 去除危险字符后的文件名
 */
function sanitizeName(name) {
  return (name || 'file')
    .replace(/[\\\n\r\t\0]/g, '-')
    .replace(/[^\w\.-]+/g, '-');
}

/**
 * 安全解析 EXIF，避免异常导致 500
 * @param {ArrayBuffer} buf - 图片二进制数据
 * @param {string|null} debugFlag - 若为 '1' 则返回解析错误信息用于调试
 * @returns {Promise<object>} - 解析出的 EXIF 字段（若失败返回空对象或包含 error 字段）
 */
async function safeParseExif(buf, debugFlag = null) {
  try {
    // exifr 默认导出提供 parse 方法，可解析 JPEG/HEIC/WEBP/PNG 中的 EXIF/XMP（若可用）
    const data = await exifr.parse(buf).catch((e) => {
      // 捕获 exifr 内部错误，返回 null 让下方统一处理
      console.error('exifr.parse inner error:', e);
      return null;
    });
    if (!data) return {};

    // 选择性返回常用字段，避免过大结构（也保留原始全量字段在 raw 中便于调试）
    const picked = {
      Make: data.Make,
      Model: data.Model,
      LensModel: data.LensModel,
      FNumber: data.FNumber,
      ExposureTime: data.ExposureTime,
      ISO: data.ISO,
      FocalLength: data.FocalLength,
      CreateDate: data.CreateDate || data.DateTimeOriginal,
      GPSLatitude: data.GPSLatitude,
      GPSLongitude: data.GPSLongitude,
      Orientation: data.Orientation,
    };
    return { ...picked, raw: data };
  } catch (e) {
    console.error('EXIF parse failed:', e);
    return debugFlag === '1' ? { error: String(e) } : {};
  }
}
