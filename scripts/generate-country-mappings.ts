import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 国家代码数组（用户提供）
 */
const ALPHA2_CODES = [
  'AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG',
  'AR', 'AM', 'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB',
  'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BQ', 'BA', 'BW',
  'BV', 'BR', 'IO', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA',
  'CV', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC', 'CO', 'KM',
  'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ',
  'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE',
  'SZ', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP',
  'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'VA', 'HN',
  'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL',
  'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR',
  'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT',
  'LU', 'MO', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ',
  'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS',
  'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI',
  'NE', 'NG', 'NU', 'NF', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS',
  'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA',
  'RE', 'RO', 'RU', 'RW', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM',
  'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG',
  'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'SS', 'ES', 'LK',
  'SD', 'SR', 'SJ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH',
  'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV',
  'UG', 'UA', 'AE', 'GB', 'US', 'UM', 'UY', 'UZ', 'VU', 'VE',
  'VN', 'VG', 'VI', 'WF', 'EH', 'YE', 'ZM', 'ZW',
];

/**
 * 国家代码到货币代码的映射（从现有数据扩展）
 * 基于 ISO 4217 标准
 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // 现有数据
  CN: 'CNY', JP: 'JPY', KR: 'KRW', SG: 'SGD', MY: 'MYR',
  TH: 'THB', VN: 'VND', ID: 'IDR', PH: 'PHP', IN: 'INR',
  HK: 'HKD', TW: 'TWD', MO: 'MOP', IS: 'ISK',
  CH: 'CHF', GB: 'GBP', FR: 'EUR', DE: 'EUR', IT: 'EUR',
  ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR',
  GR: 'EUR', IE: 'EUR', FI: 'EUR', DK: 'DKK', SE: 'SEK',
  NO: 'NOK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RU: 'RUB',
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS',
  CL: 'CLP', AU: 'AUD', NZ: 'NZD', AE: 'AED', SA: 'SAR',
  IL: 'ILS', TR: 'TRY', ZA: 'ZAR', EG: 'EGP',

  // 扩展数据（基于 ISO 4217）
  AF: 'AFN', // 阿富汗 - 阿富汗尼
  AL: 'ALL', // 阿尔巴尼亚 - 列克
  DZ: 'DZD', // 阿尔及利亚 - 第纳尔
  AD: 'EUR', // 安道尔 - 欧元
  AO: 'AOA', // 安哥拉 - 宽扎
  AG: 'XCD', // 安提瓜和巴布达 - 东加勒比元
  AM: 'AMD', // 亚美尼亚 - 德拉姆
  AW: 'AWG', // 阿鲁巴 - 弗罗林
  AZ: 'AZN', // 阿塞拜疆 - 马纳特
  BS: 'BSD', // 巴哈马 - 美元
  BH: 'BHD', // 巴林 - 第纳尔
  BD: 'BDT', // 孟加拉国 - 塔卡
  BB: 'BBD', // 巴巴多斯 - 元
  BY: 'BYN', // 白俄罗斯 - 卢布
  BZ: 'BZD', // 伯利兹 - 元
  BJ: 'XOF', // 贝宁 - 西非法郎
  BM: 'BMD', // 百慕大 - 美元
  BT: 'BTN', // 不丹 - 努尔特鲁姆
  BO: 'BOB', // 玻利维亚 - 玻利维亚诺
  BA: 'BAM', // 波黑 - 可兑换马克
  BW: 'BWP', // 博茨瓦纳 - 普拉
  BN: 'BND', // 文莱 - 元
  BG: 'BGN', // 保加利亚 - 列弗
  BF: 'XOF', // 布基纳法索 - 西非法郎
  BI: 'BIF', // 布隆迪 - 法郎
  KH: 'KHR', // 柬埔寨 - 瑞尔
  CM: 'XAF', // 喀麦隆 - 中非法郎
  CV: 'CVE', // 佛得角 - 埃斯库多
  KY: 'KYD', // 开曼群岛 - 元
  CF: 'XAF', // 中非共和国 - 中非法郎
  TD: 'XAF', // 乍得 - 中非法郎
  CO: 'COP', // 哥伦比亚 - 比索
  KM: 'KMF', // 科摩罗 - 法郎
  CG: 'XAF', // 刚果 - 中非法郎
  CD: 'CDF', // 刚果民主共和国 - 法郎
  CR: 'CRC', // 哥斯达黎加 - 科朗
  CI: 'XOF', // 科特迪瓦 - 西非法郎
  HR: 'HRK', // 克罗地亚 - 库纳
  CU: 'CUP', // 古巴 - 比索
  CW: 'ANG', // 库拉索 - 荷属安的列斯盾
  CY: 'EUR', // 塞浦路斯 - 欧元
  DJ: 'DJF', // 吉布提 - 法郎
  DM: 'XCD', // 多米尼克 - 东加勒比元
  DO: 'DOP', // 多米尼加 - 比索
  EC: 'USD', // 厄瓜多尔 - 美元
  SV: 'USD', // 萨尔瓦多 - 美元
  GQ: 'XAF', // 赤道几内亚 - 中非法郎
  ER: 'ERN', // 厄立特里亚 - 纳克法
  EE: 'EUR', // 爱沙尼亚 - 欧元
  SZ: 'SZL', // 斯威士兰 - 里兰吉尼
  ET: 'ETB', // 埃塞俄比亚 - 比尔
  FJ: 'FJD', // 斐济 - 元
  GA: 'XAF', // 加蓬 - 中非法郎
  GM: 'GMD', // 冈比亚 - 达拉西
  GE: 'GEL', // 格鲁吉亚 - 拉里
  GH: 'GHS', // 加纳 - 塞地
  GI: 'GIP', // 直布罗陀 - 英镑
  GL: 'DKK', // 格陵兰 - 丹麦克朗
  GD: 'XCD', // 格林纳达 - 东加勒比元
  GU: 'USD', // 关岛 - 美元
  GT: 'GTQ', // 危地马拉 - 格查尔
  GN: 'GNF', // 几内亚 - 法郎
  GW: 'XOF', // 几内亚比绍 - 西非法郎
  GY: 'GYD', // 圭亚那 - 元
  HT: 'HTG', // 海地 - 古德
  HN: 'HNL', // 洪都拉斯 - 伦皮拉
  IR: 'IRR', // 伊朗 - 里亚尔
  IQ: 'IQD', // 伊拉克 - 第纳尔
  IM: 'GBP', // 马恩岛 - 英镑
  JM: 'JMD', // 牙买加 - 元
  JE: 'GBP', // 泽西 - 英镑
  JO: 'JOD', // 约旦 - 第纳尔
  KZ: 'KZT', // 哈萨克斯坦 - 坚戈
  KE: 'KES', // 肯尼亚 - 先令
  KI: 'AUD', // 基里巴斯 - 澳元
  KP: 'KPW', // 朝鲜 - 元
  KW: 'KWD', // 科威特 - 第纳尔
  KG: 'KGS', // 吉尔吉斯斯坦 - 索姆
  LA: 'LAK', // 老挝 - 基普
  LV: 'EUR', // 拉脱维亚 - 欧元
  LB: 'LBP', // 黎巴嫩 - 镑
  LS: 'LSL', // 莱索托 - 洛蒂
  LR: 'LRD', // 利比里亚 - 元
  LY: 'LYD', // 利比亚 - 第纳尔
  LI: 'CHF', // 列支敦士登 - 瑞士法郎
  LT: 'EUR', // 立陶宛 - 欧元
  LU: 'EUR', // 卢森堡 - 欧元
  MG: 'MGA', // 马达加斯加 - 阿里亚里
  MW: 'MWK', // 马拉维 - 克瓦查
  MV: 'MVR', // 马尔代夫 - 拉菲亚
  ML: 'XOF', // 马里 - 西非法郎
  MT: 'EUR', // 马耳他 - 欧元
  MH: 'USD', // 马绍尔群岛 - 美元
  MQ: 'EUR', // 马提尼克 - 欧元
  MR: 'MRU', // 毛里塔尼亚 - 乌吉亚
  MU: 'MUR', // 毛里求斯 - 卢比
  YT: 'EUR', // 马约特 - 欧元
  FM: 'USD', // 密克罗尼西亚 - 美元
  MD: 'MDL', // 摩尔多瓦 - 列伊
  MC: 'EUR', // 摩纳哥 - 欧元
  MN: 'MNT', // 蒙古 - 图格里克
  ME: 'EUR', // 黑山 - 欧元
  MS: 'XCD', // 蒙特塞拉特 - 东加勒比元
  MA: 'MAD', // 摩洛哥 - 迪拉姆
  MZ: 'MZN', // 莫桑比克 - 梅蒂卡尔
  MM: 'MMK', // 缅甸 - 缅元
  NA: 'NAD', // 纳米比亚 - 元
  NR: 'AUD', // 瑙鲁 - 澳元
  NP: 'NPR', // 尼泊尔 - 卢比
  NC: 'XPF', // 新喀里多尼亚 - 太平洋法郎
  NE: 'XOF', // 尼日尔 - 西非法郎
  NG: 'NGN', // 尼日利亚 - 奈拉
  NU: 'NZD', // 纽埃 - 新西兰元
  NF: 'AUD', // 诺福克岛 - 澳元
  MP: 'USD', // 北马里亚纳群岛 - 美元
  OM: 'OMR', // 阿曼 - 里亚尔
  PK: 'PKR', // 巴基斯坦 - 卢比
  PW: 'USD', // 帕劳 - 美元
  PS: 'ILS', // 巴勒斯坦 - 新谢克尔
  PA: 'PAB', // 巴拿马 - 巴波亚
  PG: 'PGK', // 巴布亚新几内亚 - 基那
  PY: 'PYG', // 巴拉圭 - 瓜拉尼
  PE: 'PEN', // 秘鲁 - 索尔
  PN: 'NZD', // 皮特凯恩 - 新西兰元
  PR: 'USD', // 波多黎各 - 美元
  QA: 'QAR', // 卡塔尔 - 里亚尔
  RE: 'EUR', // 留尼汪 - 欧元
  RO: 'RON', // 罗马尼亚 - 列伊
  RW: 'RWF', // 卢旺达 - 法郎
  BL: 'EUR', // 圣巴泰勒米 - 欧元
  SH: 'SHP', // 圣赫勒拿 - 镑
  KN: 'XCD', // 圣基茨和尼维斯 - 东加勒比元
  LC: 'XCD', // 圣卢西亚 - 东加勒比元
  MF: 'EUR', // 法属圣马丁 - 欧元
  PM: 'EUR', // 圣皮埃尔和密克隆 - 欧元
  VC: 'XCD', // 圣文森特和格林纳丁斯 - 东加勒比元
  WS: 'WST', // 萨摩亚 - 塔拉
  SM: 'EUR', // 圣马力诺 - 欧元
  ST: 'STN', // 圣多美和普林西比 - 多布拉
  SN: 'XOF', // 塞内加尔 - 西非法郎
  RS: 'RSD', // 塞尔维亚 - 第纳尔
  SC: 'SCR', // 塞舌尔 - 卢比
  SL: 'SLL', // 塞拉利昂 - 利昂
  SX: 'ANG', // 荷属圣马丁 - 荷属安的列斯盾
  SK: 'EUR', // 斯洛伐克 - 欧元
  SI: 'EUR', // 斯洛文尼亚 - 欧元
  SB: 'SBD', // 所罗门群岛 - 元
  SO: 'SOS', // 索马里 - 先令
  GS: 'GBP', // 南乔治亚和南桑威奇群岛 - 英镑
  SS: 'SSP', // 南苏丹 - 镑
  LK: 'LKR', // 斯里兰卡 - 卢比
  SD: 'SDG', // 苏丹 - 镑
  SR: 'SRD', // 苏里南 - 元
  SJ: 'NOK', // 斯瓦尔巴和扬马延 - 挪威克朗
  SY: 'SYP', // 叙利亚 - 镑
  TJ: 'TJS', // 塔吉克斯坦 - 索莫尼
  TZ: 'TZS', // 坦桑尼亚 - 先令
  TL: 'USD', // 东帝汶 - 美元
  TG: 'XOF', // 多哥 - 西非法郎
  TK: 'NZD', // 托克劳 - 新西兰元
  TO: 'TOP', // 汤加 - 潘加
  TT: 'TTD', // 特立尼达和多巴哥 - 元
  TN: 'TND', // 突尼斯 - 第纳尔
  TM: 'TMT', // 土库曼斯坦 - 马纳特
  TC: 'USD', // 特克斯和凯科斯群岛 - 美元
  TV: 'AUD', // 图瓦卢 - 澳元
  UG: 'UGX', // 乌干达 - 先令
  UA: 'UAH', // 乌克兰 - 格里夫纳
  UM: 'USD', // 美国本土外小岛屿 - 美元
  UY: 'UYU', // 乌拉圭 - 比索
  UZ: 'UZS', // 乌兹别克斯坦 - 索姆
  VU: 'VUV', // 瓦努阿图 - 瓦图
  VE: 'VES', // 委内瑞拉 - 玻利瓦尔
  VG: 'USD', // 英属维尔京群岛 - 美元
  VI: 'USD', // 美属维尔京群岛 - 美元
  WF: 'XPF', // 瓦利斯和富图纳 - 太平洋法郎
  EH: 'MAD', // 西撒哈拉 - 摩洛哥迪拉姆
  YE: 'YER', // 也门 - 里亚尔
  ZM: 'ZMW', // 赞比亚 - 克瓦查
  ZW: 'ZWL', // 津巴布韦 - 元

  // 特殊地区和属地
  AX: 'EUR', // 奥兰群岛 - 欧元
  AS: 'USD', // 美属萨摩亚 - 美元
  AI: 'XCD', // 安圭拉 - 东加勒比元
  AQ: 'USD', // 南极洲 - 美元（无官方货币，使用美元）
  BQ: 'USD', // 荷属加勒比 - 美元
  BV: 'NOK', // 布韦岛 - 挪威克朗
  IO: 'USD', // 英属印度洋领地 - 美元
  CX: 'AUD', // 圣诞岛 - 澳元
  CC: 'AUD', // 科科斯（基林）群岛 - 澳元
  CK: 'NZD', // 库克群岛 - 新西兰元
  FK: 'FKP', // 福克兰群岛 - 镑
  FO: 'DKK', // 法罗群岛 - 丹麦克朗
  GF: 'EUR', // 法属圭亚那 - 欧元
  PF: 'XPF', // 法属波利尼西亚 - 太平洋法郎
  TF: 'EUR', // 法属南部领地 - 欧元
  GP: 'EUR', // 瓜德罗普 - 欧元
  GG: 'GBP', // 根西 - 英镑
  HM: 'AUD', // 赫德岛和麦克唐纳群岛 - 澳元
  VA: 'EUR', // 梵蒂冈 - 欧元
  NI: 'NIO', // 尼加拉瓜 - 科多巴
};

/**
 * 国家代码到国家名称的映射（中文和英文）
 * 这里只包含部分常用国家，其他可以后续补充
 */
const COUNTRY_NAMES: Record<string, { zh: string[]; en: string[] }> = {
  CN: { zh: ['中国', '中华人民共和国'], en: ['China', 'PRC', "People's Republic of China"] },
  US: { zh: ['美国', '美利坚合众国'], en: ['United States', 'USA', 'United States of America'] },
  GB: { zh: ['英国', '大不列颠及北爱尔兰联合王国'], en: ['United Kingdom', 'UK', 'Great Britain'] },
  JP: { zh: ['日本'], en: ['Japan'] },
  KR: { zh: ['韩国', '大韩民国'], en: ['South Korea', 'Korea', 'Republic of Korea'] },
  // 可以继续添加更多国家名称...
};

/**
 * 生成国家货币映射数据
 */
function generateCountryMappings(): Array<{
  countryCode: string;
  currencyCode: string;
  countryNames?: {
    zh?: string[];
    en?: string[];
  };
}> {
  const mappings: Array<{
    countryCode: string;
    currencyCode: string;
    countryNames?: {
      zh?: string[];
      en?: string[];
    };
  }> = [];

  for (const code of ALPHA2_CODES) {
    const currencyCode = COUNTRY_TO_CURRENCY[code];
    if (!currencyCode) {
      console.warn(`⚠️  未找到国家代码 ${code} 对应的货币，将跳过`);
      continue;
    }

    const mapping: {
      countryCode: string;
      currencyCode: string;
      countryNames?: {
        zh?: string[];
        en?: string[];
      };
    } = {
      countryCode: code,
      currencyCode: currencyCode,
    };

    // 如果有国家名称数据，则添加
    if (COUNTRY_NAMES[code]) {
      mapping.countryNames = COUNTRY_NAMES[code];
    }

    mappings.push(mapping);
  }

  return mappings;
}

/**
 * 主函数
 */
function main() {
  console.log('开始生成国家货币映射数据...\n');

  const mappings = generateCountryMappings();

  console.log(`✅ 成功生成 ${mappings.length} 个国家货币映射\n`);

  // 统计缺失货币的国家
  const missingCurrency = ALPHA2_CODES.filter(
    (code) => !COUNTRY_TO_CURRENCY[code],
  );
  if (missingCurrency.length > 0) {
    console.log(`⚠️  以下 ${missingCurrency.length} 个国家/地区未找到货币代码:`);
    console.log(`   ${missingCurrency.join(', ')}\n`);
  }

  // 生成 JSON 文件
  const output = {
    mappings: mappings,
  };

  const outputPath = join(process.cwd(), 'data', 'country-currency-mappings.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`✅ 数据已保存到: ${outputPath}\n`);
  console.log('📝 注意: 部分国家可能缺少中文和英文名称，需要手动补充。');
  console.log('📝 可以使用批量导入接口导入数据:');
  console.log('   POST /api/v1/admin/currency/country-mappings/batch-by-code\n');
}

main();

