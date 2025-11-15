#!/bin/bash

# 测试认证 API 接口的脚本

BASE_URL="http://localhost:3000/api"

echo "=========================================="
echo "        认证 API 接口测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 测试 /auth/google 重定向
echo -e "${YELLOW}1. 测试 Google OAuth 跳转${NC}"
echo "GET $BASE_URL/auth/google"
RESPONSE=$(curl -s -o /dev/null -w "HTTP_CODE:%{http_code}\nREDIRECT:%{redirect_url}\n" "$BASE_URL/auth/google")
echo "$RESPONSE"
echo ""

# 2. 测试 /auth/me 未登录逻辑
echo -e "${YELLOW}2. 测试 /auth/me（未携带 Cookie）${NC}"
echo "GET $BASE_URL/auth/me"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/auth/me")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# 3. 测试 /auth/profile Bearer 兼容接口（无 token）
echo -e "${YELLOW}3. 测试 /auth/profile（无 Authorization）${NC}"
echo "GET $BASE_URL/auth/profile"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/auth/profile")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# 5. 检查 Swagger 文档
echo -e "${YELLOW}5. 检查 Swagger 文档是否包含认证接口${NC}"
SWAGGER_RESPONSE=$(curl -s "$BASE_URL/docs" | grep -i "auth" | head -5)
if [ -n "$SWAGGER_RESPONSE" ]; then
  echo -e "${GREEN}✅ Swagger 文档可访问${NC}"
else
  echo -e "${RED}⚠️  无法确认 Swagger 文档内容${NC}"
fi
echo "Swagger 文档地址: $BASE_URL/docs"
echo ""

echo "=========================================="
echo "        测试总结"
echo "=========================================="
echo ""
echo "✅ 接口路由测试完成（基础未登录流程）"
echo ""
echo "📝 注意事项："
echo "1. 完整登录需要在浏览器访问 /api/auth/google 并完成 Google 授权"
echo "2. 登录成功后浏览器会保存 HttpOnly 的 app_session Cookie"
echo "3. 所有前端请求需携带 credentials，例如 fetch(..., { credentials: 'include' })"
echo "4. Bearer Token 接口仅用于脚本或旧版客户端，可从 app_session 中提取"
echo ""
echo "🔗 查看详细文档: docs/api/auth-api.md"
echo ""


