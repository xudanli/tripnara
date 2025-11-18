import axios from 'axios';

/**
 * 行程增删改查接口测试脚本
 * 
 * 使用方法:
 *   1. 确保服务器正在运行: npm run start:dev
 *   2. 设置 JWT token: export API_TOKEN="your-token"
 *   3. 运行测试: npx ts-node scripts/test-itinerary-crud.ts
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || '';

interface TestResult {
  name: string;
  success: boolean;
  status?: number;
  error?: string;
  duration: number;
  data?: any;
}

const results: TestResult[] = [];
let createdItineraryId: string | null = null;

async function testEndpoint(
  name: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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
      timeout: 60000, // 60秒超时
    };

    if (API_TOKEN) {
      config.headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }

    if (data && (method === 'POST' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;

    return {
      name,
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      duration,
      data: response.data,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name,
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || error.message,
      duration,
      data: error.response?.data,
    };
  }
}

async function runTests() {
  console.log('🧪 开始测试行程增删改查接口...\n');
  console.log(`📍 服务器地址: ${BASE_URL}`);
  console.log(`🔑 Token: ${API_TOKEN ? '已设置' : '❌ 未设置（需要设置 API_TOKEN 环境变量）'}\n`);

  if (!API_TOKEN) {
    console.log('⚠️  警告: 未设置 API_TOKEN，测试可能会失败\n');
  }

  // 测试数据
  const testItineraryData = {
    destination: '瑞士琉森',
    startDate: '2024-06-01',
    days: 3,
    data: {
      days: [
        {
          day: 1,
          date: '2024-06-01',
          activities: [
            {
              time: '09:00',
              title: '铁力士峰云端漫步',
              type: 'attraction',
              duration: 120,
              location: { lat: 46.7704, lng: 8.4050 },
              notes: '详细的游览建议和体验描述',
              cost: 400,
            },
            {
              time: '14:00',
              title: '琉森湖游船',
              type: 'attraction',
              duration: 90,
              location: { lat: 47.0502, lng: 8.3093 },
              notes: '欣赏湖光山色',
              cost: 300,
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
              duration: 60,
              location: { lat: 47.0517, lng: 8.3074 },
              notes: '历史悠久的木桥',
              cost: 0,
            },
          ],
        },
      ],
      totalCost: 700,
      summary: '3天琉森文化探索之旅',
    },
    preferences: {
      interests: ['自然风光', '户外活动'],
      budget: 'medium',
      travelStyle: 'relaxed',
    },
    status: 'draft',
  };

  // 1. 测试创建行程
  console.log('📝 测试 1: POST /api/itinerary - 创建行程');
  const createResult = await testEndpoint(
    '创建行程',
    'POST',
    '/api/itinerary',
    testItineraryData,
  );
  results.push(createResult);

  if (createResult.success && createResult.data?.data?.id) {
    createdItineraryId = createResult.data.data.id;
    console.log(`   ✅ 成功 (${createResult.status}, ${createResult.duration}ms)`);
    console.log(`   📌 创建的行程ID: ${createdItineraryId}\n`);
  } else {
    console.log(`   ❌ 失败: ${createResult.error || '未知错误'}\n`);
    if (createResult.data) {
      console.log(`   响应数据: ${JSON.stringify(createResult.data, null, 2)}\n`);
    }
  }

  // 2. 测试获取行程列表
  console.log('📋 测试 2: GET /api/itinerary - 获取行程列表');
  const listResult = await testEndpoint('获取行程列表', 'GET', '/api/itinerary?page=1&limit=10');
  results.push(listResult);

  if (listResult.success) {
    console.log(`   ✅ 成功 (${listResult.status}, ${listResult.duration}ms)`);
    const listData = listResult.data?.data || [];
    console.log(`   📊 返回 ${listData.length} 条记录，总计 ${listResult.data?.total || 0} 条\n`);
  } else {
    console.log(`   ❌ 失败: ${listResult.error || '未知错误'}\n`);
  }

  // 3. 测试获取行程详情
  if (createdItineraryId) {
    console.log(`🔍 测试 3: GET /api/itinerary/${createdItineraryId} - 获取行程详情`);
    const detailResult = await testEndpoint(
      '获取行程详情',
      'GET',
      `/api/itinerary/${createdItineraryId}`,
    );
    results.push(detailResult);

    if (detailResult.success) {
      console.log(`   ✅ 成功 (${detailResult.status}, ${detailResult.duration}ms)`);
      const detail = detailResult.data?.data;
      if (detail) {
        console.log(`   📍 目的地: ${detail.destination}`);
        console.log(`   📅 开始日期: ${detail.startDate}`);
        console.log(`   📆 天数: ${detail.daysCount || detail.days}`);
        console.log(`   💰 总费用: ${detail.totalCost}\n`);
      }
    } else {
      console.log(`   ❌ 失败: ${detailResult.error || '未知错误'}\n`);
    }

    // 4. 测试更新行程
    console.log(`✏️  测试 4: PATCH /api/itinerary/${createdItineraryId} - 更新行程`);
    const updateData = {
      summary: '更新后的行程摘要',
      totalCost: 800,
      status: 'published',
    };
    const updateResult = await testEndpoint(
      '更新行程',
      'PATCH',
      `/api/itinerary/${createdItineraryId}`,
      updateData,
    );
    results.push(updateResult);

    if (updateResult.success) {
      console.log(`   ✅ 成功 (${updateResult.status}, ${updateResult.duration}ms)`);
      const updated = updateResult.data?.data;
      if (updated) {
        console.log(`   📝 更新后的摘要: ${updated.summary}`);
        console.log(`   💰 更新后的费用: ${updated.totalCost}`);
        console.log(`   📌 更新后的状态: ${updated.status}\n`);
      }
    } else {
      console.log(`   ❌ 失败: ${updateResult.error || '未知错误'}\n`);
    }

    // 5. 测试删除行程
    console.log(`🗑️  测试 5: DELETE /api/itinerary/${createdItineraryId} - 删除行程`);
    const deleteResult = await testEndpoint(
      '删除行程',
      'DELETE',
      `/api/itinerary/${createdItineraryId}`,
    );
    results.push(deleteResult);

    if (deleteResult.success) {
      console.log(`   ✅ 成功 (${deleteResult.status}, ${deleteResult.duration}ms)`);
      console.log(`   💬 消息: ${deleteResult.data?.message || '行程已删除'}\n`);
    } else {
      console.log(`   ❌ 失败: ${deleteResult.error || '未知错误'}\n`);
    }

    // 6. 验证删除后无法获取
    console.log(`🔍 测试 6: GET /api/itinerary/${createdItineraryId} - 验证删除后无法获取`);
    const verifyResult = await testEndpoint(
      '验证删除',
      'GET',
      `/api/itinerary/${createdItineraryId}`,
    );
    results.push(verifyResult);

    if (!verifyResult.success && verifyResult.status === 404) {
      console.log(`   ✅ 成功 (${verifyResult.status}, ${verifyResult.duration}ms) - 行程已正确删除\n`);
    } else {
      console.log(`   ⚠️  警告: 删除后仍能获取行程 (${verifyResult.status})\n`);
    }
  } else {
    console.log('⚠️  跳过后续测试（创建行程失败）\n');
  }

  // 打印测试总结
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const statusText = result.status ? `[${result.status}]` : '';
    console.log(
      `${icon} ${result.name} ${statusText} (${result.duration}ms)`,
    );
    if (!result.success && result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  console.log('='.repeat(50));
  console.log(
    `总计: ${results.length} 个测试 | ✅ 成功: ${successCount} | ❌ 失败: ${failCount} | ⏱️  总耗时: ${totalDuration}ms`,
  );

  if (failCount === 0) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查：');
    console.log('   1. 服务器是否正在运行 (npm run start:dev)');
    console.log('   2. API token 是否正确设置');
    console.log('   3. 数据库连接是否正常');
    console.log('   4. 相关服务是否可用');
  }
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});

