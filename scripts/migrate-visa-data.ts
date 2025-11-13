import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import {
  VisaPolicyEntity,
  VisaUnionEntity,
  VisaUnionCountryEntity,
  ApplicantType,
  VisaType,
} from '../src/modules/persistence/entities/visa.entity';

/**
 * 示例数据结构
 * 请根据实际的 src/config/visa.ts 文件格式调整此接口和解析逻辑
 */
interface LegacyVisaInfo {
  destinationCountry: string;
  destinationName: string;
  visaType: string; // 'visa-free' | 'visa-on-arrival' | 'e-visa' | 'visa-required'
  applicableTo: string;
  description?: string;
  duration?: number;
  applicationUrl?: string;
}

interface LegacyVisaUnion {
  unionKey: string;
  unionName: string;
  visaName: string;
  description?: string;
  countries: Array<{ code: string; name: string }>;
}

/**
 * 解析申请人键（如 'CN' 或 'CN-PR'）
 */
function parseApplicantKey(
  key: string,
): [ApplicantType, string] {
  if (key.endsWith('-PR')) {
    return ['permanent_resident', key.replace('-PR', '').toUpperCase()];
  }
  return ['nationality', key.toUpperCase()];
}

/**
 * 转换签证类型字符串为枚举值
 */
function mapVisaType(type: string): VisaType {
  const typeMap: Record<string, VisaType> = {
    'visa-free': 'visa-free',
    'visa-on-arrival': 'visa-on-arrival',
    'e-visa': 'e-visa',
    'visa-required': 'visa-required',
    'permanent-resident-benefit': 'permanent-resident-benefit',
  };
  return typeMap[type] || 'visa-required';
}

/**
 * 迁移签证联盟数据
 */
async function migrateVisaUnions(
  dataSource: DataSource,
  unions: LegacyVisaUnion[],
): Promise<void> {
  const unionRepository = dataSource.getRepository(VisaUnionEntity);
  const countryRepository = dataSource.getRepository(VisaUnionCountryEntity);

  for (const unionData of unions) {
    // 检查是否已存在
    let union = await unionRepository.findOne({
      where: { unionKey: unionData.unionKey },
    });

    if (!union) {
      union = unionRepository.create({
        unionKey: unionData.unionKey,
        unionName: unionData.unionName,
        visaName: unionData.visaName,
        description: unionData.description,
      });
      union = await unionRepository.save(union);
      console.log(`✓ 创建签证联盟: ${unionData.unionName}`);
    } else {
      console.log(`- 签证联盟已存在: ${unionData.unionName}`);
    }

    // 迁移联盟国家
    for (const country of unionData.countries) {
      const existing = await countryRepository.findOne({
        where: {
          unionId: union.id,
          countryCode: country.code.toUpperCase(),
        },
      });

      if (!existing) {
        await countryRepository.save({
          unionId: union.id,
          countryCode: country.code.toUpperCase(),
          countryName: country.name,
        });
        console.log(`  ✓ 添加国家: ${country.name} (${country.code})`);
      }
    }
  }
}

/**
 * 迁移签证政策数据
 */
async function migrateVisaPolicies(
  dataSource: DataSource,
  visaInfo: Record<string, Record<string, LegacyVisaInfo[]>>,
): Promise<void> {
  const repository = dataSource.getRepository(VisaPolicyEntity);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const [destinationCode, policies] of Object.entries(visaInfo)) {
    for (const [applicantKey, visaInfos] of Object.entries(policies)) {
      const [applicantType, applicantCode] = parseApplicantKey(applicantKey);

      for (const visaInfo of visaInfos) {
        // 检查是否已存在
        const existing = await repository.findOne({
          where: {
            destinationCountryCode: destinationCode.toUpperCase(),
            applicantType,
            applicantCountryCode: applicantCode,
            visaType: mapVisaType(visaInfo.visaType),
          },
        });

        if (existing) {
          totalSkipped++;
          continue;
        }

        const policy = repository.create({
          destinationCountryCode: destinationCode.toUpperCase(),
          destinationCountryName: visaInfo.destinationName,
          applicantType,
          applicantCountryCode: applicantCode,
          applicantDescription: visaInfo.applicableTo,
          visaType: mapVisaType(visaInfo.visaType),
          description: visaInfo.description,
          durationDays: visaInfo.duration,
          applicationUrl: visaInfo.applicationUrl,
          isActive: true,
          effectiveDate: new Date(),
        });

        await repository.save(policy);
        totalCreated++;
        console.log(
          `✓ 创建政策: ${visaInfo.destinationName} - ${visaInfo.applicableTo} (${visaInfo.visaType})`,
        );
      }
    }
  }

  console.log(`\n迁移完成: 创建 ${totalCreated} 条，跳过 ${totalSkipped} 条`);
}

/**
 * 主函数
 * 
 * 使用说明：
 * 1. 请先创建或更新 src/config/visa.ts 文件，包含 VISA_INFO 和 VISA_UNIONS 数据
 * 2. 根据实际数据结构调整上面的接口定义
 * 3. 运行: npx ts-node scripts/migrate-visa-data.ts
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    // TODO: 从 src/config/visa.ts 导入数据
    // import { VISA_INFO, VISA_UNIONS } from '../src/config/visa';
    
    // 示例数据结构（请替换为实际数据）
    const VISA_UNIONS: LegacyVisaUnion[] = [
              {
                "unionKey": "schengen",
                "unionName": "申根区",
                "visaName": "申根签证",
                "description": "申根区包括27个欧洲国家，持有任一成员国签发的申根签证即可在所有申根国家自由旅行",
                "countries": [
                  { "code": "AT", "name": "奥地利" },
                  { "code": "BE", "name": "比利时" },
                  { "code": "HR", "name": "克罗地亚" },
                  { "code": "CZ", "name": "捷克" },
                  { "code": "DK", "name": "丹麦" },
                  { "code": "EE", "name": "爱沙尼亚" },
                  { "code": "FI", "name": "芬兰" },
                  { "code": "FR", "name": "法国" },
                  { "code": "DE", "name": "德国" },
                  { "code": "GR", "name": "希腊" },
                  { "code": "HU", "name": "匈牙利" },
                  { "code": "IS", "name": "冰岛" },
                  { "code": "IT", "name": "意大利" },
                  { "code": "LV", "name": "拉脱维亚" },
                  { "code": "LI", "name": "列支敦士登" },
                  { "code": "LT", "name": "立陶宛" },
                  { "code": "LU", "name": "卢森堡" },
                  { "code": "MT", "name": "马耳他" },
                  { "code": "NL", "name": "荷兰" },
                  { "code": "NO", "name": "挪威" },
                  { "code": "PL", "name": "波兰" },
                  { "code": "PT", "name": "葡萄牙" },
                  { "code": "SK", "name": "斯洛伐克" },
                  { "code": "SI", "name": "斯洛文尼亚" },
                  { "code": "ES", "name": "西班牙" },
                  { "code": "SE", "name": "瑞典" },
                  { "code": "CH", "name": "瑞士" }
                ]
              },
              {
                "unionKey": "asean",
                "unionName": "东盟",
                "visaName": "东盟签证便利",
                "description": "东南亚国家联盟，成员国之间有部分签证便利政策，但并非完全互免签证",
                "countries": [
                  { "code": "BN", "name": "文莱" },
                  { "code": "KH", "name": "柬埔寨" },
                  { "code": "ID", "name": "印度尼西亚" },
                  { "code": "LA", "name": "老挝" },
                  { "code": "MY", "name": "马来西亚" },
                  { "code": "MM", "name": "缅甸" },
                  { "code": "PH", "name": "菲律宾" },
                  { "code": "SG", "name": "新加坡" },
                  { "code": "TH", "name": "泰国" },
                  { "code": "VN", "name": "越南" }
                ]
              },
              {
                "unionKey": "gcc",
                "unionName": "海湾合作委员会",
                "visaName": "GCC统一签证",
                "description": "海湾合作委员会成员国，正在推进统一签证政策",
                "countries": [
                  { "code": "AE", "name": "阿联酋" },
                  { "code": "BH", "name": "巴林" },
                  { "code": "SA", "name": "沙特阿拉伯" },
                  { "code": "OM", "name": "阿曼" },
                  { "code": "QA", "name": "卡塔尔" },
                  { "code": "KW", "name": "科威特" }
                ]
              },
              {
                "unionKey": "eu",
                "unionName": "欧洲联盟",
                "visaName": "欧盟签证政策",
                "description": "欧洲联盟成员国，有相对统一的签证政策",
                "countries": [
                  { "code": "AT", "name": "奥地利" },
                  { "code": "BE", "name": "比利时" },
                  { "code": "BG", "name": "保加利亚" },
                  { "code": "HR", "name": "克罗地亚" },
                  { "code": "CY", "name": "塞浦路斯" },
                  { "code": "CZ", "name": "捷克" },
                  { "code": "DK", "name": "丹麦" },
                  { "code": "EE", "name": "爱沙尼亚" },
                  { "code": "FI", "name": "芬兰" },
                  { "code": "FR", "name": "法国" },
                  { "code": "DE", "name": "德国" },
                  { "code": "GR", "name": "希腊" },
                  { "code": "HU", "name": "匈牙利" },
                  { "code": "IE", "name": "爱尔兰" },
                  { "code": "IT", "name": "意大利" },
                  { "code": "LV", "name": "拉脱维亚" },
                  { "code": "LT", "name": "立陶宛" },
                  { "code": "LU", "name": "卢森堡" },
                  { "code": "MT", "name": "马耳他" },
                  { "code": "NL", "name": "荷兰" },
                  { "code": "PL", "name": "波兰" },
                  { "code": "PT", "name": "葡萄牙" },
                  { "code": "RO", "name": "罗马尼亚" },
                  { "code": "SK", "name": "斯洛伐克" },
                  { "code": "SI", "name": "斯洛文尼亚" },
                  { "code": "ES", "name": "西班牙" },
                  { "code": "SE", "name": "瑞典" }
                ]
              },
              {
                "unionKey": "caricom",
                "unionName": "加勒比共同体",
                "visaName": "加勒比签证",
                "description": "加勒比共同体成员国，有部分签证互免政策",
                "countries": [
                  { "code": "AG", "name": "安提瓜和巴布达" },
                  { "code": "BS", "name": "巴哈马" },
                  { "code": "BB", "name": "巴巴多斯" },
                  { "code": "BZ", "name": "伯利兹" },
                  { "code": "DM", "name": "多米尼克" },
                  { "code": "GD", "name": "格林纳达" },
                  { "code": "GY", "name": "圭亚那" },
                  { "code": "HT", "name": "海地" },
                  { "code": "JM", "name": "牙买加" },
                  { "code": "KN", "name": "圣基茨和尼维斯" },
                  { "code": "LC", "name": "圣卢西亚" },
                  { "code": "VC", "name": "圣文森特和格林纳丁斯" },
                  { "code": "SR", "name": "苏里南" },
                  { "code": "TT", "name": "特立尼达和多巴哥" }
                ]
              },
              {
                "unionKey": "mercosur",
                "unionName": "南美共同市场",
                "visaName": "南美签证便利",
                "description": "南美共同市场成员国，公民可自由流动，对游客有签证便利",
                "countries": [
                  { "code": "AR", "name": "阿根廷" },
                  { "code": "BR", "name": "巴西" },
                  { "code": "PY", "name": "巴拉圭" },
                  { "code": "UY", "name": "乌拉圭" },
                  { "code": "VE", "name": "委内瑞拉" }
                ]
              },
              {
                "unionKey": "ca4",
                "unionName": "中美洲四国",
                "visaName": "中美洲统一签证",
                "description": "危地马拉、萨尔瓦多、洪都拉斯、尼加拉瓜四国签证互通",
                "countries": [
                  { "code": "GT", "name": "危地马拉" },
                  { "code": "SV", "name": "萨尔瓦多" },
                  { "code": "HN", "name": "洪都拉斯" },
                  { "code": "NI", "name": "尼加拉瓜" }
                ]
              },
              {
                "unionKey": "ecowas",
                "unionName": "西非国家经济共同体",
                "visaName": "西非签证",
                "description": "西非国家经济共同体，推进区域内免签政策",
                "countries": [
                  { "code": "BJ", "name": "贝宁" },
                  { "code": "BF", "name": "布基纳法索" },
                  { "code": "CV", "name": "佛得角" },
                  { "code": "CI", "name": "科特迪瓦" },
                  { "code": "GM", "name": "冈比亚" },
                  { "code": "GH", "name": "加纳" },
                  { "code": "GN", "name": "几内亚" },
                  { "code": "GW", "name": "几内亚比绍" },
                  { "code": "LR", "name": "利比里亚" },
                  { "code": "ML", "name": "马里" },
                  { "code": "NE", "name": "尼日尔" },
                  { "code": "NG", "name": "尼日利亚" },
                  { "code": "SN", "name": "塞内加尔" },
                  { "code": "SL", "name": "塞拉利昂" },
                  { "code": "TG", "name": "多哥" }
                ]
              },
              {
                "unionKey": "balkan",
                "unionName": "西巴尔干地区",
                "visaName": "巴尔干签证便利",
                "description": "西巴尔干国家有相互承认签证的便利政策",
                "countries": [
                  { "code": "AL", "name": "阿尔巴尼亚" },
                  { "code": "BA", "name": "波黑" },
                  { "code": "ME", "name": "黑山" },
                  { "code": "MK", "name": "北马其顿" },
                  { "code": "RS", "name": "塞尔维亚" },
                  { "code": "XK", "name": "科索沃" }
                ]
              },
              {
                "unionKey": "commonwealth",
                "unionName": "英联邦",
                "visaName": "英联邦签证便利",
                "description": "英联邦国家间有部分签证便利政策",
                "countries": [
                  { "code": "AU", "name": "澳大利亚" },
                  { "code": "CA", "name": "加拿大" },
                  { "code": "NZ", "name": "新西兰" },
                  { "code": "GB", "name": "英国" },
                  { "code": "IN", "name": "印度" },
                  { "code": "MY", "name": "马来西亚" },
                  { "code": "SG", "name": "新加坡" },
                  { "code": "ZA", "name": "南非" },
                  { "code": "KE", "name": "肯尼亚" },
                  { "code": "NG", "name": "尼日利亚" },
                  { "code": "PK", "name": "巴基斯坦" },
                  { "code": "BD", "name": "孟加拉国" },
                  { "code": "LK", "name": "斯里兰卡" },
                  { "code": "FJ", "name": "斐济" },
                  { "code": "JM", "name": "牙买加" },
                  { "code": "TT", "name": "特立尼达和多巴哥" }
                ]
            }
    ];

    const VISA_INFO: Record<string, Record<string, LegacyVisaInfo[]>> = {
        // 亚洲国家
        JP: {
          CN: [
            {
              destinationCountry: 'JP',
              destinationName: '日本',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请旅游签证',
              duration: 15,
              applicationUrl: 'https://www.cn.emb-japan.go.jp/consular/visa_shikaku.htm',
            },
          ],
          US: [
            {
              destinationCountry: 'JP',
              destinationName: '日本',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'JP',
              destinationName: '日本',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 90,
            },
          ],
        },
      
        TH: {
          CN: [
            {
              destinationCountry: 'TH',
              destinationName: '泰国',
              visaType: 'visa-free',
              applicableTo: '中国护照',
              description: '免签入境，需持有返程机票',
              duration: 30,
            },
          ],
          US: [
            {
              destinationCountry: 'TH',
              destinationName: '泰国',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 30,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'TH',
              destinationName: '泰国',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 30,
            },
          ],
        },
      
        KR: {
          CN: [
            {
              destinationCountry: 'KR',
              destinationName: '韩国',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请签证，济州岛免签',
              applicationUrl: 'https://overseas.mofa.go.kr/cn-zh/brd/m_2114/list.do',
            },
          ],
          US: [
            {
              destinationCountry: 'KR',
              destinationName: '韩国',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'KR',
              destinationName: '韩国',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 90,
            },
          ],
        },
      
        SG: {
          CN: [
            {
              destinationCountry: 'SG',
              destinationName: '新加坡',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请签证',
              applicationUrl: 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore',
            },
          ],
          US: [
            {
              destinationCountry: 'SG',
              destinationName: '新加坡',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'SG',
              destinationName: '新加坡',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 30,
            },
          ],
        },
      
        MY: {
          CN: [
            {
              destinationCountry: 'MY',
              destinationName: '马来西亚',
              visaType: 'e-visa',
              applicableTo: '中国护照',
              description: '可在线申请电子签证',
              duration: 30,
              applicationUrl: 'https://www.malaysiavisa.com.my/',
            },
          ],
          US: [
            {
              destinationCountry: 'MY',
              destinationName: '马来西亚',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'MY',
              destinationName: '马来西亚',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 90,
            },
          ],
        },
      
        ID: {
          CN: [
            {
              destinationCountry: 'ID',
              destinationName: '印度尼西亚',
              visaType: 'visa-on-arrival',
              applicableTo: '中国护照',
              description: '可落地签，费用35美元',
              duration: 30,
            },
          ],
          US: [
            {
              destinationCountry: 'ID',
              destinationName: '印度尼西亚',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 30,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'ID',
              destinationName: '印度尼西亚',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 30,
            },
          ],
        },
      
        VN: {
          CN: [
            {
              destinationCountry: 'VN',
              destinationName: '越南',
              visaType: 'e-visa',
              applicableTo: '中国护照',
              description: '可在线申请电子签证',
              duration: 30,
              applicationUrl: 'https://evisa.xuatnhapcanh.gov.vn/',
            },
          ],
          US: [
            {
              destinationCountry: 'VN',
              destinationName: '越南',
              visaType: 'e-visa',
              applicableTo: '美国护照',
              description: '可在线申请电子签证',
              duration: 30,
              applicationUrl: 'https://evisa.xuatnhapcanh.gov.vn/',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'VN',
              destinationName: '越南',
              visaType: 'e-visa',
              applicableTo: '美国永久居民',
              description: '可在线申请电子签证',
              duration: 30,
              applicationUrl: 'https://evisa.xuatnhapcanh.gov.vn/',
            },
          ],
        },
      
        PH: {
          CN: [
            {
              destinationCountry: 'PH',
              destinationName: '菲律宾',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请签证',
              applicationUrl: 'https://www.visa.gov.ph/',
            },
          ],
          US: [
            {
              destinationCountry: 'PH',
              destinationName: '菲律宾',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 30,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'PH',
              destinationName: '菲律宾',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 30,
            },
          ],
        },
      
        // 北美国家
        US: {
          CN: [
            {
              destinationCountry: 'US',
              destinationName: '美国',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请B1/B2旅游签证',
              duration: 180,
              applicationUrl: 'https://www.ustraveldocs.com/cn_zh/',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'US',
              destinationName: '美国',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者无需签证',
              duration: 0,
            },
          ],
        },
      
        CA: {
          CN: [
            {
              destinationCountry: 'CA',
              destinationName: '加拿大',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请旅游签证',
              applicationUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/apply-visitor-visa.html',
            },
          ],
          US: [
            {
              destinationCountry: 'CA',
              destinationName: '加拿大',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 180,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'CA',
              destinationName: '加拿大',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境（需携带绿卡）',
              duration: 180,
            },
          ],
        },
      
        MX: {
          CN: [
            {
              destinationCountry: 'MX',
              destinationName: '墨西哥',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请签证',
              applicationUrl: 'https://consulmex.sre.gob.mx/guangzhou/',
            },
          ],
          US: [
            {
              destinationCountry: 'MX',
              destinationName: '墨西哥',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 180,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'MX',
              destinationName: '墨西哥',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境（需携带绿卡）',
              duration: 180,
            },
          ],
        },
      
        // 欧洲国家
        GB: {
          CN: [
            {
              destinationCountry: 'GB',
              destinationName: '英国',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请标准访客签证',
              applicationUrl: 'https://www.gov.uk/standard-visitor-visa',
            },
          ],
          US: [
            {
              destinationCountry: 'GB',
              destinationName: '英国',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 180,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'GB',
              destinationName: '英国',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 180,
            },
          ],
        },
      
        FR: {
          CN: [
            {
              destinationCountry: 'FR',
              destinationName: '法国',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请申根签证',
              applicationUrl: 'https://france-visas.gouv.fr/',
            },
          ],
          US: [
            {
              destinationCountry: 'FR',
              destinationName: '法国',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境（申根区）',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'FR',
              destinationName: '法国',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境（申根区）',
              duration: 90,
            },
          ],
        },
      
        DE: {
          CN: [
            {
              destinationCountry: 'DE',
              destinationName: '德国',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请申根签证',
              applicationUrl: 'https://www.germany-visa.org/',
            },
          ],
          US: [
            {
              destinationCountry: 'DE',
              destinationName: '德国',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境（申根区）',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'DE',
              destinationName: '德国',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境（申根区）',
              duration: 90,
            },
          ],
        },
      
        IT: {
          CN: [
            {
              destinationCountry: 'IT',
              destinationName: '意大利',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请申根签证',
              applicationUrl: 'https://ambpechino.esteri.it/',
            },
          ],
          US: [
            {
              destinationCountry: 'IT',
              destinationName: '意大利',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境（申根区）',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'IT',
              destinationName: '意大利',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境（申根区）',
              duration: 90,
            },
          ],
        },
      
        ES: {
          CN: [
            {
              destinationCountry: 'ES',
              destinationName: '西班牙',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请申根签证',
              applicationUrl: 'https://www.spainvisa-china.com/',
            },
          ],
          US: [
            {
              destinationCountry: 'ES',
              destinationName: '西班牙',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境（申根区）',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'ES',
              destinationName: '西班牙',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境（申根区）',
              duration: 90,
            },
          ],
        },
      
        // 大洋洲国家
        AU: {
          CN: [
            {
              destinationCountry: 'AU',
              destinationName: '澳大利亚',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请旅游签证（子类600）',
              applicationUrl: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
            },
          ],
          US: [
            {
              destinationCountry: 'AU',
              destinationName: '澳大利亚',
              visaType: 'e-visa',
              applicableTo: '美国护照',
              description: '可在线申请电子旅行许可（ETA）',
              duration: 90,
              applicationUrl: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'AU',
              destinationName: '澳大利亚',
              visaType: 'e-visa',
              applicableTo: '美国永久居民',
              description: '可在线申请电子旅行许可（ETA）',
              duration: 90,
              applicationUrl: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
            },
          ],
        },
      
        NZ: {
          CN: [
            {
              destinationCountry: 'NZ',
              destinationName: '新西兰',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请旅游签证',
              applicationUrl: 'https://www.immigration.govt.nz/new-zealand-visas',
            },
          ],
          US: [
            {
              destinationCountry: 'NZ',
              destinationName: '新西兰',
              visaType: 'e-visa',
              applicableTo: '美国护照',
              description: '可在线申请电子旅行许可（NZeTA）',
              duration: 90,
              applicationUrl: 'https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'NZ',
              destinationName: '新西兰',
              visaType: 'e-visa',
              applicableTo: '美国永久居民',
              description: '可在线申请电子旅行许可（NZeTA）',
              duration: 90,
              applicationUrl: 'https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta',
            },
          ],
        },
      
        // 中东国家
        AE: {
          CN: [
            {
              destinationCountry: 'AE',
              destinationName: '阿联酋',
              visaType: 'visa-free',
              applicableTo: '中国护照',
              description: '免签入境',
              duration: 30,
            },
          ],
          US: [
            {
              destinationCountry: 'AE',
              destinationName: '阿联酋',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 30,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'AE',
              destinationName: '阿联酋',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 30,
            },
          ],
        },
      
        TR: {
          CN: [
            {
              destinationCountry: 'TR',
              destinationName: '土耳其',
              visaType: 'e-visa',
              applicableTo: '中国护照',
              description: '可在线申请电子签证',
              duration: 30,
              applicationUrl: 'https://www.evisa.gov.tr/',
            },
          ],
          US: [
            {
              destinationCountry: 'TR',
              destinationName: '土耳其',
              visaType: 'e-visa',
              applicableTo: '美国护照',
              description: '可在线申请电子签证',
              duration: 90,
              applicationUrl: 'https://www.evisa.gov.tr/',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'TR',
              destinationName: '土耳其',
              visaType: 'e-visa',
              applicableTo: '美国永久居民',
              description: '可在线申请电子签证',
              duration: 90,
              applicationUrl: 'https://www.evisa.gov.tr/',
            },
          ],
        },
      
        // 南亚国家
        IN: {
          CN: [
            {
              destinationCountry: 'IN',
              destinationName: '印度',
              visaType: 'e-visa',
              applicableTo: '中国护照',
              description: '可在线申请电子签证',
              duration: 60,
              applicationUrl: 'https://indianvisaonline.gov.in/evisa/',
            },
          ],
          US: [
            {
              destinationCountry: 'IN',
              destinationName: '印度',
              visaType: 'e-visa',
              applicableTo: '美国护照',
              description: '可在线申请电子签证',
              duration: 60,
              applicationUrl: 'https://indianvisaonline.gov.in/evisa/',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'IN',
              destinationName: '印度',
              visaType: 'e-visa',
              applicableTo: '美国永久居民',
              description: '可在线申请电子签证',
              duration: 60,
              applicationUrl: 'https://indianvisaonline.gov.in/evisa/',
            },
          ],
        },
      
        LK: {
          CN: [
            {
              destinationCountry: 'LK',
              destinationName: '斯里兰卡',
              visaType: 'e-visa',
              applicableTo: '中国护照',
              description: '可在线申请电子旅行许可（ETA）',
              duration: 30,
              applicationUrl: 'https://www.eta.gov.lk/',
            },
          ],
          US: [
            {
              destinationCountry: 'LK',
              destinationName: '斯里兰卡',
              visaType: 'e-visa',
              applicableTo: '美国护照',
              description: '可在线申请电子旅行许可（ETA）',
              duration: 30,
              applicationUrl: 'https://www.eta.gov.lk/',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'LK',
              destinationName: '斯里兰卡',
              visaType: 'e-visa',
              applicableTo: '美国永久居民',
              description: '可在线申请电子旅行许可（ETA）',
              duration: 30,
              applicationUrl: 'https://www.eta.gov.lk/',
            },
          ],
        },
      
        // 其他热门目的地
        EG: {
          CN: [
            {
              destinationCountry: 'EG',
              destinationName: '埃及',
              visaType: 'visa-on-arrival',
              applicableTo: '中国护照',
              description: '可落地签，费用25美元',
              duration: 30,
            },
          ],
          US: [
            {
              destinationCountry: 'EG',
              destinationName: '埃及',
              visaType: 'visa-on-arrival',
              applicableTo: '美国护照',
              description: '可落地签，费用25美元',
              duration: 30,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'EG',
              destinationName: '埃及',
              visaType: 'visa-on-arrival',
              applicableTo: '美国永久居民',
              description: '可落地签，费用25美元',
              duration: 30,
            },
          ],
        },
      
        ZA: {
          CN: [
            {
              destinationCountry: 'ZA',
              destinationName: '南非',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请签证',
              applicationUrl: 'https://www.southafricavisa.com/',
            },
          ],
          US: [
            {
              destinationCountry: 'ZA',
              destinationName: '南非',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'ZA',
              destinationName: '南非',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 90,
            },
          ],
        },
      
        BR: {
          CN: [
            {
              destinationCountry: 'BR',
              destinationName: '巴西',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请签证',
              applicationUrl: 'https://brazil.vfsevisa.com/',
            },
          ],
          US: [
            {
              destinationCountry: 'BR',
              destinationName: '巴西',
              visaType: 'visa-required',
              applicableTo: '美国护照',
              description: '需要提前申请签证',
              applicationUrl: 'https://brazil.vfsevisa.com/',
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'BR',
              destinationName: '巴西',
              visaType: 'visa-required',
              applicableTo: '美国永久居民',
              description: '需要提前申请签证',
              applicationUrl: 'https://brazil.vfsevisa.com/',
            },
          ],
        },
      
        AR: {
          CN: [
            {
              destinationCountry: 'AR',
              destinationName: '阿根廷',
              visaType: 'visa-required',
              applicableTo: '中国护照',
              description: '需要提前申请签证',
              applicationUrl: 'https://www.argentina.gob.ar/',
            },
          ],
          US: [
            {
              destinationCountry: 'AR',
              destinationName: '阿根廷',
              visaType: 'visa-free',
              applicableTo: '美国护照',
              description: '免签入境',
              duration: 90,
            },
          ],
          'US-PR': [
            {
              destinationCountry: 'AR',
              destinationName: '阿根廷',
              visaType: 'visa-free',
              applicableTo: '美国永久居民',
              description: '美国绿卡持有者免签入境',
              duration: 90,
            },
          ],
        },
      };

    console.log('开始迁移签证数据...\n');

    // 1. 迁移签证联盟
    console.log('=== 迁移签证联盟 ===');
    await migrateVisaUnions(dataSource, VISA_UNIONS);
    console.log('');

    // 2. 迁移签证政策
    console.log('=== 迁移签证政策 ===');
    await migrateVisaPolicies(dataSource, VISA_INFO);

    console.log('\n✅ 所有数据迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();

