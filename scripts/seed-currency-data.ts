import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  CurrencyEntity,
  CountryCurrencyMappingEntity,
} from '../src/modules/persistence/entities/reference.entity';

/**
 * 硬编码的货币数据（从 CurrencyService 提取）
 */
const COUNTRY_CURRENCY_MAP: Record<
  string,
  { code: string; symbol: string; name: { zh: string; en: string } }
> = {
  // 亚洲
  CN: { code: 'CNY', symbol: '¥', name: { zh: '人民币', en: 'CNY' } },
  JP: { code: 'JPY', symbol: '¥', name: { zh: '日元', en: 'JPY' } },
  KR: { code: 'KRW', symbol: '₩', name: { zh: '韩元', en: 'KRW' } },
  SG: { code: 'SGD', symbol: 'S$', name: { zh: '新加坡元', en: 'SGD' } },
  MY: { code: 'MYR', symbol: 'RM', name: { zh: '马来西亚林吉特', en: 'MYR' } },
  TH: { code: 'THB', symbol: '฿', name: { zh: '泰铢', en: 'THB' } },
  VN: { code: 'VND', symbol: '₫', name: { zh: '越南盾', en: 'VND' } },
  ID: { code: 'IDR', symbol: 'Rp', name: { zh: '印尼盾', en: 'IDR' } },
  PH: { code: 'PHP', symbol: '₱', name: { zh: '菲律宾比索', en: 'PHP' } },
  IN: { code: 'INR', symbol: '₹', name: { zh: '印度卢比', en: 'INR' } },
  HK: { code: 'HKD', symbol: 'HK$', name: { zh: '港币', en: 'HKD' } },
  TW: { code: 'TWD', symbol: 'NT$', name: { zh: '新台币', en: 'TWD' } },
  MO: { code: 'MOP', symbol: 'MOP$', name: { zh: '澳门元', en: 'MOP' } },
  IS: { code: 'ISK', symbol: 'kr', name: { zh: '冰岛克朗', en: 'ISK' } },

  // 欧洲
  CH: { code: 'CHF', symbol: 'CHF', name: { zh: '瑞士法郎', en: 'CHF' } },
  GB: { code: 'GBP', symbol: '£', name: { zh: '英镑', en: 'GBP' } },
  FR: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  DE: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  IT: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  ES: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  NL: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  BE: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  AT: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  PT: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  GR: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  IE: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  FI: { code: 'EUR', symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  DK: { code: 'DKK', symbol: 'kr', name: { zh: '丹麦克朗', en: 'DKK' } },
  SE: { code: 'SEK', symbol: 'kr', name: { zh: '瑞典克朗', en: 'SEK' } },
  NO: { code: 'NOK', symbol: 'kr', name: { zh: '挪威克朗', en: 'NOK' } },
  PL: { code: 'PLN', symbol: 'zł', name: { zh: '波兰兹罗提', en: 'PLN' } },
  CZ: { code: 'CZK', symbol: 'Kč', name: { zh: '捷克克朗', en: 'CZK' } },
  HU: { code: 'HUF', symbol: 'Ft', name: { zh: '匈牙利福林', en: 'HUF' } },
  RU: { code: 'RUB', symbol: '₽', name: { zh: '俄罗斯卢布', en: 'RUB' } },

  // 美洲
  US: { code: 'USD', symbol: '$', name: { zh: '美元', en: 'USD' } },
  CA: { code: 'CAD', symbol: 'C$', name: { zh: '加元', en: 'CAD' } },
  MX: { code: 'MXN', symbol: '$', name: { zh: '墨西哥比索', en: 'MXN' } },
  BR: { code: 'BRL', symbol: 'R$', name: { zh: '巴西雷亚尔', en: 'BRL' } },
  AR: { code: 'ARS', symbol: '$', name: { zh: '阿根廷比索', en: 'ARS' } },
  CL: { code: 'CLP', symbol: '$', name: { zh: '智利比索', en: 'CLP' } },

  // 大洋洲
  AU: { code: 'AUD', symbol: 'A$', name: { zh: '澳元', en: 'AUD' } },
  NZ: { code: 'NZD', symbol: 'NZ$', name: { zh: '新西兰元', en: 'NZD' } },

  // 中东
  AE: { code: 'AED', symbol: 'د.إ', name: { zh: '阿联酋迪拉姆', en: 'AED' } },
  SA: { code: 'SAR', symbol: '﷼', name: { zh: '沙特里亚尔', en: 'SAR' } },
  IL: { code: 'ILS', symbol: '₪', name: { zh: '以色列新谢克尔', en: 'ILS' } },
  TR: { code: 'TRY', symbol: '₺', name: { zh: '土耳其里拉', en: 'TRY' } },

  // 非洲
  ZA: { code: 'ZAR', symbol: 'R', name: { zh: '南非兰特', en: 'ZAR' } },
  EG: { code: 'EGP', symbol: 'E£', name: { zh: '埃及镑', en: 'EGP' } },
};

/**
 * 国家名称到ISO代码的映射
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // 中文名称
  中国: 'CN',
  日本: 'JP',
  韩国: 'KR',
  新加坡: 'SG',
  马来西亚: 'MY',
  泰国: 'TH',
  越南: 'VN',
  印度尼西亚: 'ID',
  菲律宾: 'PH',
  印度: 'IN',
  香港: 'HK',
  台湾: 'TW',
  澳门: 'MO',
  冰岛: 'IS',
  瑞士: 'CH',
  英国: 'GB',
  法国: 'FR',
  德国: 'DE',
  意大利: 'IT',
  西班牙: 'ES',
  荷兰: 'NL',
  比利时: 'BE',
  奥地利: 'AT',
  葡萄牙: 'PT',
  希腊: 'GR',
  爱尔兰: 'IE',
  芬兰: 'FI',
  丹麦: 'DK',
  瑞典: 'SE',
  挪威: 'NO',
  波兰: 'PL',
  捷克: 'CZ',
  匈牙利: 'HU',
  俄罗斯: 'RU',
  美国: 'US',
  加拿大: 'CA',
  墨西哥: 'MX',
  巴西: 'BR',
  阿根廷: 'AR',
  智利: 'CL',
  澳大利亚: 'AU',
  新西兰: 'NZ',
  阿联酋: 'AE',
  沙特阿拉伯: 'SA',
  以色列: 'IL',
  土耳其: 'TR',
  南非: 'ZA',
  埃及: 'EG',

  // 英文名称
  China: 'CN',
  Japan: 'JP',
  'South Korea': 'KR',
  Korea: 'KR',
  Singapore: 'SG',
  Malaysia: 'MY',
  Thailand: 'TH',
  Vietnam: 'VN',
  Indonesia: 'ID',
  Philippines: 'PH',
  India: 'IN',
  'Hong Kong': 'HK',
  Taiwan: 'TW',
  Macau: 'MO',
  Iceland: 'IS',
  Switzerland: 'CH',
  'United Kingdom': 'GB',
  UK: 'GB',
  France: 'FR',
  Germany: 'DE',
  Italy: 'IT',
  Spain: 'ES',
  Netherlands: 'NL',
  Belgium: 'BE',
  Austria: 'AT',
  Portugal: 'PT',
  Greece: 'GR',
  Ireland: 'IE',
  Finland: 'FI',
  Denmark: 'DK',
  Sweden: 'SE',
  Norway: 'NO',
  Poland: 'PL',
  'Czech Republic': 'CZ',
  Hungary: 'HU',
  Russia: 'RU',
  'United States': 'US',
  USA: 'US',
  Canada: 'CA',
  Mexico: 'MX',
  Brazil: 'BR',
  Argentina: 'AR',
  Chile: 'CL',
  Australia: 'AU',
  'New Zealand': 'NZ',
  'United Arab Emirates': 'AE',
  UAE: 'AE',
  'Saudi Arabia': 'SA',
  Israel: 'IL',
  Turkey: 'TR',
  'South Africa': 'ZA',
  Egypt: 'EG',
};

/**
 * 导入货币数据
 */
async function seedCurrencies(dataSource: DataSource): Promise<Map<string, CurrencyEntity>> {
  const currencyRepository = dataSource.getRepository(CurrencyEntity);
  const currencyMap = new Map<string, CurrencyEntity>();

  // 收集所有唯一的货币代码
  const uniqueCurrencies = new Map<string, { code: string; symbol: string; name: { zh: string; en: string } }>();
  for (const currency of Object.values(COUNTRY_CURRENCY_MAP)) {
    if (!uniqueCurrencies.has(currency.code)) {
      uniqueCurrencies.set(currency.code, currency);
    }
  }

  console.log(`\n开始导入 ${uniqueCurrencies.size} 个货币...`);

  let created = 0;
  let skipped = 0;

  for (const currency of uniqueCurrencies.values()) {
    // 检查是否已存在
    const existing = await currencyRepository.findOne({
      where: { code: currency.code },
    });

    if (existing) {
      console.log(`  跳过已存在的货币: ${currency.code} - ${currency.name.zh}`);
      currencyMap.set(currency.code, existing);
      skipped++;
      continue;
    }

    // 创建新货币
    const newCurrency = currencyRepository.create({
      code: currency.code,
      symbol: currency.symbol,
      nameZh: currency.name.zh,
      nameEn: currency.name.en,
      isActive: true,
    });

    const saved = await currencyRepository.save(newCurrency);
    currencyMap.set(currency.code, saved);
    console.log(`  ✓ 创建货币: ${currency.code} - ${currency.name.zh}`);
    created++;
  }

  console.log(`货币导入完成: 创建 ${created} 个, 跳过 ${skipped} 个\n`);

  return currencyMap;
}

/**
 * 导入国家货币映射数据
 */
async function seedCountryCurrencyMappings(
  dataSource: DataSource,
  currencyMap: Map<string, CurrencyEntity>,
): Promise<void> {
  const mappingRepository = dataSource.getRepository(CountryCurrencyMappingEntity);

  console.log(`\n开始导入 ${Object.keys(COUNTRY_CURRENCY_MAP).length} 个国家货币映射...`);

  let created = 0;
  let skipped = 0;

  // 构建国家名称映射（按国家代码分组）
  const countryNamesByCode: Record<string, { zh: string[]; en: string[] }> = {};
  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (!countryNamesByCode[code]) {
      countryNamesByCode[code] = { zh: [], en: [] };
    }

    // 判断是中文还是英文（简单判断：包含中文字符的是中文）
    const isChinese = /[\u4e00-\u9fa5]/.test(name);
    if (isChinese) {
      countryNamesByCode[code].zh.push(name);
    } else {
      countryNamesByCode[code].en.push(name);
    }
  }

  for (const [countryCode, currencyInfo] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    // 检查是否已存在
    const existing = await mappingRepository.findOne({
      where: { countryCode: countryCode.toUpperCase() },
    });

    if (existing) {
      console.log(`  跳过已存在的映射: ${countryCode} -> ${currencyInfo.code}`);
      skipped++;
      continue;
    }

    // 获取货币实体
    const currency = currencyMap.get(currencyInfo.code);
    if (!currency) {
      console.warn(`  警告: 找不到货币 ${currencyInfo.code}，跳过映射 ${countryCode}`);
      skipped++;
      continue;
    }

    // 获取国家名称
    const countryNames = countryNamesByCode[countryCode] || { zh: [], en: [] };

    // 创建新映射
    const newMapping = mappingRepository.create({
      countryCode: countryCode.toUpperCase(),
      currencyId: currency.id,
      currencyCode: currency.code,
      countryNames: countryNames.zh.length > 0 || countryNames.en.length > 0 ? countryNames : undefined,
      isActive: true,
    });

    await mappingRepository.save(newMapping);
    console.log(`  ✓ 创建映射: ${countryCode} -> ${currencyInfo.code} (${currencyInfo.name.zh})`);
    created++;
  }

  console.log(`国家货币映射导入完成: 创建 ${created} 个, 跳过 ${skipped} 个\n`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('开始导入货币和国家代码数据...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    // 导入货币数据
    const currencyMap = await seedCurrencies(dataSource);

    // 导入国家货币映射数据
    await seedCountryCurrencyMappings(dataSource, currencyMap);

    console.log('✅ 数据导入完成！');
    console.log('\n提示: 如果 CurrencyService 正在运行，请重启服务以刷新缓存。');
  } catch (error) {
    console.error('❌ 数据导入失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('未处理的错误:', error);
  process.exit(1);
});

