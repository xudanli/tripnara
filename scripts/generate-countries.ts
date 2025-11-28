import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 国家代码数组（ISO 3166-1 alpha-2）
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
 * 国家代码到国家名称的映射（中文和英文）
 * 这里只包含部分常用国家，其他可以后续补充
 */
const COUNTRY_NAMES: Record<string, { zh: string; en: string }> = {
  CN: { zh: '中国', en: 'China' },
  US: { zh: '美国', en: 'United States' },
  GB: { zh: '英国', en: 'United Kingdom' },
  JP: { zh: '日本', en: 'Japan' },
  KR: { zh: '韩国', en: 'South Korea' },
  SG: { zh: '新加坡', en: 'Singapore' },
  MY: { zh: '马来西亚', en: 'Malaysia' },
  TH: { zh: '泰国', en: 'Thailand' },
  VN: { zh: '越南', en: 'Vietnam' },
  ID: { zh: '印度尼西亚', en: 'Indonesia' },
  PH: { zh: '菲律宾', en: 'Philippines' },
  IN: { zh: '印度', en: 'India' },
  HK: { zh: '香港', en: 'Hong Kong' },
  TW: { zh: '台湾', en: 'Taiwan' },
  MO: { zh: '澳门', en: 'Macau' },
  IS: { zh: '冰岛', en: 'Iceland' },
  CH: { zh: '瑞士', en: 'Switzerland' },
  FR: { zh: '法国', en: 'France' },
  DE: { zh: '德国', en: 'Germany' },
  IT: { zh: '意大利', en: 'Italy' },
  ES: { zh: '西班牙', en: 'Spain' },
  NL: { zh: '荷兰', en: 'Netherlands' },
  BE: { zh: '比利时', en: 'Belgium' },
  AT: { zh: '奥地利', en: 'Austria' },
  PT: { zh: '葡萄牙', en: 'Portugal' },
  GR: { zh: '希腊', en: 'Greece' },
  IE: { zh: '爱尔兰', en: 'Ireland' },
  FI: { zh: '芬兰', en: 'Finland' },
  DK: { zh: '丹麦', en: 'Denmark' },
  SE: { zh: '瑞典', en: 'Sweden' },
  NO: { zh: '挪威', en: 'Norway' },
  PL: { zh: '波兰', en: 'Poland' },
  CZ: { zh: '捷克', en: 'Czech Republic' },
  HU: { zh: '匈牙利', en: 'Hungary' },
  RU: { zh: '俄罗斯', en: 'Russia' },
  CA: { zh: '加拿大', en: 'Canada' },
  MX: { zh: '墨西哥', en: 'Mexico' },
  BR: { zh: '巴西', en: 'Brazil' },
  AR: { zh: '阿根廷', en: 'Argentina' },
  CL: { zh: '智利', en: 'Chile' },
  AU: { zh: '澳大利亚', en: 'Australia' },
  NZ: { zh: '新西兰', en: 'New Zealand' },
  AE: { zh: '阿联酋', en: 'United Arab Emirates' },
  SA: { zh: '沙特阿拉伯', en: 'Saudi Arabia' },
  IL: { zh: '以色列', en: 'Israel' },
  TR: { zh: '土耳其', en: 'Turkey' },
  ZA: { zh: '南非', en: 'South Africa' },
  EG: { zh: '埃及', en: 'Egypt' },
};

/**
 * 生成国家数据
 */
function generateCountries(): Array<{
  isoCode: string;
  name: string;
  visaSummary?: string;
}> {
  const countries: Array<{
    isoCode: string;
    name: string;
    visaSummary?: string;
  }> = [];

  for (const code of ALPHA2_CODES) {
    const countryInfo = COUNTRY_NAMES[code];
    const country: {
      isoCode: string;
      name: string;
      visaSummary?: string;
    } = {
      isoCode: code,
      name: countryInfo ? countryInfo.zh : code, // 如果没有中文名称，使用代码
    };

    // 可以后续添加签证摘要
    // country.visaSummary = '...';

    countries.push(country);
  }

  return countries;
}

/**
 * 主函数
 */
function main() {
  console.log('开始生成国家数据...\n');

  const countries = generateCountries();

  console.log(`✅ 成功生成 ${countries.length} 个国家\n`);

  // 统计缺失名称的国家
  const missingNames = countries.filter(
    (c) => !COUNTRY_NAMES[c.isoCode],
  );
  if (missingNames.length > 0) {
    console.log(`⚠️  以下 ${missingNames.length} 个国家/地区缺少中文名称:`);
    console.log(`   ${missingNames.map((c) => c.isoCode).join(', ')}\n`);
  }

  // 生成 JSON 文件
  const output = {
    countries: countries,
  };

  const outputPath = join(process.cwd(), 'data', 'countries.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`✅ 数据已保存到: ${outputPath}\n`);
  console.log('📝 可以使用批量导入接口导入数据:');
  console.log('   POST /api/v1/admin/countries/batch\n');
}

main();

