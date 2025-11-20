#!/usr/bin/env ts-node
/**
 * Google OAuth 网络连接诊断脚本
 * 用于排除网络代理问题
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as https from 'https';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_DOMAIN = 'oauth2.googleapis.com';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testDnsResolution(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const addresses = await dnsLookup(GOOGLE_DOMAIN);
    const duration = Date.now() - startTime;
    return {
      name: 'DNS 解析',
      success: true,
      message: `成功解析到: ${addresses.address} (${duration}ms)`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name: 'DNS 解析',
      success: false,
      message: `DNS 解析失败: ${error.message}`,
      duration,
    };
  }
}

async function testDirectConnection(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await axios.post(
      GOOGLE_TOKEN_ENDPOINT,
      new URLSearchParams({
        // 使用无效的测试数据，只测试连接
        code: 'test',
        client_id: 'test',
        client_secret: 'test',
        redirect_uri: 'test',
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10秒超时
        validateStatus: () => true, // 接受所有状态码
      },
    );
    const duration = Date.now() - startTime;
    // 如果返回 400，说明连接成功，只是参数错误
    if (response.status === 400) {
      return {
        name: '直连测试',
        success: true,
        message: `连接成功 (状态码: ${response.status}, ${duration}ms)`,
        duration,
      };
    }
    return {
      name: '直连测试',
      success: response.status < 500,
      message: `状态码: ${response.status} (${duration}ms)`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout') || error.code === 'ETIMEDOUT';
    return {
      name: '直连测试',
      success: false,
      message: isTimeout
        ? `连接超时 (${duration}ms)`
        : `连接失败: ${error.message || error.code}`,
      duration,
    };
  }
}

async function testWithProxy(proxyUrl: string): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const httpsAgent = new HttpsProxyAgent(proxyUrl);
    const response = await axios.post(
      GOOGLE_TOKEN_ENDPOINT,
      new URLSearchParams({
        code: 'test',
        client_id: 'test',
        client_secret: 'test',
        redirect_uri: 'test',
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent,
        proxy: false,
        timeout: 10000,
        validateStatus: () => true,
      },
    );
    const duration = Date.now() - startTime;
    if (response.status === 400) {
      return {
        name: `代理测试 (${proxyUrl})`,
        success: true,
        message: `连接成功 (状态码: ${response.status}, ${duration}ms)`,
        duration,
      };
    }
    return {
      name: `代理测试 (${proxyUrl})`,
      success: response.status < 500,
      message: `状态码: ${response.status} (${duration}ms)`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout') || error.code === 'ETIMEDOUT';
    return {
      name: `代理测试 (${proxyUrl})`,
      success: false,
      message: isTimeout
        ? `连接超时 (${duration}ms)`
        : `连接失败: ${error.message || error.code}`,
      duration,
    };
  }
}

async function checkEnvironmentVariables(): Promise<TestResult> {
  const proxyVars = [
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'https_proxy',
    'http_proxy',
    'NO_PROXY',
    'no_proxy',
  ];

  const found: string[] = [];
  for (const key of proxyVars) {
    const value = process.env[key];
    if (value) {
      found.push(`${key}=${value}`);
    }
  }

  return {
    name: '环境变量检查',
    success: true,
    message: found.length > 0 ? `找到: ${found.join(', ')}` : '未找到代理环境变量',
  };
}

async function testHttpsConnection(): Promise<TestResult> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: GOOGLE_DOMAIN,
        port: 443,
        path: '/',
        method: 'GET',
        timeout: 10000,
      },
      (res) => {
        const duration = Date.now() - startTime;
        resolve({
          name: 'HTTPS 连接测试',
          success: true,
          message: `连接成功 (状态码: ${res.statusCode}, ${duration}ms)`,
          duration,
        });
      },
    );

    req.on('error', (error: any) => {
      const duration = Date.now() - startTime;
      const isTimeout = error.message?.includes('timeout') || error.code === 'ETIMEDOUT';
      resolve({
        name: 'HTTPS 连接测试',
        success: false,
        message: isTimeout
          ? `连接超时 (${duration}ms)`
          : `连接失败: ${error.message || error.code}`,
        duration,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        name: 'HTTPS 连接测试',
        success: false,
        message: `连接超时 (${duration}ms)`,
        duration,
      });
    });

    req.end();
  });
}

async function runDiagnostics() {
  console.log('🔍 开始诊断 Google OAuth 网络连接问题...\n');

  // 1. 检查环境变量
  console.log('1️⃣ 检查环境变量...');
  const envResult = await checkEnvironmentVariables();
  results.push(envResult);
  console.log(`   ${envResult.success ? '✅' : '❌'} ${envResult.name}: ${envResult.message}\n`);

  // 2. DNS 解析测试
  console.log('2️⃣ 测试 DNS 解析...');
  const dnsResult = await testDnsResolution();
  results.push(dnsResult);
  console.log(`   ${dnsResult.success ? '✅' : '❌'} ${dnsResult.name}: ${dnsResult.message}\n`);

  // 3. HTTPS 连接测试
  console.log('3️⃣ 测试 HTTPS 连接...');
  const httpsResult = await testHttpsConnection();
  results.push(httpsResult);
  console.log(`   ${httpsResult.success ? '✅' : '❌'} ${httpsResult.name}: ${httpsResult.message}\n`);

  // 4. 直连测试
  console.log('4️⃣ 测试直连 Google OAuth 端点...');
  const directResult = await testDirectConnection();
  results.push(directResult);
  console.log(`   ${directResult.success ? '✅' : '❌'} ${directResult.name}: ${directResult.message}\n`);

  // 5. 如果有代理环境变量，测试代理连接
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  if (proxyUrl) {
    console.log('5️⃣ 测试代理连接...');
    const proxyResult = await testWithProxy(proxyUrl);
    results.push(proxyResult);
    console.log(`   ${proxyResult.success ? '✅' : '❌'} ${proxyResult.name}: ${proxyResult.message}\n`);
  } else {
    console.log('5️⃣ 跳过代理测试（未配置代理）\n');
  }

  // 总结
  console.log('📊 诊断结果总结:');
  console.log('='.repeat(60));
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  console.log(`总计: ${successCount}/${totalCount} 测试通过\n`);

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.name}: ${result.message}${duration}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 建议:');

  if (!dnsResult.success) {
    console.log('   - DNS 解析失败，请检查网络连接或 DNS 配置');
  }

  if (!httpsResult.success) {
    console.log('   - HTTPS 连接失败，可能原因:');
    console.log('     1. 防火墙阻止了到 Google 服务器的连接');
    console.log('     2. 网络路由问题');
    console.log('     3. 需要配置代理服务器');
  }

  if (directResult.success && !httpsResult.success) {
    console.log('   - HTTPS 连接失败但直连测试成功，可能是代理配置问题');
  }

  if (!directResult.success && !httpsResult.success) {
    console.log('   - 所有连接测试都失败，建议:');
    console.log('     1. 检查防火墙设置');
    console.log('     2. 检查网络连接');
    console.log('     3. 尝试配置代理服务器');
    if (!proxyUrl) {
      console.log('     4. 设置 HTTPS_PROXY 或 HTTP_PROXY 环境变量');
    }
  }

  if (proxyUrl && results.find((r) => r.name.includes('代理测试'))) {
    const proxyResult = results.find((r) => r.name.includes('代理测试'));
    if (!proxyResult?.success) {
      console.log('   - 代理连接失败，请检查代理配置是否正确');
    }
  }

  console.log('');
}

// 运行诊断
runDiagnostics().catch((error) => {
  console.error('❌ 诊断过程出错:', error);
  process.exit(1);
});

