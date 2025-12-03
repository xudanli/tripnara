# 行程接口文档 - 46. 获取智能打包清单

## 接口信息

**接口路径：** `GET /api/v1/journeys/:journeyId/packing-list`

**接口描述：** 根据行程中的具体活动和天气状况，生成深度定制的智能打包清单（5-10项）。严禁包含护照、身份证、手机等全球通用物品，只包含针对此地、此时、此事的特需物品。

**认证：** 需要 JWT 认证

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

## 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `language` | string | 否 | 语言代码，用于生成对应语言的打包清单，默认：`zh-CN` | `zh-CN`、`en-US`、`en` |

---

## 请求示例

### cURL

```bash
curl -X GET "https://api.example.com/api/v1/journeys/550e8400-e29b-41d4-a716-446655440000/packing-list?language=zh-CN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript (fetch)

```javascript
const response = await fetch('/api/v1/journeys/550e8400-e29b-41d4-a716-446655440000/packing-list?language=zh-CN', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const result = await response.json();
console.log('Packing List:', result.packingList);
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "journeyId": "550e8400-e29b-41d4-a716-446655440000",
  "destination": "瑞士琉森",
  "startDate": "2025-12-01",
  "endDate": "2025-12-08",
  "packingList": [
    {
      "item": "防滑冰爪",
      "reason": "针对第三天攀登冰川活动，且当地近期有雨雪，防止滑倒"
    },
    {
      "item": "防水登山靴",
      "reason": "针对第二天山地徒步活动，天气预报有雨，需要防水保护"
    },
    {
      "item": "高海拔防晒霜（SPF50+）",
      "reason": "针对第四天高山观景活动，海拔3000米以上，紫外线强烈"
    },
    {
      "item": "保暖抓绒衣",
      "reason": "针对第五天清晨观日出活动，山区气温低至-5°C，需要保暖"
    },
    {
      "item": "便携式氧气瓶",
      "reason": "针对第六天登顶活动，海拔4000米以上，可能出现高原反应"
    },
    {
      "item": "防水相机保护套",
      "reason": "针对全程户外活动，天气预报有雨雪，保护摄影设备"
    },
    {
      "item": "瑞士法郎现金",
      "reason": "针对第七天山区小镇购物活动，部分商家不接受信用卡"
    },
    {
      "item": "便携式折叠登山杖",
      "reason": "针对第二天和第四天山地徒步活动，减轻膝盖负担"
    }
  ],
  "fromCache": false,
  "generatedAt": "2025-12-01T12:00:00.000Z"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `journeyId` | string | 行程ID |
| `destination` | string | 目的地名称 |
| `startDate` | string | 行程开始日期（YYYY-MM-DD） |
| `endDate` | string | 行程结束日期（YYYY-MM-DD） |
| `packingList` | array | 打包清单（5-10项） |
| `packingList[].item` | string | 物品名称 |
| `packingList[].reason` | string | 推荐理由，需明确关联具体活动或天气 |
| `fromCache` | boolean | 是否来自缓存（当前版本始终为 false） |
| `generatedAt` | string | 生成时间（ISO 8601格式） |

---

## 错误响应

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found - 行程不存在

```json
{
  "statusCode": 404,
  "message": "行程不存在: 550e8400-e29b-41d4-a716-446655440000"
}
```

### 400 Bad Request - 行程没有天数信息

```json
{
  "statusCode": 400,
  "message": "行程没有天数信息，无法生成打包清单"
}
```

---

## 功能说明

### 生成逻辑

接口会：

1. **遍历行程活动**：
   - 获取行程中所有天数的所有活动
   - 提取每个活动的标题、类型、时间、备注等信息

2. **获取天气信息**：
   - 自动判断行程时间（未来10天内 vs 远期）
   - 获取实时天气预报或历史气候信息
   - 结合天气状况生成针对性建议

3. **AI 智能分析**：
   - 分析每个活动所需的特殊装备
   - 结合天气状况推荐必要物品
   - 严格过滤全球通用物品

### 反向过滤规则

**严禁包含以下全球通用物品**：
- 护照、身份证
- 手机、充电宝
- 现金、信用卡
- 洗漱用品（牙刷、牙膏、洗发水等）
- 任何无论去任何地方都会携带的通用物品

**只包含**：
- 针对**此地**（目的地特有）的物品
- 针对**此时**（天气/季节相关）的物品
- 针对**此事**（具体活动相关）的物品

### 数量限制

- **严格控制在 5-10 项之间**
- 如果 AI 生成的数量不足 5 项，系统会记录警告
- 如果 AI 生成的数量超过 10 项，系统会自动截取前 10 项

### 推荐理由格式

每项物品的推荐理由必须：
- 明确关联到**具体活动**（如"针对第三天攀登冰川活动"）
- 或明确关联到**天气状况**（如"当地近期有雨雪"）
- 说明**为什么需要**这个物品（如"防止滑倒"）

---

## 使用示例

### 完整示例

```javascript
async function getPackingList(journeyId, language = 'zh-CN') {
  try {
    const response = await fetch(
      `/api/v1/journeys/${journeyId}/packing-list?language=${language}`,
      {
        headers: {
          'Authorization': `Bearer ${getJwtToken()}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('目的地:', result.destination);
    console.log('行程日期:', `${result.startDate} 至 ${result.endDate}`);
    console.log('打包清单:');
    
    result.packingList.forEach((item, index) => {
      console.log(`${index + 1}. ${item.item}`);
      console.log(`   👉 ${item.reason}`);
    });
    
    return result;
  } catch (error) {
    console.error('获取打包清单失败:', error);
    throw error;
  }
}
```

### 前端展示示例

```javascript
// React 组件示例
function PackingList({ journeyId }) {
  const [packingList, setPackingList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPackingList() {
      try {
        const response = await fetch(
          `/api/v1/journeys/${journeyId}/packing-list?language=zh-CN`,
          {
            headers: {
              'Authorization': `Bearer ${getJwtToken()}`
            }
          }
        );
        const data = await response.json();
        setPackingList(data.packingList);
      } catch (error) {
        console.error('获取打包清单失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPackingList();
  }, [journeyId]);

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="packing-list">
      <h2>智能打包清单</h2>
      <ul>
        {packingList.map((item, index) => (
          <li key={index}>
            <strong>{item.item}</strong>
            <p>👉 {item.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 注意事项

1. **认证要求**：
   - 接口需要 JWT 认证
   - 只能获取自己创建的行程的打包清单

2. **行程要求**：
   - 行程必须包含至少一个天数
   - 天数必须包含至少一个活动
   - 如果行程没有活动，生成的清单可能不够精准

3. **天气信息依赖**：
   - 接口会自动调用天气信息接口
   - 如果天气信息获取失败，会使用默认信息，但可能影响清单准确性

4. **语言支持**：
   - 支持 `zh-CN`（中文）、`en-US`（英文）、`en`（英文）
   - 默认使用 `zh-CN`

5. **性能考虑**：
   - 需要遍历所有活动和获取天气信息
   - AI 生成可能需要几秒钟时间
   - 建议在前端显示加载状态
   - 结果会实时生成，不缓存（每次调用都会重新生成）

6. **数量验证**：
   - 系统会自动验证生成的数量是否在 5-10 项之间
   - 如果数量不足或超过，系统会记录警告并自动调整

7. **推荐理由要求**：
   - 每项物品的推荐理由必须明确关联到具体活动或天气
   - 如果推荐理由不够具体，可能需要优化提示词

---

## 相关接口

- [获取行程天气信息](./journey-api-45-weather.md) - `GET /api/v1/journeys/:journeyId/weather`（打包清单会调用此接口获取天气信息）
- [获取行程详情](./journey-api.md#获取行程详情) - `GET /api/v1/journeys/:journeyId`
- [批量获取活动详情](./journey-api-37-batch-get-activities.md) - `POST /api/v1/journeys/:journeyId/activities/batch`

---

## 示例场景

### 场景1：山地徒步行程

**行程活动**：
- 第1天：抵达，休息
- 第2天：山地徒步（6小时）
- 第3天：攀登冰川（4小时）
- 第4天：高山观景（海拔3000米）

**天气**：实时天气，预报有雨雪，气温-5°C至15°C

**生成的打包清单**：
1. 防滑冰爪 - 针对第三天攀登冰川活动，且当地近期有雨雪，防止滑倒
2. 防水登山靴 - 针对第二天山地徒步活动，天气预报有雨，需要防水保护
3. 高海拔防晒霜（SPF50+） - 针对第四天高山观景活动，海拔3000米以上，紫外线强烈
4. 保暖抓绒衣 - 针对全程户外活动，气温低至-5°C，需要保暖
5. 便携式折叠登山杖 - 针对第二天山地徒步活动，减轻膝盖负担

### 场景2：城市文化行程

**行程活动**：
- 第1天：参观博物馆（室内）
- 第2天：参观教堂（需脱帽）
- 第3天：参加音乐会（正式场合）
- 第4天：购物

**天气**：历史气候，6月份，平均温度20-28°C，晴天

**生成的打包清单**：
1. 正式服装 - 针对第三天参加音乐会活动，需要正式着装
2. 头巾或帽子 - 针对第二天参观教堂活动，需要遮盖头部
3. 轻便背包 - 针对第四天购物活动，方便携带购买物品
4. 防晒帽 - 针对全程户外活动，6月份阳光强烈
5. 舒适的步行鞋 - 针对第一天和第二天参观活动，需要长时间步行

