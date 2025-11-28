import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 从国家货币映射中提取所有唯一的货币代码
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

  // 扩展数据
  AF: 'AFN', AL: 'ALL', DZ: 'DZD', AD: 'EUR', AO: 'AOA',
  AG: 'XCD', AM: 'AMD', AW: 'AWG', AZ: 'AZN', BS: 'BSD',
  BH: 'BHD', BD: 'BDT', BB: 'BBD', BY: 'BYN', BZ: 'BZD',
  BJ: 'XOF', BM: 'BMD', BT: 'BTN', BO: 'BOB', BA: 'BAM',
  BW: 'BWP', BN: 'BND', BG: 'BGN', BF: 'XOF', BI: 'BIF',
  KH: 'KHR', CM: 'XAF', CV: 'CVE', KY: 'KYD', CF: 'XAF',
  TD: 'XAF', CO: 'COP', KM: 'KMF', CG: 'XAF', CD: 'CDF',
  CR: 'CRC', CI: 'XOF', HR: 'HRK', CU: 'CUP', CW: 'ANG',
  CY: 'EUR', DJ: 'DJF', DM: 'XCD', DO: 'DOP', EC: 'USD',
  SV: 'USD', GQ: 'XAF', ER: 'ERN', EE: 'EUR', SZ: 'SZL',
  ET: 'ETB', FJ: 'FJD', GA: 'XAF', GM: 'GMD', GE: 'GEL',
  GH: 'GHS', GI: 'GIP', GL: 'DKK', GD: 'XCD', GU: 'USD',
  GT: 'GTQ', GN: 'GNF', GW: 'XOF', GY: 'GYD', HT: 'HTG',
  HN: 'HNL', IR: 'IRR', IQ: 'IQD', IM: 'GBP', JM: 'JMD',
  JE: 'GBP', JO: 'JOD', KZ: 'KZT', KE: 'KES', KI: 'AUD',
  KP: 'KPW', KW: 'KWD', KG: 'KGS', LA: 'LAK', LV: 'EUR',
  LB: 'LBP', LS: 'LSL', LR: 'LRD', LY: 'LYD', LI: 'CHF',
  LT: 'EUR', LU: 'EUR', MG: 'MGA', MW: 'MWK', MV: 'MVR',
  ML: 'XOF', MT: 'EUR', MH: 'USD', MQ: 'EUR', MR: 'MRU',
  MU: 'MUR', YT: 'EUR', FM: 'USD', MD: 'MDL', MC: 'EUR',
  MN: 'MNT', ME: 'EUR', MS: 'XCD', MA: 'MAD', MZ: 'MZN',
  MM: 'MMK', NA: 'NAD', NR: 'AUD', NP: 'NPR', NC: 'XPF',
  NE: 'XOF', NG: 'NGN', NU: 'NZD', NF: 'AUD', MP: 'USD',
  OM: 'OMR', PK: 'PKR', PW: 'USD', PS: 'ILS', PA: 'PAB',
  PG: 'PGK', PY: 'PYG', PE: 'PEN', PN: 'NZD', PR: 'USD',
  QA: 'QAR', RE: 'EUR', RO: 'RON', RW: 'RWF', BL: 'EUR',
  SH: 'SHP', KN: 'XCD', LC: 'XCD', MF: 'EUR', PM: 'EUR',
  VC: 'XCD', WS: 'WST', SM: 'EUR', ST: 'STN', SN: 'XOF',
  RS: 'RSD', SC: 'SCR', SL: 'SLL', SX: 'ANG', SK: 'EUR',
  SI: 'EUR', SB: 'SBD', SO: 'SOS', SS: 'SSP', LK: 'LKR',
  SD: 'SDG', SR: 'SRD', SJ: 'NOK', SY: 'SYP', TJ: 'TJS',
  TZ: 'TZS', TL: 'USD', TG: 'XOF', TK: 'NZD', TO: 'TOP',
  TT: 'TTD', TN: 'TND', TM: 'TMT', TC: 'USD', TV: 'AUD',
  UG: 'UGX', UA: 'UAH', UM: 'USD', UY: 'UYU', UZ: 'UZS',
  VU: 'VUV', VE: 'VES', VG: 'USD', VI: 'USD', WF: 'XPF',
  EH: 'MAD', YE: 'YER', ZM: 'ZMW', ZW: 'ZWL',
  AX: 'EUR', AS: 'USD', AI: 'XCD', AQ: 'USD', BQ: 'USD',
  BV: 'NOK', IO: 'USD', CX: 'AUD', CC: 'AUD', CK: 'NZD',
  FK: 'FKP', FO: 'DKK', GF: 'EUR', PF: 'XPF', TF: 'EUR',
  GP: 'EUR', GG: 'GBP', HM: 'AUD', VA: 'EUR', NI: 'NIO',
};

/**
 * 货币代码到货币信息的映射
 * 基于 ISO 4217 标准
 */
const CURRENCY_INFO: Record<string, { symbol: string; nameZh: string; nameEn: string }> = {
  // 现有货币
  CNY: { symbol: '¥', nameZh: '人民币', nameEn: 'CNY' },
  JPY: { symbol: '¥', nameZh: '日元', nameEn: 'JPY' },
  KRW: { symbol: '₩', nameZh: '韩元', nameEn: 'KRW' },
  SGD: { symbol: 'S$', nameZh: '新加坡元', nameEn: 'SGD' },
  MYR: { symbol: 'RM', nameZh: '马来西亚林吉特', nameEn: 'MYR' },
  THB: { symbol: '฿', nameZh: '泰铢', nameEn: 'THB' },
  VND: { symbol: '₫', nameZh: '越南盾', nameEn: 'VND' },
  IDR: { symbol: 'Rp', nameZh: '印尼盾', nameEn: 'IDR' },
  PHP: { symbol: '₱', nameZh: '菲律宾比索', nameEn: 'PHP' },
  INR: { symbol: '₹', nameZh: '印度卢比', nameEn: 'INR' },
  HKD: { symbol: 'HK$', nameZh: '港币', nameEn: 'HKD' },
  TWD: { symbol: 'NT$', nameZh: '新台币', nameEn: 'TWD' },
  MOP: { symbol: 'MOP$', nameZh: '澳门元', nameEn: 'MOP' },
  ISK: { symbol: 'kr', nameZh: '冰岛克朗', nameEn: 'ISK' },
  CHF: { symbol: 'CHF', nameZh: '瑞士法郎', nameEn: 'CHF' },
  GBP: { symbol: '£', nameZh: '英镑', nameEn: 'GBP' },
  EUR: { symbol: '€', nameZh: '欧元', nameEn: 'EUR' },
  DKK: { symbol: 'kr', nameZh: '丹麦克朗', nameEn: 'DKK' },
  SEK: { symbol: 'kr', nameZh: '瑞典克朗', nameEn: 'SEK' },
  NOK: { symbol: 'kr', nameZh: '挪威克朗', nameEn: 'NOK' },
  PLN: { symbol: 'zł', nameZh: '波兰兹罗提', nameEn: 'PLN' },
  CZK: { symbol: 'Kč', nameZh: '捷克克朗', nameEn: 'CZK' },
  HUF: { symbol: 'Ft', nameZh: '匈牙利福林', nameEn: 'HUF' },
  RUB: { symbol: '₽', nameZh: '俄罗斯卢布', nameEn: 'RUB' },
  USD: { symbol: '$', nameZh: '美元', nameEn: 'USD' },
  CAD: { symbol: 'C$', nameZh: '加元', nameEn: 'CAD' },
  MXN: { symbol: '$', nameZh: '墨西哥比索', nameEn: 'MXN' },
  BRL: { symbol: 'R$', nameZh: '巴西雷亚尔', nameEn: 'BRL' },
  ARS: { symbol: '$', nameZh: '阿根廷比索', nameEn: 'ARS' },
  CLP: { symbol: '$', nameZh: '智利比索', nameEn: 'CLP' },
  AUD: { symbol: 'A$', nameZh: '澳元', nameEn: 'AUD' },
  NZD: { symbol: 'NZ$', nameZh: '新西兰元', nameEn: 'NZD' },
  AED: { symbol: 'د.إ', nameZh: '阿联酋迪拉姆', nameEn: 'AED' },
  SAR: { symbol: '﷼', nameZh: '沙特里亚尔', nameEn: 'SAR' },
  ILS: { symbol: '₪', nameZh: '以色列新谢克尔', nameEn: 'ILS' },
  TRY: { symbol: '₺', nameZh: '土耳其里拉', nameEn: 'TRY' },
  ZAR: { symbol: 'R', nameZh: '南非兰特', nameEn: 'ZAR' },
  EGP: { symbol: 'E£', nameZh: '埃及镑', nameEn: 'EGP' },

  // 扩展货币（使用 ISO 4217 标准名称）
  AFN: { symbol: '؋', nameZh: '阿富汗尼', nameEn: 'Afghan Afghani' },
  ALL: { symbol: 'L', nameZh: '阿尔巴尼亚列克', nameEn: 'Albanian Lek' },
  DZD: { symbol: 'د.ج', nameZh: '阿尔及利亚第纳尔', nameEn: 'Algerian Dinar' },
  AOA: { symbol: 'Kz', nameZh: '安哥拉宽扎', nameEn: 'Angolan Kwanza' },
  XCD: { symbol: '$', nameZh: '东加勒比元', nameEn: 'East Caribbean Dollar' },
  AMD: { symbol: '֏', nameZh: '亚美尼亚德拉姆', nameEn: 'Armenian Dram' },
  AWG: { symbol: 'ƒ', nameZh: '阿鲁巴弗罗林', nameEn: 'Aruban Florin' },
  AZN: { symbol: '₼', nameZh: '阿塞拜疆马纳特', nameEn: 'Azerbaijani Manat' },
  BSD: { symbol: '$', nameZh: '巴哈马元', nameEn: 'Bahamian Dollar' },
  BHD: { symbol: '.د.ب', nameZh: '巴林第纳尔', nameEn: 'Bahraini Dinar' },
  BDT: { symbol: '৳', nameZh: '孟加拉塔卡', nameEn: 'Bangladeshi Taka' },
  BBD: { symbol: '$', nameZh: '巴巴多斯元', nameEn: 'Barbadian Dollar' },
  BYN: { symbol: 'Br', nameZh: '白俄罗斯卢布', nameEn: 'Belarusian Ruble' },
  BZD: { symbol: '$', nameZh: '伯利兹元', nameEn: 'Belize Dollar' },
  XOF: { symbol: 'CFA', nameZh: '西非法郎', nameEn: 'West African CFA Franc' },
  BMD: { symbol: '$', nameZh: '百慕大元', nameEn: 'Bermudian Dollar' },
  BTN: { symbol: 'Nu.', nameZh: '不丹努尔特鲁姆', nameEn: 'Bhutanese Ngultrum' },
  BOB: { symbol: 'Bs.', nameZh: '玻利维亚诺', nameEn: 'Bolivian Boliviano' },
  BAM: { symbol: 'КМ', nameZh: '波黑可兑换马克', nameEn: 'Bosnia-Herzegovina Convertible Mark' },
  BWP: { symbol: 'P', nameZh: '博茨瓦纳普拉', nameEn: 'Botswanan Pula' },
  BND: { symbol: '$', nameZh: '文莱元', nameEn: 'Brunei Dollar' },
  BGN: { symbol: 'лв', nameZh: '保加利亚列弗', nameEn: 'Bulgarian Lev' },
  BIF: { symbol: 'Fr', nameZh: '布隆迪法郎', nameEn: 'Burundian Franc' },
  KHR: { symbol: '៛', nameZh: '柬埔寨瑞尔', nameEn: 'Cambodian Riel' },
  XAF: { symbol: 'FCFA', nameZh: '中非法郎', nameEn: 'Central African CFA Franc' },
  CVE: { symbol: 'Esc', nameZh: '佛得角埃斯库多', nameEn: 'Cape Verdean Escudo' },
  KYD: { symbol: '$', nameZh: '开曼群岛元', nameEn: 'Cayman Islands Dollar' },
  COP: { symbol: '$', nameZh: '哥伦比亚比索', nameEn: 'Colombian Peso' },
  KMF: { symbol: 'Fr', nameZh: '科摩罗法郎', nameEn: 'Comorian Franc' },
  CDF: { symbol: 'Fr', nameZh: '刚果法郎', nameEn: 'Congolese Franc' },
  CRC: { symbol: '₡', nameZh: '哥斯达黎加科朗', nameEn: 'Costa Rican Colón' },
  HRK: { symbol: 'kn', nameZh: '克罗地亚库纳', nameEn: 'Croatian Kuna' },
  CUP: { symbol: '$', nameZh: '古巴比索', nameEn: 'Cuban Peso' },
  ANG: { symbol: 'ƒ', nameZh: '荷属安的列斯盾', nameEn: 'Netherlands Antillean Guilder' },
  DJF: { symbol: 'Fr', nameZh: '吉布提法郎', nameEn: 'Djiboutian Franc' },
  DOP: { symbol: '$', nameZh: '多米尼加比索', nameEn: 'Dominican Peso' },
  ERN: { symbol: 'Nfk', nameZh: '厄立特里亚纳克法', nameEn: 'Eritrean Nakfa' },
  SZL: { symbol: 'L', nameZh: '斯威士兰里兰吉尼', nameEn: 'Swazi Lilangeni' },
  ETB: { symbol: 'Br', nameZh: '埃塞俄比亚比尔', nameEn: 'Ethiopian Birr' },
  FJD: { symbol: '$', nameZh: '斐济元', nameEn: 'Fijian Dollar' },
  GMD: { symbol: 'D', nameZh: '冈比亚达拉西', nameEn: 'Gambian Dalasi' },
  GEL: { symbol: '₾', nameZh: '格鲁吉亚拉里', nameEn: 'Georgian Lari' },
  GHS: { symbol: '₵', nameZh: '加纳塞地', nameEn: 'Ghanaian Cedi' },
  GIP: { symbol: '£', nameZh: '直布罗陀英镑', nameEn: 'Gibraltar Pound' },
  GTQ: { symbol: 'Q', nameZh: '危地马拉格查尔', nameEn: 'Guatemalan Quetzal' },
  GNF: { symbol: 'Fr', nameZh: '几内亚法郎', nameEn: 'Guinean Franc' },
  GYD: { symbol: '$', nameZh: '圭亚那元', nameEn: 'Guyanaese Dollar' },
  HTG: { symbol: 'G', nameZh: '海地古德', nameEn: 'Haitian Gourde' },
  HNL: { symbol: 'L', nameZh: '洪都拉斯伦皮拉', nameEn: 'Honduran Lempira' },
  IRR: { symbol: '﷼', nameZh: '伊朗里亚尔', nameEn: 'Iranian Rial' },
  IQD: { symbol: 'ع.د', nameZh: '伊拉克第纳尔', nameEn: 'Iraqi Dinar' },
  JMD: { symbol: '$', nameZh: '牙买加元', nameEn: 'Jamaican Dollar' },
  JOD: { symbol: 'د.ا', nameZh: '约旦第纳尔', nameEn: 'Jordanian Dinar' },
  KZT: { symbol: '₸', nameZh: '哈萨克斯坦坚戈', nameEn: 'Kazakhstani Tenge' },
  KES: { symbol: 'Sh', nameZh: '肯尼亚先令', nameEn: 'Kenyan Shilling' },
  KPW: { symbol: '₩', nameZh: '朝鲜元', nameEn: 'North Korean Won' },
  KWD: { symbol: 'د.ك', nameZh: '科威特第纳尔', nameEn: 'Kuwaiti Dinar' },
  KGS: { symbol: 'с', nameZh: '吉尔吉斯斯坦索姆', nameEn: 'Kyrgystani Som' },
  LAK: { symbol: '₭', nameZh: '老挝基普', nameEn: 'Laotian Kip' },
  LBP: { symbol: '£', nameZh: '黎巴嫩镑', nameEn: 'Lebanese Pound' },
  LSL: { symbol: 'L', nameZh: '莱索托洛蒂', nameEn: 'Lesotho Loti' },
  LRD: { symbol: '$', nameZh: '利比里亚元', nameEn: 'Liberian Dollar' },
  LYD: { symbol: 'ل.د', nameZh: '利比亚第纳尔', nameEn: 'Libyan Dinar' },
  MGA: { symbol: 'Ar', nameZh: '马达加斯加阿里亚里', nameEn: 'Malagasy Ariary' },
  MWK: { symbol: 'MK', nameZh: '马拉维克瓦查', nameEn: 'Malawian Kwacha' },
  MVR: { symbol: 'Rf', nameZh: '马尔代夫拉菲亚', nameEn: 'Maldivian Rufiyaa' },
  MRU: { symbol: 'UM', nameZh: '毛里塔尼亚乌吉亚', nameEn: 'Mauritanian Ouguiya' },
  MUR: { symbol: '₨', nameZh: '毛里求斯卢比', nameEn: 'Mauritian Rupee' },
  MDL: { symbol: 'L', nameZh: '摩尔多瓦列伊', nameEn: 'Moldovan Leu' },
  MNT: { symbol: '₮', nameZh: '蒙古图格里克', nameEn: 'Mongolian Tugrik' },
  MAD: { symbol: 'د.م.', nameZh: '摩洛哥迪拉姆', nameEn: 'Moroccan Dirham' },
  MZN: { symbol: 'MT', nameZh: '莫桑比克梅蒂卡尔', nameEn: 'Mozambican Metical' },
  MMK: { symbol: 'K', nameZh: '缅甸缅元', nameEn: 'Myanma Kyat' },
  NAD: { symbol: '$', nameZh: '纳米比亚元', nameEn: 'Namibian Dollar' },
  NPR: { symbol: '₨', nameZh: '尼泊尔卢比', nameEn: 'Nepalese Rupee' },
  XPF: { symbol: 'Fr', nameZh: '太平洋法郎', nameEn: 'CFP Franc' },
  NIO: { symbol: 'C$', nameZh: '尼加拉瓜科多巴', nameEn: 'Nicaraguan Córdoba' },
  NGN: { symbol: '₦', nameZh: '尼日利亚奈拉', nameEn: 'Nigerian Naira' },
  OMR: { symbol: 'ر.ع.', nameZh: '阿曼里亚尔', nameEn: 'Omani Rial' },
  PKR: { symbol: '₨', nameZh: '巴基斯坦卢比', nameEn: 'Pakistani Rupee' },
  PAB: { symbol: 'B/.', nameZh: '巴拿马巴波亚', nameEn: 'Panamanian Balboa' },
  PGK: { symbol: 'K', nameZh: '巴布亚新几内亚基那', nameEn: 'Papua New Guinean Kina' },
  PYG: { symbol: '₲', nameZh: '巴拉圭瓜拉尼', nameEn: 'Paraguayan Guarani' },
  PEN: { symbol: 'S/.', nameZh: '秘鲁索尔', nameEn: 'Peruvian Nuevo Sol' },
  QAR: { symbol: 'ر.ق', nameZh: '卡塔尔里亚尔', nameEn: 'Qatari Rial' },
  RON: { symbol: 'lei', nameZh: '罗马尼亚列伊', nameEn: 'Romanian Leu' },
  RWF: { symbol: 'Fr', nameZh: '卢旺达法郎', nameEn: 'Rwandan Franc' },
  SHP: { symbol: '£', nameZh: '圣赫勒拿镑', nameEn: 'Saint Helena Pound' },
  WST: { symbol: 'T', nameZh: '萨摩亚塔拉', nameEn: 'Samoan Tala' },
  STN: { symbol: 'Db', nameZh: '圣多美和普林西比多布拉', nameEn: 'São Tomé and Príncipe Dobra' },
  RSD: { symbol: 'дин', nameZh: '塞尔维亚第纳尔', nameEn: 'Serbian Dinar' },
  SCR: { symbol: '₨', nameZh: '塞舌尔卢比', nameEn: 'Seychellois Rupee' },
  SLL: { symbol: 'Le', nameZh: '塞拉利昂利昂', nameEn: 'Sierra Leonean Leone' },
  SBD: { symbol: '$', nameZh: '所罗门群岛元', nameEn: 'Solomon Islands Dollar' },
  SOS: { symbol: 'Sh', nameZh: '索马里先令', nameEn: 'Somali Shilling' },
  SSP: { symbol: '£', nameZh: '南苏丹镑', nameEn: 'South Sudanese Pound' },
  LKR: { symbol: '₨', nameZh: '斯里兰卡卢比', nameEn: 'Sri Lankan Rupee' },
  SDG: { symbol: 'ج.س.', nameZh: '苏丹镑', nameEn: 'Sudanese Pound' },
  SRD: { symbol: '$', nameZh: '苏里南元', nameEn: 'Surinamese Dollar' },
  SYP: { symbol: '£', nameZh: '叙利亚镑', nameEn: 'Syrian Pound' },
  TJS: { symbol: 'ЅМ', nameZh: '塔吉克斯坦索莫尼', nameEn: 'Tajikistani Somoni' },
  TZS: { symbol: 'Sh', nameZh: '坦桑尼亚先令', nameEn: 'Tanzanian Shilling' },
  TOP: { symbol: 'T$', nameZh: '汤加潘加', nameEn: 'Tongan Paʻanga' },
  TTD: { symbol: '$', nameZh: '特立尼达和多巴哥元', nameEn: 'Trinidad and Tobago Dollar' },
  TND: { symbol: 'د.ت', nameZh: '突尼斯第纳尔', nameEn: 'Tunisian Dinar' },
  TMT: { symbol: 'm', nameZh: '土库曼斯坦马纳特', nameEn: 'Turkmenistani Manat' },
  UGX: { symbol: 'Sh', nameZh: '乌干达先令', nameEn: 'Ugandan Shilling' },
  UAH: { symbol: '₴', nameZh: '乌克兰格里夫纳', nameEn: 'Ukrainian Hryvnia' },
  UYU: { symbol: '$', nameZh: '乌拉圭比索', nameEn: 'Uruguayan Peso' },
  UZS: { symbol: 'лв', nameZh: '乌兹别克斯坦索姆', nameEn: 'Uzbekistan Som' },
  VUV: { symbol: 'Vt', nameZh: '瓦努阿图瓦图', nameEn: 'Vanuatu Vatu' },
  VES: { symbol: 'Bs.S', nameZh: '委内瑞拉玻利瓦尔', nameEn: 'Venezuelan Bolívar' },
  YER: { symbol: '﷼', nameZh: '也门里亚尔', nameEn: 'Yemeni Rial' },
  ZMW: { symbol: 'ZK', nameZh: '赞比亚克瓦查', nameEn: 'Zambian Kwacha' },
  ZWL: { symbol: '$', nameZh: '津巴布韦元', nameEn: 'Zimbabwean Dollar' },
  FKP: { symbol: '£', nameZh: '福克兰群岛镑', nameEn: 'Falkland Islands Pound' },
};

/**
 * 生成所有货币数据
 */
function generateAllCurrencies(): Array<{
  code: string;
  symbol: string;
  nameZh: string;
  nameEn: string;
}> {
  // 收集所有唯一的货币代码
  const uniqueCurrencies = new Set(Object.values(COUNTRY_TO_CURRENCY));
  const currencies: Array<{
    code: string;
    symbol: string;
    nameZh: string;
    nameEn: string;
  }> = [];

  for (const code of uniqueCurrencies) {
    const info = CURRENCY_INFO[code];
    if (!info) {
      console.warn(`⚠️  未找到货币 ${code} 的信息，将使用默认值`);
      currencies.push({
        code,
        symbol: code,
        nameZh: code,
        nameEn: code,
      });
      continue;
    }

    currencies.push({
      code,
      symbol: info.symbol,
      nameZh: info.nameZh,
      nameEn: info.nameEn,
    });
  }

  return currencies.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * 主函数
 */
function main() {
  console.log('开始生成所有货币数据...\n');

  const currencies = generateAllCurrencies();

  console.log(`✅ 成功生成 ${currencies.length} 个货币\n`);

  // 生成 JSON 文件
  const output = {
    currencies: currencies,
  };

  const outputPath = join(process.cwd(), 'data', 'all-currencies.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`✅ 数据已保存到: ${outputPath}\n`);
  console.log('📝 可以使用批量导入接口导入货币数据\n');
}

main();

