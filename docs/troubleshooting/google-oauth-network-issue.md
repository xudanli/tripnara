# Google OAuth 网络连接问题排查指南

## 问题现象

Google OAuth 登录时，token 交换请求超时（60秒），错误信息：
```
Google 认证服务响应超时（60秒）。可能原因：1) 网络连接问题 2) 防火墙阻止 3) 需要配置代理。请检查网络连接或联系管理员。
```

## 诊断结果

运行诊断脚本：
```bash
npm run diagnose:google-oauth
```

### 典型诊断结果

```
✅ DNS 解析: 成功解析到: 74.125.20.95 (68ms)
❌ HTTPS 连接测试: 连接超时 (10165ms)
❌ 直连测试: 连接超时 (10036ms)
```

**结论：**
- DNS 解析正常，可以解析到 Google 服务器的 IP 地址
- 但 HTTPS 连接超时，说明网络连接被阻止
- **这不是代理配置问题**，而是网络连接本身的问题

## 可能的原因

### 1. 防火墙阻止

防火墙可能阻止了到 `oauth2.googleapis.com` (端口 443) 的出站连接。

**检查方法：**
```bash
# 测试是否能连接到 Google 服务器
curl -v --connect-timeout 10 https://oauth2.googleapis.com/token

# 或使用 telnet 测试端口
telnet oauth2.googleapis.com 443
```

### 2. 网络路由问题

网络路由可能无法到达 Google 服务器。

**检查方法：**
```bash
# 测试路由
traceroute oauth2.googleapis.com

# 或使用 mtr（如果可用）
mtr oauth2.googleapis.com
```

### 3. 需要配置代理

某些网络环境（如企业网络）需要通过代理服务器访问外网。

**解决方案：**

#### 方法 1: 设置环境变量

在 `.env` 文件中添加：
```env
HTTPS_PROXY=http://proxy.example.com:8080
HTTP_PROXY=http://proxy.example.com:8080
```

或在启动应用前设置：
```bash
export HTTPS_PROXY=http://proxy.example.com:8080
export HTTP_PROXY=http://proxy.example.com:8080
npm run start:dev
```

#### 方法 2: 使用代理认证

如果代理需要认证：
```env
HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

#### 方法 3: 配置 NO_PROXY（可选）

如果某些地址不需要代理：
```env
NO_PROXY=localhost,127.0.0.1,*.local
```

### 4. 网络环境限制

某些网络环境（如某些地区的网络）可能无法直接访问 Google 服务。

**解决方案：**
- 使用 VPN
- 配置代理服务器
- 联系网络管理员

## 验证代理配置

配置代理后，重新运行诊断脚本：
```bash
npm run diagnose:google-oauth
```

如果代理配置正确，应该看到：
```
✅ 代理测试 (http://proxy.example.com:8080): 连接成功 (状态码: 400, 1234ms)
```

注意：状态码 400 是正常的，因为我们使用的是测试数据，Google 会返回参数错误，但这说明连接是成功的。

## 临时解决方案

如果无法立即解决网络问题，可以考虑：

1. **使用 VPN**：通过 VPN 连接到可以访问 Google 服务的网络
2. **使用代理服务器**：配置代理服务器转发请求
3. **使用备用认证方式**：如果可能，使用其他 OAuth 提供商（如 GitHub、Microsoft）

## 检查应用日志

查看应用日志中的详细信息：
```
[AuthService] Request config: timeout=60000ms, proxy=disabled
```

如果看到 `proxy=disabled`，说明没有使用代理。如果配置了代理，应该看到 `proxy=enabled`。

## 联系支持

如果以上方法都无法解决问题，请提供以下信息：

1. 诊断脚本的完整输出
2. 应用日志中的错误信息
3. 网络环境信息（是否在企业网络、是否有防火墙等）
4. 是否配置了代理环境变量

## 相关文件

- 诊断脚本：`scripts/diagnose-google-oauth-network.ts`
- 认证服务：`src/modules/auth/auth.service.ts`
- 代理配置：`src/modules/auth/auth.service.ts` 中的 `createProxyAgentIfNeeded()` 方法

