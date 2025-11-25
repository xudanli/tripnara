// 测试脚本：验证批量创建天数接口
const testCases = [
  {
    name: '单个对象格式',
    body: { day: 1, date: '2025-11-25' },
    expectedType: 'single'
  },
  {
    name: '数组格式',
    body: [
      { day: 1, date: '2025-11-25' },
      { day: 2, date: '2025-11-26' },
      { day: 3, date: '2025-11-27' }
    ],
    expectedType: 'array'
  },
  {
    name: '包装格式',
    body: {
      days: [
        { day: 1, date: '2025-11-25' },
        { day: 2, date: '2025-11-26' }
      ]
    },
    expectedType: 'array'
  }
];

console.log('测试用例：');
testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('请求体:', JSON.stringify(testCase.body, null, 2));
  console.log('是否为数组:', Array.isArray(testCase.body));
  if (!Array.isArray(testCase.body) && typeof testCase.body === 'object') {
    console.log('是否有days属性:', 'days' in testCase.body);
    console.log('是否有day属性:', 'day' in testCase.body);
  }
});
