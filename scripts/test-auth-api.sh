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

# 1. 测试 Google OAuth 登录接口（无 token）
echo -e "${YELLOW}1. 测试 Google OAuth 登录接口（无 token）${NC}"
echo "POST $BASE_URL/auth/google"
echo "Request: {}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/google" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# 2. 测试 Google OAuth 登录接口（无效 token）
echo -e "${YELLOW}2. 测试 Google OAuth 登录接口（无效 token）${NC}"
echo "POST $BASE_URL/auth/google"
echo "Request: {\"token\": \"invalid-token-12345\"}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token-12345"}')
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# 3. 测试获取用户信息接口（无 token）
echo -e "${YELLOW}3. 测试获取用户信息接口（无 token）${NC}"
echo "GET $BASE_URL/auth/profile"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/auth/profile")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# 4. 测试获取用户信息接口（无效 token）
echo -e "${YELLOW}4. 测试获取用户信息接口（无效 token）${NC}"
echo "GET $BASE_URL/auth/profile"
echo "Authorization: Bearer invalid-token"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer invalid-token")
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
echo "✅ 接口路由测试完成"
echo ""
echo "📝 注意事项："
echo "1. Google OAuth 登录需要真实的 Google ID Token"
echo "2. 获取用户信息需要有效的 JWT Token"
echo "3. 要测试完整流程，需要："
echo "   - 配置 GOOGLE_CLIENT_ID 环境变量"
echo "   - 配置 JWT_SECRET 环境变量"
echo "   - 使用真实的 Google ID Token 进行测试"
echo ""
echo "🔗 查看详细文档: docs/api/auth-api.md"
echo ""


