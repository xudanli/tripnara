# 行程生成接口故障排查指南

## 常见问题

### 1. LLM 超时错误

#### 症状
- 接口请求长时间无响应（> 5分钟）
- 返回错误：`行程生成超时（XX秒）`
- 日志显示 `ETIMEDOUT` 或 `timeout`

#### 原因
- 默认超时时间：5分钟（300秒）
- 行程天数较多，AI 生成时间长
- 网络延迟或 LLM 服务响应慢

#### 解决方案

##### 方案 1: 调整超时时间（如需要）

在 `.env` 文件中设置：

```env
# 默认超时时间：5 分钟（300000 毫秒）
LLM_TIMEOUT_MS=300000

# 如需更长时间（例如 6 分钟）
LLM_TIMEOUT_MS=360000
```

##### 方案 2: 减少行程天数

如果生成 5 天以上行程经常超时，建议：
- 分多次生成（例如：先生成 3 天，再生成后续天数）
- 或减少到 3-5 天

##### 方案 3: 检查网络连接

```bash
# 测试 DeepSeek API 连接
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

### 2. AI 服务调用失败

#### 症状
- 返回错误：`AI服务调用失败: ...`
- 状态码：500

#### 原因
- API Key 无效或过期
- API 配额用完
- 服务暂时不可用

#### 解决方案

##### 检查 API Key

```bash
# 检查环境变量
echo $DEEPSEEK_API_KEY

# 验证 API Key 格式（应该以 sk- 开头）
```

##### 验证 API Key 有效性

```bash
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### 3. JSON 解析错误

#### 症状
- 返回错误：`AI响应缺少days字段或格式不正确`
- AI 返回了非 JSON 格式的数据

#### 原因
- AI 返回了额外的文字说明
- JSON 格式不完整或损坏

#### 解决方案

系统已自动处理：
- 使用 `json: true` 参数强制 JSON 模式
- 自动修复不完整的 JSON
- 验证响应结构

如果仍然失败，检查日志中的原始响应。

### 4. 响应不完整

#### 症状
- 返回的行程天数少于请求的天数
- 某些天的活动为空

#### 原因
- Token 限制（`maxOutputTokens`）不足
- AI 生成被截断

#### 解决方案

已优化：
- `maxOutputTokens` 已增加到 4000
- 如果仍然不够，可以进一步增加

在代码中修改：
```typescript
maxOutputTokens: 6000, // 增加到 6000
```

## 性能优化建议

### 1. 超时配置

默认超时时间已设置为 5 分钟（300秒），适用于大多数场景：

| 行程天数 | 预计生成时间 | 超时设置 |
|---------|------------|---------|
| 1-3 天  | 10-20 秒   | 5 分钟（默认）|
| 4-7 天  | 20-40 秒   | 5 分钟（默认）|
| 8-15 天 | 40-60 秒   | 5 分钟（默认）|
| 15+ 天  | 60-120 秒  | 5 分钟（默认，如需要可增加到 6-10 分钟）|

### 2. 重试机制

系统已实现自动重试：
- 默认重试次数：3 次（`LLM_MAX_RETRIES`）
- 重试延迟：递增（500ms, 1000ms, 1500ms）
- 仅对 429（限流）和 5xx（服务器错误）重试

### 3. 日志监控

查看详细日志：

```bash
# 查看应用日志
tail -f /path/to/logs/app.log | grep ItineraryService

# 或查看控制台输出
npm run start:dev
```

关键日志：
- `Generating itinerary for destination: ...` - 开始生成
- `Itinerary generation completed in XXms` - 生成成功
- `LLM request failed after XXms` - 生成失败

## 环境变量配置

### 推荐配置

```env
# LLM 超时配置（毫秒）- 行程生成默认 5 分钟
LLM_TIMEOUT_MS=300000

# LLM 重试次数
LLM_MAX_RETRIES=3

# DeepSeek API 配置
DEEPSEEK_API_KEY=sk-your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

### 生产环境建议

```env
# 默认超时时间已足够，支持复杂行程
LLM_TIMEOUT_MS=300000

# 如需支持超长行程（15+ 天），可增加到 6-10 分钟
# LLM_TIMEOUT_MS=360000  # 6 分钟
# LLM_TIMEOUT_MS=600000  # 10 分钟

# 更多重试次数
LLM_MAX_RETRIES=5
```

## 错误处理最佳实践

### 前端处理

```typescript
try {
  const response = await generateItinerary(request, token);
  // 处理成功
} catch (error) {
  if (error.response?.status === 400) {
    const message = error.response.data.message;
    
    if (message.includes('超时')) {
      // 超时错误
      showError('生成时间较长，请稍后重试或减少行程天数');
    } else if (message.includes('AI服务')) {
      // AI 服务错误
      showError('AI服务暂时不可用，请稍后重试');
    } else {
      // 其他错误
      showError(message);
    }
  }
}
```

### 重试策略

```typescript
async function generateItineraryWithRetry(
  request: GenerateItineraryRequest,
  token: string,
  maxRetries = 2
): Promise<GenerateItineraryResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateItinerary(request, token);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## 监控指标

建议监控以下指标：

1. **平均响应时间**: 正常应在 10-30 秒
2. **超时率**: 应 < 5%
3. **成功率**: 应 > 95%
4. **Token 使用量**: 监控 API 配额

## 联系支持

如果问题持续存在：
1. 检查日志文件中的详细错误信息
2. 验证 API Key 和网络连接
3. 尝试减少行程天数测试
4. 查看 DeepSeek API 状态页面

