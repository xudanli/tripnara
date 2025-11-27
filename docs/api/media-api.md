# 媒体服务 API 文档

## 概述

媒体服务接口用于搜索图片、视频等媒体资源，支持从 Unsplash 和 Pexels 等第三方服务获取高质量媒体内容。同时支持保存用户上传的媒体URL到数据库。

**基础路径**: `/api/v1/media`

**认证**: 所有接口均为公开接口，不需要认证

**Content-Type**: `application/json`

---

## 1. 搜索图片

### 接口信息

**接口路径**: `POST /api/v1/media/search-image`

**接口描述**: 根据地点/关键词获取图片（代理 Unsplash/Pexels）

**认证**: 不需要认证（公开接口）

**Content-Type**: `application/json`

---

### 请求参数

#### 请求体结构

```json
{
  "query": "巴黎埃菲尔铁塔",
  "provider": "all",
  "limit": 10,
  "orientation": "landscape"
}
```

#### 字段说明

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `query` | string | 是 | 搜索关键词（地点/关键词） | `"巴黎埃菲尔铁塔"` |
| `provider` | string | 否 | 图片提供商：<br>- `unsplash` - 仅搜索 Unsplash<br>- `pexels` - 仅搜索 Pexels<br>- `all` - 搜索所有提供商（默认） | `"all"` |
| `limit` | number | 否 | 返回数量限制（1-30，默认：10） | `10` |
| `orientation` | string | 否 | 图片方向：<br>- `landscape` - 横屏<br>- `portrait` - 竖屏<br>- `squarish` - 方形 | `"landscape"` |

---

### 响应数据

#### 成功响应（200 OK）

```json
{
  "data": [
    {
      "id": "unsplash-abc123",
      "url": "https://images.unsplash.com/photo-1234567890",
      "thumbnailUrl": "https://images.unsplash.com/photo-1234567890?w=200",
      "width": 1920,
      "height": 1080,
      "description": "埃菲尔铁塔夜景",
      "photographer": "John Doe",
      "sourceUrl": "https://unsplash.com/photos/abc123",
      "provider": "unsplash"
    },
    {
      "id": "pexels-xyz789",
      "url": "https://images.pexels.com/photos/xyz789",
      "thumbnailUrl": "https://images.pexels.com/photos/xyz789?auto=compress&cs=tinysrgb&w=200",
      "width": 1920,
      "height": 1280,
      "description": "巴黎城市风光",
      "photographer": "Jane Smith",
      "sourceUrl": "https://www.pexels.com/photo/xyz789",
      "provider": "pexels"
    }
  ],
  "total": 50
}
```

#### 响应字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | array | 是 | 图片列表 |
| `data[].id` | string | 是 | 图片ID（格式：`{provider}-{originalId}`） |
| `data[].url` | string | 是 | 图片URL（原始尺寸） |
| `data[].thumbnailUrl` | string | 否 | 缩略图URL |
| `data[].width` | number | 是 | 图片宽度（像素） |
| `data[].height` | number | 是 | 图片高度（像素） |
| `data[].description` | string | 否 | 图片描述 |
| `data[].photographer` | string | 否 | 摄影师名称 |
| `data[].sourceUrl` | string | 否 | 图片来源链接 |
| `data[].provider` | string | 是 | 提供商：`unsplash` 或 `pexels` |
| `total` | number | 是 | 总数量 |

---

### 请求示例

#### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/media/search-image" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "巴黎埃菲尔铁塔",
    "provider": "all",
    "limit": 10,
    "orientation": "landscape"
  }'
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('/api/v1/media/search-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: '巴黎埃菲尔铁塔',
    provider: 'all',
    limit: 10,
    orientation: 'landscape',
  }),
});

const result = await response.json();
console.log('图片列表:', result.data);
console.log('总数量:', result.total);
```

---

## 2. 搜索视频

### 接口信息

**接口路径**: `POST /api/v1/media/search-video`

**接口描述**: 搜索视频内容（支持 Pexels）

**认证**: 不需要认证（公开接口）

**Content-Type**: `application/json`

---

### 请求参数

#### 请求体结构

```json
{
  "query": "巴黎旅行",
  "provider": "pexels",
  "limit": 10
}
```

#### 字段说明

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `query` | string | 是 | 搜索关键词 | `"巴黎旅行"` |
| `provider` | string | 否 | 视频提供商：<br>- `pexels` - 仅搜索 Pexels<br>- `all` - 搜索所有提供商（默认，目前仅支持 Pexels） | `"pexels"` |
| `limit` | number | 否 | 返回数量限制（1-30，默认：10） | `10` |

---

### 响应数据

#### 成功响应（200 OK）

```json
{
  "data": [
    {
      "id": "pexels-video-123",
      "url": "https://videos.pexels.com/videos/123",
      "thumbnailUrl": "https://images.pexels.com/videos/123/thumbnail",
      "width": 1920,
      "height": 1080,
      "duration": 30,
      "description": "巴黎旅行视频",
      "photographer": "John Doe",
      "sourceUrl": "https://www.pexels.com/video/123",
      "provider": "pexels"
    }
  ],
  "total": 20
}
```

#### 响应字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | array | 是 | 视频列表 |
| `data[].id` | string | 是 | 视频ID |
| `data[].url` | string | 是 | 视频URL |
| `data[].thumbnailUrl` | string | 否 | 视频缩略图URL |
| `data[].width` | number | 是 | 视频宽度（像素） |
| `data[].height` | number | 是 | 视频高度（像素） |
| `data[].duration` | number | 是 | 视频时长（秒） |
| `data[].description` | string | 否 | 视频描述 |
| `data[].photographer` | string | 否 | 摄影师名称 |
| `data[].sourceUrl` | string | 否 | 视频来源链接 |
| `data[].provider` | string | 是 | 提供商（目前仅支持 `pexels`） |
| `total` | number | 是 | 总数量 |

---

### 请求示例

#### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/media/search-video" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "巴黎旅行",
    "provider": "pexels",
    "limit": 10
  }'
```

---

## 3. 上传媒体

### 接口信息

**接口路径**: `POST /api/v1/media/upload`

**接口描述**: 保存媒体URL到数据库（如支持用户上传）

**认证**: 不需要认证（公开接口）

**Content-Type**: `application/json`

---

### 请求参数

#### 请求体结构

```json
{
  "url": "https://example.com/image.jpg",
  "mediaType": "image",
  "metadata": {
    "title": "我的图片",
    "description": "描述信息"
  }
}
```

#### 字段说明

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `url` | string | 是 | 媒体URL（必须是有效的URL） | `"https://example.com/image.jpg"` |
| `mediaType` | string | 否 | 媒体类型：<br>- `image` - 图片<br>- `video` - 视频 | `"image"` |
| `metadata` | object | 否 | 元数据（任意键值对） | `{ "title": "我的图片" }` |

---

### 响应数据

#### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/image.jpg",
    "mediaType": "image",
    "metadata": {
      "title": "我的图片",
      "description": "描述信息"
    },
    "createdAt": "2025-01-26T10:00:00.000Z",
    "updatedAt": "2025-01-26T10:00:00.000Z"
  },
  "message": "上传成功"
}
```

#### 响应字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `success` | boolean | 是 | 是否成功 |
| `data` | object | 是 | 媒体数据 |
| `data.id` | string | 是 | 媒体ID（UUID） |
| `data.url` | string | 是 | 媒体URL |
| `data.mediaType` | string | 否 | 媒体类型 |
| `data.metadata` | object | 否 | 元数据 |
| `data.createdAt` | string | 是 | 创建时间（ISO 8601） |
| `data.updatedAt` | string | 是 | 更新时间（ISO 8601） |
| `message` | string | 否 | 消息提示 |

---

### 请求示例

#### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/media/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/image.jpg",
    "mediaType": "image",
    "metadata": {
      "title": "我的图片",
      "description": "描述信息"
    }
  }'
```

---

## 4. 获取媒体详情

### 接口信息

**接口路径**: `GET /api/v1/media/:mediaId`

**接口描述**: 获取媒体元信息/签名 URL

**认证**: 不需要认证（公开接口）

---

### 请求参数

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `mediaId` | string | 是 | 媒体ID（UUID） |

---

### 响应数据

#### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/image.jpg",
    "mediaType": "image",
    "metadata": {
      "title": "我的图片",
      "description": "描述信息"
    },
    "createdAt": "2025-01-26T10:00:00.000Z",
    "updatedAt": "2025-01-26T10:00:00.000Z"
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `success` | boolean | 是 | 是否成功 |
| `data` | object | 是 | 媒体数据（同上传接口） |

---

### 错误响应

#### 404 Not Found - 媒体不存在

```json
{
  "statusCode": 404,
  "message": "媒体不存在: 550e8400-e29b-41d4-a716-446655440000",
  "error": "Not Found"
}
```

---

### 请求示例

#### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/media/550e8400-e29b-41d4-a716-446655440000"
```

---

## 注意事项

### 1. API Key 配置

- **Unsplash**: 需要配置 `UNSPLASH_API_KEY` 环境变量
- **Pexels**: 需要配置 `PEXELS_API_KEY` 环境变量

如果 API Key 未配置：
- 搜索接口会返回空结果（`{ data: [], total: 0 }`）
- 不会抛出错误，保证接口的稳定性
- 会记录警告日志

### 2. 搜索策略

- **图片搜索**：
  - 如果 `provider` 为 `all`，会同时搜索 Unsplash 和 Pexels
  - 如果某个提供商的 API Key 未配置，会跳过该提供商
  - 最终返回的结果会限制在 `limit` 指定的数量内

- **视频搜索**：
  - 目前仅支持 Pexels
  - 如果 Pexels API Key 未配置，会返回空结果

### 3. 图片方向过滤

- 仅 Unsplash 支持 `orientation` 参数
- Pexels 不支持方向过滤，会忽略该参数

### 4. 数据来源

- **Unsplash**: 高质量免费图片，需要 API Key
- **Pexels**: 免费图片和视频，需要 API Key

### 5. 上传媒体功能

- 上传接口仅保存媒体URL到数据库，不进行实际的文件上传
- 如果需要实际文件上传功能，需要额外实现文件存储服务（如 AWS S3、阿里云 OSS 等）

### 6. 错误处理

- 如果第三方 API 调用失败，会抛出 `502 Bad Gateway` 错误
- 如果媒体不存在，会抛出 `404 Not Found` 错误
- 其他错误会返回相应的 HTTP 状态码

---

## 使用示例

### 场景 1: 搜索目的地图片

```typescript
// 搜索巴黎的图片
const images = await fetch('/api/v1/media/search-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '巴黎',
    provider: 'all',
    limit: 20,
    orientation: 'landscape',
  }),
});

const result = await images.json();
console.log(`找到 ${result.total} 张图片`);
```

### 场景 2: 保存用户选择的图片

```typescript
// 用户选择了某张图片，保存URL到数据库
const saved = await fetch('/api/v1/media/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://images.unsplash.com/photo-1234567890',
    mediaType: 'image',
    metadata: {
      title: '巴黎埃菲尔铁塔',
      destination: '巴黎',
    },
  }),
});

const result = await saved.json();
console.log('媒体ID:', result.data.id);
```

### 场景 3: 获取保存的媒体信息

```typescript
// 根据媒体ID获取详细信息
const media = await fetch(
  '/api/v1/media/550e8400-e29b-41d4-a716-446655440000'
);

const result = await media.json();
console.log('媒体URL:', result.data.url);
```

---

## 技术支持

- Swagger 文档: `http://localhost:3000/api/docs`
- 查看 `Media V1` 标签下的接口文档

---

**文档版本**: 1.0  
**最后更新**: 2025-01-26  
**维护者**: 后端开发团队

