import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import {
  JourneyTemplateEntity,
  TemplateMode,
} from '../src/modules/persistence/entities/journey-template.entity';

interface TemplateModeUpdate {
  title: string;
  modePrimary: string;
  modeTags: string;
}

const updates: TemplateModeUpdate[] = [

  {
    title: '夏威夷双岛冒险八日｜大岛火山探险＋Mauna Kea观星',
    modePrimary: '地貌与星空',
    modeTags: '火山国家公园, 观星, 双岛对比, 威基基海滩, 玻里尼西亚文化'
  },
  {
    title: '北疆冬日10日深度游｜冰雪奇缘·野奢露营',
    modePrimary: '地貌与星空',
    modeTags: '冰雪越野, 图瓦文化, 雾凇秘境, 野奢营地, 边境多地'
  },
  {
    title: '呼伦贝尔+大兴安岭11日深度游｜冰雪秘境·民族风情',
    modePrimary: '地貌与星空',
    modeTags: '冰泡露营, 雪域桥梁, 图瓦春节, 雾凇, 野奢营地'
  },
  {
    title: '呼伦贝尔草原与大兴安岭林海雪原11日：神州北极漠河・驯鹿文化',
    modePrimary: '地貌与星空',
    modeTags: '草原雪原, 林海雾凇, 鄂温克驯鹿, 北极村风情, 冰雪小屋'
  },
  {
    title: '西欧六国金秋之旅｜瑞士·列支敦士登·德国·卢森堡·比利时·荷兰',
    modePrimary: '人文沉浸',
    modeTags: '多国串联, 瑞士观景列车, 中世纪古镇, 南瓜节, 黑森林'
  },
  {
    title: '东非埃塞俄比亚之旅｜小众非洲探索游',
    modePrimary: '人文沉浸',
    modeTags: '咖啡起源仪式, 奥莫河谷部落, 活火山尔塔阿雷, 达纳基勒地貌, 人类学探索'
  },
  {
    title: '东欧六国探索之旅｜斯洛文尼亚-奥地利-捷克-波兰-斯洛伐克-匈牙利',
    modePrimary: '人文沉浸',
    modeTags: '多国串联, 布莱德湖, 维也纳-布拉格-布达佩斯, 历史人文, 古镇漫步'
  },
  {
    title: '伊比利亚半岛奇幻三国之旅｜加纳利群岛·直布罗陀·安道尔',
    modePrimary: '人文沉浸',
    modeTags: '加纳利火山观星, 海豚观赏, 高迪建筑, 弗拉明戈, 多地区串联'
  },
  {
    title: '波兰+波罗的海四国深度环游｜克拉科夫·维尔纽斯·里加·塔林',
    modePrimary: '人文沉浸',
    modeTags: '四国首都环线, 世界文化遗产, 中世纪老城, 岛屿庄园, 秋色风光'
  },
  {
    title: '智利全景之旅｜复活节岛·阿塔卡马沙漠·百内国家公园',
    modePrimary: '地貌与星空',
    modeTags: '摩艾石像, 沙漠月球地貌, 冰川徒步, 巴塔哥尼亚, 高原星空'
  },
  {
    title: '挪威北部极光追寻之旅｜奥斯陆·罗弗敦群岛·特罗姆瑟·阿尔塔',
    modePrimary: '地貌与星空（Polar）',
    modeTags: '极光观测, 专业摄影, 峡湾巡游, 维京/萨米文化, 帝王蟹捕捞'
  },
  {
    title: '加勒比海中美七国小众之旅｜安提瓜·多米尼克深度探索',
    modePrimary: '海岛奢享',
    modeTags: '白沙滩海岸, 黄貂鱼互动, 国家公园, 殖民遗产, 朗姆酒体验'
  },
  {
    title: '大溪地奢华邮轮之旅｜波拉波拉·莫雷阿·胡阿希内',
    modePrimary: '海岛奢享',
    modeTags: '奢华邮轮, 多岛串联, 珊瑚花园, 私人Motu, 潜水/浮潜, 波利尼西亚文化'
  },
  {
    title: '椰海魅影｜海南-西沙群岛15天深度环岛之旅',
    modePrimary: '海岛奢享',
    modeTags: '西沙秘境, 登岛/船宿, 环岛自驾, 热带雨林, 黎苗文化'
  },
  {
    title: '西藏雪域圣谷 · 藏东雅鲁藏布江波密美景之旅',
    modePrimary: '地貌与星空',
    modeTags: '高原圣湖, 大峡谷风光, 冰川湖泊, 藏族文化, 高海拔适应'
  }

  
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

      template.modePrimary = item.modePrimary;
      template.modeTags = item.modeTags;
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

