# 签证 API 快速参考

## 基础 URL
```
http://localhost:3000/api/visa
```

## 1. 查询签证信息
```http
GET /api/visa/info?destinationCountry=JP&nationalityCode=CN
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "destinationCountry": "JP",
      "destinationName": "日本",
      "visaType": "visa-required",
      "applicableTo": "中国护照",
      "description": "需要提前申请旅游签证",
      "duration": null,
      "applicationUrl": "https://..."
    }
  ]
}
```

## 2. 多目的地分析
```http
POST /api/visa/multi-destination-analysis
Content-Type: application/json

{
  "destinationCountries": ["JP", "TH", "SG"],
  "nationalityCode": "CN"
}
```

## 3. 获取政策列表（管理）
```http
GET /api/visa/admin/policies?page=1&limit=20
```

## 4. 创建政策（管理）
```http
POST /api/visa/admin/policies
Content-Type: application/json

{
  "destinationCountryCode": "JP",
  "destinationCountryName": "日本",
  "applicantType": "nationality",
  "applicantCountryCode": "CN",
  "applicantDescription": "中国护照",
  "visaType": "visa-required"
}
```

## 5. 更新政策（管理）
```http
PATCH /api/visa/admin/policies/1
Content-Type: application/json

{
  "description": "更新后的说明"
}
```

## 6. 删除政策（管理）
```http
DELETE /api/visa/admin/policies/1
```

## 7. 查看历史（管理）
```http
GET /api/visa/admin/policies/1/history
```

## 签证类型
- `visa-free` - 免签
- `visa-on-arrival` - 落地签
- `e-visa` - 电子签
- `visa-required` - 需要签证
- `permanent-resident-benefit` - 永久居民优惠

