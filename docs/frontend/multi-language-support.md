# 前端多语言支持指南

## 概述

后端已支持多语言行程生成，前端需要配合传递语言参数以确保生成对应语言的行程内容。

## 接口变更

### 生成行程接口

**接口路径**: `POST /api/v1/journeys/generate`

**新增字段**: `language` (可选)

## 前端需要做的改动

### 1. 在生成行程请求中添加 `language` 字段

#### TypeScript 类型定义

```typescript
interface GenerateItineraryRequest {
  destination?: string;
  days: number;
  startDate: string;
  language?: 'zh-CN' | 'en-US' | 'en';  // 🆕 新增字段
  preferences?: {
    interests?: string[];
    budget?: 'low' | 'medium' | 'high';
    travelStyle?: 'relaxed' | 'moderate' | 'intensive';
  };
  intent?: {
    intentType: string;
    keywords: string[];
    emotionTone: string;
    description: string;
    confidence?: number;
  };
}
```

#### 请求示例

**中文行程（默认）**:
```typescript
const request = {
  destination: "巴黎",
  days: 5,
  startDate: "2025-12-10",
  language: "zh-CN",  // 可选，默认值
  preferences: {
    interests: ["历史文化", "艺术博物馆"],
    budget: "medium"
  }
};
```

**英文行程**:
```typescript
const request = {
  destination: "Paris",
  days: 5,
  startDate: "2025-12-10",
  language: "en-US",  // 🆕 指定英文
  preferences: {
    interests: ["culture", "museums"],
    budget: "medium"
  }
};
```

### 2. 语言检测逻辑

前端应该根据以下优先级确定 `language` 值：

1. **用户选择/设置的语言**（最高优先级）
   - 如果用户在前端选择了语言，使用该语言
   - 例如：用户点击了"English"按钮，传递 `"en-US"`

2. **浏览器语言设置**
   - 检测 `navigator.language` 或 `navigator.languages`
   - 如果是英文相关语言，传递 `"en-US"` 或 `"en"`
   - 如果是中文相关语言，传递 `"zh-CN"`

3. **默认值**
   - 如果不确定，可以不传递 `language` 字段，后端会使用默认值 `"zh-CN"`

#### 实现示例

```typescript
// 获取用户语言偏好
function getUserLanguage(): string {
  // 1. 从用户设置中获取（如果有）
  const userLanguagePreference = getUserPreference('language');
  if (userLanguagePreference) {
    return userLanguagePreference;
  }
  
  // 2. 从浏览器语言检测
  const browserLang = navigator.language || navigator.languages?.[0] || 'zh-CN';
  if (browserLang.startsWith('en')) {
    return 'en-US';
  }
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  
  // 3. 默认值
  return 'zh-CN';
}

// 在生成行程时使用
const request = {
  destination: "Paris",
  days: 5,
  startDate: "2025-12-10",
  language: getUserLanguage(),  // 自动检测语言
  preferences: {
    interests: ["culture", "museums"],
    budget: "medium"
  }
};
```

### 3. 表单组件更新

如果前端有行程生成表单，需要：

1. **添加语言选择器**（可选）
   - 让用户可以选择生成中文或英文行程
   - 或者根据用户的语言设置自动选择

2. **更新表单提交逻辑**
   - 在提交时包含 `language` 字段

#### Vue 组件示例

```vue
<template>
  <form @submit="handleSubmit">
    <!-- 其他表单字段 -->
    <input v-model="destination" placeholder="Destination" />
    <input v-model="days" type="number" />
    <input v-model="startDate" type="date" />
    
    <!-- 🆕 语言选择器（可选） -->
    <select v-model="language">
      <option value="zh-CN">中文</option>
      <option value="en-US">English</option>
    </select>
    
    <button type="submit">Generate Itinerary</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const destination = ref('');
const days = ref(5);
const startDate = ref('');
const language = ref('zh-CN'); // 默认中文，或从用户设置获取

async function handleSubmit() {
  const response = await fetch('/api/v1/journeys/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      destination: destination.value,
      days: days.value,
      startDate: startDate.value,
      language: language.value,  // 🆕 传递语言参数
      preferences: {
        // ...
      }
    })
  });
  
  const result = await response.json();
  // 处理结果...
}
</script>
```

### 4. 响应处理

后端返回的行程内容会根据 `language` 参数生成对应语言：

- `language: "zh-CN"` → 返回中文行程（活动标题、描述、摘要等）
- `language: "en-US"` → 返回英文行程（活动标题、描述、摘要等）

前端无需特殊处理，直接显示返回的内容即可。

## 支持的语言代码

| 语言代码 | 说明 | 示例 |
|---------|------|------|
| `zh-CN` | 简体中文（默认） | 穿梭于大英博物馆的千年时光长廊 |
| `en-US` | 美式英语 | Wander through the millennium-long corridors of the British Museum |
| `en` | 英语（简写） | 同 `en-US` |

## 注意事项

1. **向后兼容**: `language` 字段是可选的，如果不传递，默认使用 `zh-CN`
2. **语言一致性**: 建议前端在用户选择语言后，保存到用户偏好中，后续请求都使用该语言
3. **错误处理**: 如果传递了不支持的语言代码，后端会使用默认值 `zh-CN`

## 测试建议

1. **测试中文行程生成**:
   ```json
   {
     "destination": "巴黎",
     "days": 5,
     "startDate": "2025-12-10",
     "language": "zh-CN"
   }
   ```
   预期：返回中文的活动标题、描述、摘要

2. **测试英文行程生成**:
   ```json
   {
     "destination": "Paris",
     "days": 5,
     "startDate": "2025-12-10",
     "language": "en-US"
   }
   ```
   预期：返回英文的活动标题、描述、摘要

3. **测试默认行为**:
   ```json
   {
     "destination": "Paris",
     "days": 5,
     "startDate": "2025-12-10"
   }
   ```
   预期：不传递 `language` 时，默认返回中文

## 相关接口

- `POST /api/v1/journeys/generate` - 生成行程（主要接口）
- `POST /api/inspiration/generate-itinerary` - 灵感模式生成行程（也支持 `language` 字段）

## 更新日志

- **2025-12-02**: 添加 `language` 字段支持，支持中文和英文行程生成
