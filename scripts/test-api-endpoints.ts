import axios from 'axios';

/**
 * API 端点测试脚本
 * 
 * 使用方法:
 *   1. 确保服务器正在运行: npm run start:dev
 *   2. 设置 JWT token (如果需要): export API_TOKEN="your-token"
 *   3. 运行测试: npx ts-node scripts/test-api-endpoints.ts
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || '';

interface TestResult {
  name: string;
  success: boolean;
  status?: number;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: any,
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${BASE_URL}${path}`;

  try {
    const config: any = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    if (API_TOKEN) {
      config.headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;

    return {
      name,
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name,
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || error.message,
      duration,
    };
  }
}

async function runTests() {
  console.log('🧪 开始测试 API 端点...\n');
  console.log(`📍 服务器地址: ${BASE_URL}`);
  console.log(`🔑 Token: ${API_TOKEN ? '已设置' : '未设置（某些接口可能需要认证）'}\n`);

  // 测试 1: 行程生成接口
  console.log('📝 测试 1: POST /api/itinerary/generate');
  const itineraryResult = await testEndpoint(
    '行程生成',
    'POST',
    '/api/itinerary/generate',
    {
      destination: '瑞士琉森',
      days: 5,
      preferences: {
        interests: ['自然风光', '户外活动'],
        budget: 'medium',
        travelStyle: 'relaxed',
      },
      startDate: '2024-06-01',
    },
  );
  results.push(itineraryResult);
  console.log(
    itineraryResult.success
      ? `   ✅ 成功 (${itineraryResult.status}, ${itineraryResult.duration}ms)`
      : `   ❌ 失败: ${itineraryResult.error || '未知错误'}`,
  );
  console.log('');

  // 测试 2: 位置信息生成接口
  console.log('📍 测试 2: POST /api/location/generate');
  const locationResult = await testEndpoint(
    '位置信息生成',
    'POST',
    '/api/location/generate',
    {
      activityName: '铁力士峰云端漫步',
      destination: '瑞士琉森',
      activityType: 'attraction',
      coordinates: {
        lat: 46.7704,
        lng: 8.4050,
        region: '市中心区域',
      },
    },
  );
  results.push(locationResult);
  console.log(
    locationResult.success
      ? `   ✅ 成功 (${locationResult.status}, ${locationResult.duration}ms)`
      : `   ❌ 失败: ${locationResult.error || '未知错误'}`,
  );
  console.log('');

  // 测试 3: 批量位置信息生成接口
  console.log('📍 测试 3: POST /api/location/generate-batch');
  const batchLocationResult = await testEndpoint(
    '批量位置信息生成',
    'POST',
    '/api/location/generate-batch',
    {
      activities: [
        {
          activityName: '铁力士峰云端漫步',
          destination: '瑞士琉森',
          activityType: 'attraction',
          coordinates: {
            lat: 46.7704,
            lng: 8.4050,
          },
        },
        {
          activityName: '琉森湖游船',
          destination: '瑞士琉森',
          activityType: 'attraction',
          coordinates: {
            lat: 47.0502,
            lng: 8.3093,
          },
        },
      ],
    },
  );
  results.push(batchLocationResult);
  console.log(
    batchLocationResult.success
      ? `   ✅ 成功 (${batchLocationResult.status}, ${batchLocationResult.duration}ms)`
      : `   ❌ 失败: ${batchLocationResult.error || '未知错误'}`,
  );
  console.log('');

  // 测试 4: 旅行摘要生成接口
  console.log('📄 测试 4: POST /api/travel/summary');
  const summaryResult = await testEndpoint(
    '旅行摘要生成',
    'POST',
    '/api/travel/summary',
    {
      destination: '瑞士琉森',
      itinerary: {
        days: [
          {
            day: 1,
            date: '2024-06-01',
            activities: [
              {
                time: '09:00',
                title: '铁力士峰云端漫步',
                type: 'attraction',
                notes: '登上海拔3020米的铁力士峰，体验云端漫步的壮阔',
              },
              {
                time: '14:00',
                title: '琉森湖游船',
                type: 'attraction',
                notes: '欣赏琉森湖的湖光山色',
              },
            ],
          },
          {
            day: 2,
            date: '2024-06-02',
            activities: [
              {
                time: '10:00',
                title: '卡佩尔桥参观',
                type: 'attraction',
                notes: '参观琉森最著名的地标',
              },
            ],
          },
        ],
      },
    },
  );
  results.push(summaryResult);
  console.log(
    summaryResult.success
      ? `   ✅ 成功 (${summaryResult.status}, ${summaryResult.duration}ms)`
      : `   ❌ 失败: ${summaryResult.error || '未知错误'}`,
  );
  console.log('');

  // 测试总结
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const status = result.status ? ` [${result.status}]` : '';
    console.log(
      `${icon} ${result.name}${status} (${result.duration}ms)`,
    );
    if (!result.success && result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  console.log('='.repeat(50));
  console.log(
    `总计: ${results.length} 个测试 | ✅ 成功: ${successCount} | ❌ 失败: ${failCount} | ⏱️  总耗时: ${totalDuration}ms`,
  );

  if (failCount > 0) {
    console.log('\n⚠️  部分测试失败，请检查：');
    console.log('   1. 服务器是否正在运行 (npm run start:dev)');
    console.log('   2. API token 是否正确设置');
    console.log('   3. 数据库连接是否正常');
    console.log('   4. 相关服务（如 LLM API）是否可用');
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});

