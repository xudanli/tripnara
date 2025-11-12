#!/bin/bash

# 完整的行程 API 测试脚本

BASE_URL="http://localhost:3000/api/api/v1"

echo "=========================================="
echo "行程 API 接口测试"
echo "=========================================="
echo ""

echo "=== 1. 测试行程列表接口 ==="
echo "GET $BASE_URL/journeys?limit=5"
RESPONSE=$(curl -s "$BASE_URL/journeys?limit=5")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

echo "=== 2. 创建测试行程 ==="
echo "POST $BASE_URL/journeys"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/journeys" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试行程 - 日本关西7日游",
    "destination": "日本·大阪·京都·奈良",
    "durationDays": 7,
    "startDate": "2025-12-20",
    "endDate": "2025-12-26",
    "mode": "planner",
    "status": "draft",
    "summary": "探索关西地区的传统文化与现代魅力",
    "description": "从大阪的繁华都市到京都的古都风情，再到奈良的鹿群，体验日本关西的多元魅力"
  }')

echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"
JOURNEY_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null)

if [ -z "$JOURNEY_ID" ] || [ "$JOURNEY_ID" == "None" ]; then
    echo "⚠️  创建行程失败，尝试从列表获取现有行程"
    JOURNEY_ID=$(curl -s "$BASE_URL/journeys?limit=1" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', [{}])[0].get('id', ''))" 2>/dev/null)
fi

if [ -n "$JOURNEY_ID" ] && [ "$JOURNEY_ID" != "None" ] && [ "$JOURNEY_ID" != "" ]; then
    echo ""
    echo "✅ 使用行程 ID: $JOURNEY_ID"
    echo ""
    
    echo "=== 3. 测试行程详情接口 ==="
    echo "GET $BASE_URL/journeys/$JOURNEY_ID"
    curl -s "$BASE_URL/journeys/$JOURNEY_ID" | python3 -m json.tool 2>/dev/null | head -100 || curl -s "$BASE_URL/journeys/$JOURNEY_ID" | head -100
    echo ""
    
    echo "=== 4. 测试更新行程接口 ==="
    echo "PATCH $BASE_URL/journeys/$JOURNEY_ID"
    UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/journeys/$JOURNEY_ID" \
      -H "Content-Type: application/json" \
      -d '{
        "summary": "更新后的摘要：深度体验关西文化"
      }')
    echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"
    echo ""
    
    echo "=== 5. 测试获取天数列表 ==="
    echo "GET $BASE_URL/journeys/$JOURNEY_ID/days"
    curl -s "$BASE_URL/journeys/$JOURNEY_ID/days" | python3 -m json.tool 2>/dev/null | head -80 || curl -s "$BASE_URL/journeys/$JOURNEY_ID/days" | head -80
    echo ""
    
    echo "=== 6. 测试创建天数 ==="
    echo "POST $BASE_URL/journeys/$JOURNEY_ID/days"
    DAY_RESPONSE=$(curl -s -X POST "$BASE_URL/journeys/$JOURNEY_ID/days" \
      -H "Content-Type: application/json" \
      -d '{
        "dayNumber": 1,
        "date": "2025-12-20",
        "title": "第一天：抵达大阪",
        "summary": "从机场前往酒店，适应时差"
      }')
    echo "$DAY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DAY_RESPONSE"
    DAY_ID=$(echo "$DAY_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null)
    echo ""
    
    if [ -n "$DAY_ID" ] && [ "$DAY_ID" != "None" ] && [ "$DAY_ID" != "" ]; then
        echo "✅ 使用天数 ID: $DAY_ID"
        echo ""
        
        echo "=== 7. 测试获取时间段列表 ==="
        echo "GET $BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots"
        curl -s "$BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots"
        echo ""
        
        echo "=== 8. 测试创建时间段 ==="
        echo "POST $BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots"
        SLOT_RESPONSE=$(curl -s -X POST "$BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots" \
          -H "Content-Type: application/json" \
          -d '{
            "sequence": 1,
            "startTime": "14:00",
            "durationMinutes": 120,
            "type": "transport",
            "title": "机场到酒店",
            "locationJson": {"name": "关西国际机场", "type": "airport"}
          }')
        echo "$SLOT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SLOT_RESPONSE"
        SLOT_ID=$(echo "$SLOT_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null)
        echo ""
        
        if [ -n "$SLOT_ID" ] && [ "$SLOT_ID" != "None" ] && [ "$SLOT_ID" != "" ]; then
            echo "✅ 使用时间段 ID: $SLOT_ID"
            echo ""
            
            echo "=== 9. 测试更新时间段 ==="
            echo "PATCH $BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots/$SLOT_ID"
            curl -s -X PATCH "$BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots/$SLOT_ID" \
              -H "Content-Type: application/json" \
              -d '{
                "title": "更新后的标题：机场接驳车到酒店"
              }' | python3 -m json.tool 2>/dev/null || echo "Update response"
            echo ""
            
            echo "=== 10. 测试删除时间段 ==="
            echo "DELETE $BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots/$SLOT_ID"
            curl -s -X DELETE "$BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID/slots/$SLOT_ID" | python3 -m json.tool 2>/dev/null || echo "Delete response"
            echo ""
        fi
        
        echo "=== 11. 测试更新天数 ==="
        echo "PATCH $BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID"
        curl -s -X PATCH "$BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID" \
          -H "Content-Type: application/json" \
          -d '{
            "title": "更新后的第一天：抵达大阪并适应时差"
          }' | python3 -m json.tool 2>/dev/null || echo "Update day response"
        echo ""
        
        echo "=== 12. 测试删除天数 ==="
        echo "DELETE $BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID"
        curl -s -X DELETE "$BASE_URL/journeys/$JOURNEY_ID/days/$DAY_ID" | python3 -m json.tool 2>/dev/null || echo "Delete day response"
        echo ""
    fi
    
    echo "=== 13. 最终行程列表 ==="
    echo "GET $BASE_URL/journeys?limit=10"
    curl -s "$BASE_URL/journeys?limit=10" | python3 -m json.tool 2>/dev/null | head -60 || curl -s "$BASE_URL/journeys?limit=10" | head -60
    echo ""
    
    echo "=========================================="
    echo "✅ 所有接口测试完成"
    echo "=========================================="
else
    echo "⚠️  无法获取有效的行程 ID，部分测试跳过"
fi

