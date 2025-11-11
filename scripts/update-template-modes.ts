import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import {
  JourneyTemplateEntity,
  TemplateMode,
} from '../src/modules/persistence/entities/journey-template.entity';

interface TemplateModeUpdate {
  title: string;
  mode: TemplateMode;
}

const updates: TemplateModeUpdate[] = [

  { title: '纳米比亚｜沙漠观星10日奢华Safari', mode: 'inspiration' },
  { title: '斐济奢华八日｜Six Senses 私岛六善度假村・帆船落日晚餐・丛林滑索', mode: 'inspiration' },
  { title: '塞席尔极致七日｜费利西泰岛六善度假村 Six Senses', mode: 'inspiration'},
  { title: '塞席尔顶奢七日｜北岛奢华精选度假村 North Island', mode: 'inspiration' },
  { title: '不丹静心八日：山谷慢旅 COMO Uma', mode: 'inspiration' },
  { title: '朝圣不丹八日：Amankora 安缦・六善奢旅巡谷', mode: 'inspiration' },
  { title: '复活节岛＋大溪地波拉波拉岛圆梦之旅（9天）', mode: 'inspiration' },
  { title: '斯里兰卡轻奢七日｜走入康提・探访私人庄园・邂逅椰子林', mode: 'inspiration' },
  { title: '土耳其七日｜日出热气球・漫步棉花堡・解锁古文明之旅', mode: 'inspiration' },
  { title: '意大利八日深度游｜米兰、威尼斯、佛罗伦斯和罗马', mode: 'inspiration' },
  { title: '斯里兰卡七日南岸｜品白茶园・亚拉野奢・航游红树林', mode: 'inspiration' },
  { title: '意大利13日火车自由行：米兰、维罗纳、威尼斯、佛罗伦斯、比萨、罗马', mode: 'inspiration' },
  { title: '意大利艺术美学之旅八日', mode: 'inspiration' },
  { title: '斐济八天六夜｜VOMO 离岛度假村 + 洲际本岛度假村', mode: 'inspiration' },
  { title: '斐济八天六夜｜海上酒吧・小岛晚餐游・Malolo离岛度假村慢活', mode: 'inspiration' },
  { title: '斐济八天六夜｜Lomani 离岛度假村 + 洲际本岛度假村',mode: 'inspiration' },
  { title: '斐济八天六夜｜Royal Davui 离岛度假村 + 洲际本岛度假村', mode: 'inspiration' },
  { title: '斐济八天六夜｜Likuliku 全包式离岛度假村 ・ 鲨鱼潜水 ・ 高空跳伞', mode: 'inspiration' },
  { title: '斯里兰卡东岸八日｜亭可马里观鲸・乘高山火车・踏遍艾拉山谷', mode: 'inspiration' },
  { title: '大溪地双岛畅玩八天六夜｜茉莉亚岛+波拉波拉康莱德', mode: 'inspiration' },
  { title: '塞席尔畅游双岛七日｜马埃岛＋普拉兰岛莱佛士度假村', mode: 'inspiration' },
  { title: '大溪地极致双岛八天六夜｜茉莉亚岛+波拉波拉泰拉索洲际', mode: 'inspiration' },
  { title: '斐济八天六夜｜Matamanoa 离岛度假村 + 洲际本岛度假村', mode: 'inspiration' },
  { title: '斐济八天六夜｜Yasawa 离岛度假村 + 希尔顿本岛度假村', mode: 'inspiration' },
  { title: "雅加达+科摩多六日｜全新开幕 TA'AKTANA 无敌海景水上别墅", mode: 'inspiration' },
  { title: '大溪地海上天堂八天六夜｜波拉波拉四季 Four Seasons', mode: 'inspiration' },
  { title: '塞席尔双四季七日｜马埃岛＋德罗什岛四季度假村', mode: 'inspiration' },
  { title: '大溪地绝景八天六夜｜波拉波拉瑞吉 St. Regis', mode: 'inspiration' },
  { title: '塞席尔绝景七日｜普拉特岛华尔道夫度假村 Waldorf Astoria', mode: 'inspiration' },
  { title: '塞席尔极致双岛七日｜马埃岛四季＋费利西泰岛六善度假村', mode: 'inspiration' },
  { title: '北极熊王国与冰川之都：斯瓦尔巴德+格陵兰岛深度探险', mode: 'inspiration' },
  { title: '大南极三岛王企鹅深度探索之旅（24天）', mode: 'inspiration' },
  { title: '北极点破冰之旅 | 登陆地球之巅90°N', mode: 'inspiration' },
  { title: '北极三极精华之旅：斯瓦尔巴德+冰岛+格陵兰（24天）', mode: 'inspiration' },
  { title: '南极南美经典之旅（18天短线）', mode: 'inspiration' },
  { title: '南极南美经典之旅（长线24天）', mode: 'inspiration' },
  { title: '北极法罗+斯瓦尔巴德群岛深度探索之旅（22天）',mode: 'inspiration' },
  { title: '格陵兰+斯瓦尔巴德群岛深度之旅（22天）', mode: 'inspiration' },
  { title: '北极三岛深度探索之旅：法罗群岛+格陵兰岛+斯瓦尔巴德群岛（28天）', mode: 'inspiration' },
  { title: '新西兰+大溪地10日｜山与海的呼吸', mode: 'inspiration' },
  { title: '夏威夷双岛冒险八日｜大岛火山探险＋Mauna Kea观星', mode: 'inspiration'},
  { title: '北极仲夏双岛之旅：法罗群岛与格陵兰岛', mode: 'inspiration' }

  
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    const repository = dataSource.getRepository(JourneyTemplateEntity);

    for (const item of updates) {
      const template = await repository.findOne({
        where: { title: item.title },
      });

      if (!template) {
        console.warn(`未找到模板：${item.title}`);
        continue;
      }

      template.mode = item.mode;
      await repository.save(template);
      console.log(`已更新模板：${item.title}`);
    }
  } catch (error) {
    console.error('更新模板模式失败：', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();

