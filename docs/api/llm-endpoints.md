# LLM 调用接口清单

本文档列出了所有调用 LLM（大语言模型）生成 AI 内容的接口。

## 模型选择说明

**重要**：所有接口都已强制指定模型，不再支持用户偏好选择。每个接口根据其特性使用最适合的模型：

### DeepSeek 主场（复杂逻辑推理、高性价比、稳定 JSON）
- **DeepSeek-V3** (`deepseek-chat`)：用于需要复杂逻辑推理、高性价比和稳定 JSON 输出的接口

### Gemini 主场（极速响应、长文本处理）
- **Gemini 1.5 Flash** (`gemini-1.5-flash`)：用于需要极低延迟、处理大量上下文或简单文本总结的接口
- **Gemini 1.5 Pro** (`gemini-1.5-pro`)：用于需要创造力和联想能力的推荐类接口

---

## 1. 行程生成相关接口

### 1.1 生成旅行行程
- **接口**: `POST /api/v1/journeys/generate`
- **控制器**: `JourneyV1Controller.generateJourney()`
- **服务**: `ItineraryGenerationService.generateItinerary()`
- **功能**: 根据目的地、天数、偏好等信息生成完整的旅行行程
- **模型**: 🔥 **DeepSeek-V3** (`deepseek-chat`) - 核心行程生成需要复杂逻辑推理、高性价比、稳定 JSON 输出
- **认证**: ✅ 需要 JWT 认证

### 1.2 行程助手聊天
- **接口**: `POST /api/v1/journeys/:journeyId/assistant/chat`
- **控制器**: `JourneyV1Controller.journeyAssistantChat()`
- **服务**: `JourneyAssistantService.chat()`
- **功能**: 与行程 AI 助手对话，询问关于行程、预算、活动、时间安排等问题
- **模型**: 🔥 **Gemini 1.5 Flash** (`gemini-1.5-flash`) - 极速响应，支持长上下文（1M+ Context Window）
- **认证**: ✅ 需要 JWT 认证

### 1.3 生成安全提示
- **接口**: `POST /api/v1/journeys/:journeyId/safety-notice`
- **控制器**: `JourneyV1Controller.generateSafetyNotice()`
- **服务**: `ItineraryService.generateSafetyNotice()`
- **功能**: 为行程生成/刷新安全提示（调用 AI + 缓存）
- **模型**: 🔥 **DeepSeek-V3** (`deepseek-chat`) - 安全提示基于规则和知识库整合
- **认证**: ✅ 需要 JWT 认证

### 1.4 生成每日概要
- **接口**: `POST /api/v1/journeys/:journeyId/daily-summaries`
- **控制器**: `JourneyV1Controller.generateDailySummaries()`
- **服务**: `ItineraryService.generateDailySummaries()`
- **功能**: 使用 AI 为行程的每一天生成概要
- **模型**: 🔥 **Gemini 1.5 Flash** (`gemini-1.5-flash`) - 摘要任务，快速响应
- **认证**: ✅ 需要 JWT 认证

### 1.5 获取文化红黑榜
- **接口**: `GET /api/v1/journeys/:journeyId/cultural-guide`
- **控制器**: `JourneyV1Controller.getCulturalGuide()`
- **服务**: `CulturalGuideService.getCulturalGuide()`
- **功能**: 获取目的地的文化红黑榜（推荐行为和禁忌）
- **模型**: 🔥 **DeepSeek-V3** (`deepseek-chat`) - 文化习俗理解，多语言表现优秀
- **认证**: ✅ 需要 JWT 认证（可选）

### 1.6 获取本地实用信息
- **接口**: `GET /api/v1/journeys/:journeyId/local-essentials`
- **控制器**: `JourneyV1Controller.getLocalEssentials()`
- **服务**: `LocalEssentialsService.getLocalEssentials()`
- **功能**: 获取目的地实用信息（语言、汇率、时区、插座、紧急电话等）
- **模型**: 🔥 **DeepSeek-V3** (`deepseek-chat`) - 实用信息提取，结构化输出
- **认证**: ✅ 需要 JWT 认证（可选）

---

## 2. 位置信息相关接口

### 2.1 生成单个活动位置信息
- **接口**: `POST /api/location/generate`
- **控制器**: `LocationController.generateLocation()`
- **服务**: `LocationService.generateLocationInfo()`
- **功能**: 获取活动的详细位置信息，包括地址、交通、开放时间、门票价格等
- **模型**: 🔥 **Gemini 1.5 Flash** (`gemini-1.5-flash`) - 极速响应，处理位置信息
- **认证**: ✅ 需要 JWT 认证

### 2.2 批量生成活动位置信息
- **接口**: `POST /api/location/generate-batch`
- **控制器**: `LocationController.generateLocationBatch()`
- **服务**: `LocationService.generateLocationBatch()`
- **功能**: 批量生成多个活动的位置信息
- **模型**: 🔥 **Gemini 1.5 Flash** (`gemini-1.5-flash`) - 极速响应，处理位置信息
- **认证**: ✅ 需要 JWT 认证

---

## 3. 旅行摘要相关接口

### 3.1 生成旅行摘要
- **接口**: `POST /api/travel/summary`
- **控制器**: `TravelSummaryController.generateSummary()`
- **服务**: `TravelSummaryService.generateSummary()`
- **功能**: 根据已生成的行程数据，生成生动有趣的旅行摘要（100-150字）
- **模型**: 🔥 **Gemini 1.5 Flash** (`gemini-1.5-flash`) - 摘要任务，快速响应
- **认证**: ❌ 无需认证（公开接口）

---

## 4. 目的地相关接口

### 4.1 准确地理编码（支持自然语言）
- **接口**: `POST /api/v1/destinations/geocode/accurate`
- **控制器**: `DestinationsV1Controller.accurateGeocode()`
- **服务**: `AccurateGeocodingService.smartSearch()`
- **功能**: 使用 AI + Mapbox 进行地理编码，支持自然语言描述（如"那个有很多鹿的日本公园"）
- **模型**: 环境变量配置（公开接口，无用户上下文）
- **认证**: ❌ 无需认证（公开接口）

---

## 5. 灵感与推荐相关接口

### 5.1 意图识别
- **接口**: `POST /api/v1/inspiration/detect-intent`
- **控制器**: `InspirationController.detectIntent()`
- **服务**: `InspirationService.analyzeIntent()`
- **功能**: 分析用户自然语言输入，识别旅行意图、关键词、情感倾向等
- **模型**: 🔥 **Gemini 1.5 Flash** (`gemini-1.5-flash`) - 高频低延迟分类任务
- **认证**: ❌ 无需认证（公开接口）

### 5.2 目的地推荐
- **接口**: `POST /api/v1/inspiration/recommend-destinations`
- **控制器**: `InspirationController.recommendDestinations()`
- **服务**: `InspirationService.recommendDestinations()`
- **功能**: 根据用户意图和需求，推荐候选目的地列表（8-12个）
- **模型**: 🔥 **Gemini 1.5 Pro** (`gemini-1.5-pro`) - 推荐需要创造力和联想能力
- **认证**: ❌ 无需认证（公开接口）

### 5.3 生成完整行程
- **接口**: `POST /api/v1/inspiration/generate-itinerary`
- **控制器**: `InspirationController.generateItinerary()`
- **服务**: `InspirationService.generateItinerary()`
- **功能**: 根据用户输入和意图，生成完整的详细行程
- **模型**: 🔥 **DeepSeek-V3** (`deepseek-chat`) - 灵感行程生成，低成本高并发
- **认证**: ❌ 无需认证（公开接口）

### 5.4 天数提取
- **接口**: `POST /api/v1/inspiration/extract-days`
- **控制器**: `InspirationController.extractDays()`
- **服务**: `InspirationService.extractDays()`
- **功能**: 从用户输入中提取行程天数
- **模型**: 🔥 **DeepSeek-V3** (`deepseek-chat`) - 简单实体抽取，低成本
- **认证**: ❌ 无需认证（公开接口）

---

## 6. 公开接口（无需认证）

### 6.1 生成通用安全提示
- **接口**: `POST /api/v1/journeys/safety-notice/public`
- **控制器**: `JourneyV1Controller.generatePublicSafetyNotice()`
- **服务**: `ItineraryService.generatePublicSafetyNotice()`
- **功能**: 根据目的地生成安全提示，无需认证。支持缓存
- **模型**: 🔥 **DeepSeek-V3** (`deepseek-chat`) - 安全提示基于规则和知识库整合
- **认证**: ❌ 无需认证

---

## 总结

### 按模型分类

#### 🔥 DeepSeek-V3 (`deepseek-chat`) - 7 个接口
**适用场景**：复杂逻辑推理、高性价比、稳定 JSON 输出、知识库整合

- `POST /api/v1/journeys/generate` - 生成旅行行程（核心逻辑推理）
- `POST /api/v1/inspiration/generate-itinerary` - 生成灵感行程（低成本高并发）
- `GET /api/v1/journeys/:journeyId/cultural-guide` - 获取文化红黑榜（多语言理解）
- `POST /api/v1/journeys/:journeyId/safety-notice` - 生成安全提示（知识库整合）
- `POST /api/v1/journeys/safety-notice/public` - 生成通用安全提示（知识库整合）
- `GET /api/v1/journeys/:journeyId/local-essentials` - 获取本地实用信息（结构化输出）
- `POST /api/v1/inspiration/extract-days` - 天数提取（简单实体抽取）

#### 🔥 Gemini 1.5 Flash (`gemini-1.5-flash`) - 6 个接口
**适用场景**：极速响应、长文本处理、摘要任务、高频低延迟

- `POST /api/v1/journeys/:journeyId/assistant/chat` - 行程助手聊天（长上下文支持）
- `POST /api/v1/journeys/:journeyId/daily-summaries` - 生成每日概要（摘要任务）
- `POST /api/travel/summary` - 生成旅行摘要（摘要任务）
- `POST /api/location/generate` - 生成单个活动位置信息（极速响应）
- `POST /api/location/generate-batch` - 批量生成活动位置信息（极速响应）
- `POST /api/v1/inspiration/detect-intent` - 意图识别（高频低延迟分类）

#### 🔥 Gemini 1.5 Pro (`gemini-1.5-pro`) - 1 个接口
**适用场景**：创造力和联想能力

- `POST /api/v1/inspiration/recommend-destinations` - 目的地推荐（需要创造力）

### 统计

- **总计**: 14 个接口调用 LLM
- **需要认证**: 8 个接口
- **公开接口**: 6 个接口
- **DeepSeek-V3**: 7 个接口
- **Gemini 1.5 Flash**: 6 个接口
- **Gemini 1.5 Pro**: 1 个接口

### 模型选择策略

所有接口都已**强制指定模型**，不再支持用户偏好选择。每个接口根据其特性使用最适合的模型：

1. **DeepSeek-V3**：用于需要复杂逻辑推理、高性价比和稳定 JSON 输出的场景
2. **Gemini 1.5 Flash**：用于需要极速响应、长文本处理或摘要任务的场景
3. **Gemini 1.5 Pro**：用于需要创造力和联想能力的推荐场景

---

## 相关文档

- [用户偏好 API](./user-preferences-api.md) - 如何设置 LLM 模型偏好
- [位置信息 API](./location-api.md) - 位置信息生成接口详情
- [行程生成 API](./journey-api-00-generate.md) - 行程生成接口详情
- [AI 助手 API](./ai-assistant-api.md) - 行程助手接口详情

