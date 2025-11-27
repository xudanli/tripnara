#!/usr/bin/env ts-node
/**
 * 检查环境变量是否正确配置
 * 使用方法: ts-node scripts/check-env-vars.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量（模拟应用启动时的加载方式）
const env = process.env.NODE_ENV?.toLowerCase() || 'development';
const envFiles: string[] = [];

if (['production', 'prod'].includes(env)) {
  envFiles.push('.env.prod', '.env');
} else if (['staging', 'stage'].includes(env)) {
  envFiles.push('.env.stage', '.env');
} else if (env === 'test') {
  envFiles.push('.env.test', '.env');
} else {
  envFiles.push(`.env.${env}`, '.env');
}

console.log('='.repeat(60));
console.log('环境变量检查工具');
console.log('='.repeat(60));
console.log(`当前 NODE_ENV: ${process.env.NODE_ENV || '未设置 (默认: development)'}`);
console.log(`尝试加载的环境变量文件:`);
envFiles.forEach((file) => {
  const filePath = resolve(process.cwd(), file);
  console.log(`  - ${file} (${filePath})`);
});

console.log('\n' + '-'.repeat(60));
console.log('加载环境变量文件...');
console.log('-'.repeat(60));

// 按顺序加载环境变量文件
let loaded = false;
for (const file of envFiles) {
  const result = config({ path: resolve(process.cwd(), file) });
  if (!result.error) {
    console.log(`✓ 成功加载: ${file}`);
    loaded = true;
  } else {
    console.log(`✗ 未找到: ${file}`);
  }
}

if (!loaded) {
  console.log('\n⚠️  警告: 没有找到任何环境变量文件！');
  console.log('请确保项目根目录存在以下文件之一:');
  envFiles.forEach((file) => console.log(`  - ${file}`));
}

console.log('\n' + '='.repeat(60));
console.log('检查媒体服务相关的环境变量:');
console.log('='.repeat(60));

const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
const pexelsKey = process.env.PEXELS_API_KEY;

console.log('\n1. Unsplash API Key:');
if (unsplashKey) {
  console.log(`   ✓ 已配置`);
  console.log(`   长度: ${unsplashKey.length} 字符`);
  console.log(`   前10个字符: ${unsplashKey.substring(0, 10)}...`);
  if (unsplashKey.trim() !== unsplashKey) {
    console.log(`   ⚠️  警告: 值包含前后空格！`);
  }
  if (unsplashKey.length === 0) {
    console.log(`   ✗ 错误: 值为空字符串！`);
  }
} else {
  console.log(`   ✗ 未配置 (UNSPLASH_ACCESS_KEY)`);
  console.log(`   请在 .env 文件中添加: UNSPLASH_ACCESS_KEY=your_key_here`);
}

console.log('\n2. Pexels API Key:');
if (pexelsKey) {
  console.log(`   ✓ 已配置`);
  console.log(`   长度: ${pexelsKey.length} 字符`);
  console.log(`   前10个字符: ${pexelsKey.substring(0, 10)}...`);
  if (pexelsKey.trim() !== pexelsKey) {
    console.log(`   ⚠️  警告: 值包含前后空格！`);
  }
  if (pexelsKey.length === 0) {
    console.log(`   ✗ 错误: 值为空字符串！`);
  }
} else {
  console.log(`   ✗ 未配置 (PEXELS_API_KEY)`);
  console.log(`   请在 .env 文件中添加: PEXELS_API_KEY=your_key_here`);
}

console.log('\n' + '='.repeat(60));
console.log('总结:');
console.log('='.repeat(60));

if (unsplashKey && pexelsKey) {
  console.log('✓ 所有媒体服务 API Key 已配置');
  console.log('\n如果服务仍然显示未配置，请检查:');
  console.log('  1. 服务是否已重启（修改 .env 后必须重启）');
  console.log('  2. 环境变量文件路径是否正确');
  console.log('  3. 服务启动时的 NODE_ENV 值');
} else {
  console.log('✗ 部分或全部 API Key 未配置');
  console.log('\n请按照上述提示配置环境变量，然后重启服务。');
}

console.log('\n');

