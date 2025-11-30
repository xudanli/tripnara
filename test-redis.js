// test-redis.js
// 这里的 require 路径取决于你的项目结构，如果是在根目录直接运行，通常 node_modules 就在旁边
const Redis = require('ioredis');

// ⚠️ 注意：这里我用了你之前提供的地址，请务必确认密码是最新的！
// 如果你已经修改了密码，请替换下面的 'zq9fmn6d'
const connectionString = 'redis://default:zq9fmn6d@dbconn.sealoshzh.site:40448';

console.log('正在尝试连接 Redis...');

const redis = new Redis(connectionString, {
  // 关键配置：BullMQ 必须项
  maxRetriesPerRequest: null, 
  // 连接超时设置（毫秒）
  connectTimeout: 10000, 
  // 如果是云数据库，有时需要开启 TLS（SSL），如果报错可以尝试解开下面这行的注释
  // tls: {}, 
});

redis.on('connect', () => {
  console.log('✅ TCP 连接建立成功！');
});

redis.on('ready', () => {
  console.log('✅ Redis 握手成功 (Ready)！认证通过！');
  
  // 发送一个测试命令
  redis.ping().then((result) => {
    console.log(`🏓 PING 响应: ${result}`);
    redis.disconnect(); // 测试完断开
    console.log('测试结束，连接已关闭。');
  }).catch(err => {
    console.error('❌ PING 失败:', err.message);
  });
});

redis.on('error', (err) => {
  console.error('❌ 连接发生错误:', err);
  // 打印更详细的错误码
  if (err.code === 'WRONGPASS') {
    console.error('👉 原因：密码错误！');
  } else if (err.code === 'ENOTFOUND') {
    console.error('👉 原因：主机地址错误！');
  }
  redis.disconnect();
});