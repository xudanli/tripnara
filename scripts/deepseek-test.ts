import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LlmService } from '../src/modules/llm/llm.service';

async function main() {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const llmService = appContext.get(LlmService);

    const response = await llmService.chatCompletion({
      provider: 'deepseek',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for TripMind.' },
        { role: 'user', content: '给我一句旅行灵感文案。' },
      ],
      temperature: 0.7,
    });

    console.log('DeepSeek 响应:\n', response);
  } catch (error) {
    console.error('调用 DeepSeek 失败:', error);
  } finally {
    await appContext.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
