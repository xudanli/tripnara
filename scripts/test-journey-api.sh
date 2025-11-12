#!/bin/bash

# 测试行程 API 接口的脚本

BASE_URL="http://localhost:3000/api/api/v1"
DATABASE_URL="postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432/tripnaradb"

echo "=== 启动后端服务 ==="
cd /home/devbox/project
pkill -f "nest start" 2>/dev/null
sleep 2

# 启动服务
DATABASE_URL="$DATABASE_URL" npm run start:dev > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!

echo "等待服务启动..."
sleep 20

# 检查服务是否启动
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health" | grep -q "200\|404"; then
        echo "✅ 服务已启动"
        break
    fi
    sleep 1
done

echo ""
echo "=== 1. 测试行程列表接口 ==="
echo "GET $BASE_URL/journeys?limit=5"
curl -s "$BASE_URL/journeys?limit=5" | python3 -m json.tool 2>/dev/null | head -100 || curl -s "$BASE_URL/journeys?limit=5" | head -100

echo ""
echo ""
echo "=== 2. 获取第一个行程 ID ==="
JOURNEY_ID=$(curl -s "$BASE_URL/journeys?limit=1" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', [{}])[0].get('id', ''))" 2>/dev/null)

if [ -n "$JOURNEY_ID" ] && [ "$JOURNEY_ID" != "None" ]; then
    echo "找到行程 ID: $JOURNEY_ID"
    echo ""
    echo "=== 3. 测试行程详情接口 ==="
    echo "GET $BASE_URL/journeys/$JOURNEY_ID"
    curl -s "$BASE_URL/journeys/$JOURNEY_ID" | python3 -m json.tool 2>/dev/null | head -150 || curl -s "$BASE_URL/journeys/$JOURNEY_ID" | head -150
    
    echo ""
    echo ""
    echo "=== 4. 测试获取天数列表 ==="
    echo "GET $BASE_URL/journeys/$JOURNEY_ID/days"
    curl -s "$BASE_URL/journeys/$JOURNEY_ID/days" | python3 -m json.tool 2>/dev/null | head -80 || curl -s "$BASE_URL/journeys/$JOURNEY_ID/days" | head -80
else
    echo "⚠️  未找到行程数据，可能需要先创建行程"
fi

echo ""
echo ""
echo "=== 测试完成 ==="
# 不杀死后台进程，让服务继续运行

