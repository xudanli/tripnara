import { Injectable, Logger, Optional, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeocodeService } from '../destination/services/geocode.service';
import {
  CurrencyEntity,
  CountryCurrencyMappingEntity,
} from '../persistence/entities/reference.entity';

/**
 * 货币信息接口
 */
export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: {
    zh: string;
    en: string;
  };
}

/**
 * 国家-货币映射表（完整版）
 */
const COUNTRY_CURRENCY_MAP: Record<string, CurrencyInfo> = {
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


@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);

  // 内存缓存
  private currencyCache: Map<string, CurrencyInfo> = new Map();
  private countryCurrencyMapCache: Map<string, CurrencyInfo> = new Map();
  private countryNameToCodeCache: Map<string, string> = new Map();
  private cacheLoaded = false;

  constructor(
    @Optional() @Inject(GeocodeService) private readonly geocodeService?: GeocodeService,
    @InjectRepository(CurrencyEntity)
    private readonly currencyRepository?: Repository<CurrencyEntity>,
    @InjectRepository(CountryCurrencyMappingEntity)
    private readonly mappingRepository?: Repository<CountryCurrencyMappingEntity>,
  ) {}

  /**
   * 模块初始化时加载缓存
   */
  async onModuleInit(): Promise<void> {
    await this.loadCache();
  }

  /**
   * 从数据库加载货币和国家映射数据到缓存
   */
  async loadCache(): Promise<void> {
    try {
      if (!this.currencyRepository || !this.mappingRepository) {
        this.logger.warn('货币数据库仓库未配置，使用硬编码数据');
        this.cacheLoaded = true;
        return;
      }

      // 加载货币数据
      const currencies = await this.currencyRepository.find({
        where: { isActive: true },
      });

      for (const currency of currencies) {
        this.currencyCache.set(currency.code.toUpperCase(), {
          code: currency.code,
          symbol: currency.symbol,
          name: {
            zh: currency.nameZh,
            en: currency.nameEn,
          },
        });
      }

      // 加载国家货币映射数据
      const mappings = await this.mappingRepository.find({
        where: { isActive: true },
        relations: [], // 注意：这里不加载 currency 关系，直接使用 currencyCode
      });

      for (const mapping of mappings) {
        const currency = this.currencyCache.get(mapping.currencyCode.toUpperCase());
        if (currency) {
          this.countryCurrencyMapCache.set(mapping.countryCode.toUpperCase(), currency);

          // 构建国家名称到代码的映射
          if (mapping.countryNames) {
            if (mapping.countryNames.zh) {
              for (const name of mapping.countryNames.zh) {
                this.countryNameToCodeCache.set(name, mapping.countryCode);
              }
            }
            if (mapping.countryNames.en) {
              for (const name of mapping.countryNames.en) {
                this.countryNameToCodeCache.set(name.toLowerCase(), mapping.countryCode);
              }
            }
          }
        }
      }

      this.cacheLoaded = true;
      this.logger.log(
        `货币缓存加载完成: ${currencies.length} 个货币, ${mappings.length} 个国家映射`,
      );
    } catch (error) {
      this.logger.error('加载货币缓存失败，使用硬编码数据', error);
      this.cacheLoaded = true; // 即使失败也标记为已加载，使用硬编码数据
    }
  }

  /**
   * 刷新缓存（用于数据更新后）
   */
  async refreshCache(): Promise<void> {
    this.currencyCache.clear();
    this.countryCurrencyMapCache.clear();
    this.countryNameToCodeCache.clear();
    await this.loadCache();
  }

  /**
   * 获取货币信息（优先从缓存，如果缓存为空则使用硬编码数据）
   */
  private getCurrencyInfo(code: string): CurrencyInfo | null {
    // 优先使用数据库缓存
    if (this.cacheLoaded && this.currencyCache.size > 0) {
      const currency = this.currencyCache.get(code.toUpperCase());
      if (currency) {
        return currency;
      }
    }

    // 回退到硬编码数据
    return COUNTRY_CURRENCY_MAP[code.toUpperCase()] || null;
  }

  /**
   * 获取国家代码对应的货币（优先从缓存，如果缓存为空则使用硬编码数据）
   */
  private getCurrencyByCountryCodeFromCache(countryCode: string): CurrencyInfo | null {
    // 优先使用数据库缓存
    if (this.cacheLoaded && this.countryCurrencyMapCache.size > 0) {
      const currency = this.countryCurrencyMapCache.get(countryCode.toUpperCase());
      if (currency) {
        return currency;
      }
    }

    // 回退到硬编码数据
    return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || null;
  }

  /**
   * 获取国家名称对应的国家代码（优先从缓存，如果缓存为空则使用硬编码数据）
   */
  private getCountryCodeByName(countryName: string): string | null {
    // 优先使用数据库缓存
    if (this.cacheLoaded && this.countryNameToCodeCache.size > 0) {
      // 直接匹配
      const code = this.countryNameToCodeCache.get(countryName);
      if (code) {
        return code;
      }

      // 不区分大小写匹配
      const normalized = countryName.trim().toLowerCase();
      for (const [name, code] of this.countryNameToCodeCache.entries()) {
        if (name.toLowerCase() === normalized) {
          return code;
        }
      }

      // 包含匹配
      for (const [name, code] of this.countryNameToCodeCache.entries()) {
        if (
          normalized.includes(name.toLowerCase()) ||
          name.toLowerCase().includes(normalized)
        ) {
          return code;
        }
      }
    }

    // 回退到硬编码数据
    return COUNTRY_NAME_TO_CODE[countryName] || null;
  }

  /**
   * 从地址中提取国家名称的辅助函数
   */
  private extractCountryFromAddress(address: string): string | null {
    if (!address) {
      return null;
    }

    // 优先使用缓存数据
    if (this.cacheLoaded && this.countryNameToCodeCache.size > 0) {
      const normalized = address.trim();
      for (const [name] of this.countryNameToCodeCache.entries()) {
        if (
          normalized.includes(name) ||
          normalized.toLowerCase().includes(name.toLowerCase())
        ) {
          return name;
        }
      }
    }

    // 回退到硬编码数据
    const normalized = address.trim();
    for (const [name] of Object.entries(COUNTRY_NAME_TO_CODE)) {
      if (
        normalized.includes(name) ||
        normalized.toLowerCase().includes(name.toLowerCase())
      ) {
        return name;
      }
    }

    return null;
  }

  /**
   * 根据国家代码获取货币信息
   */
  getCurrencyByCountryCode(
    countryCode: string,
    language: string = 'zh',
  ): {
    code: string;
    symbol: string;
    name: string;
  } | null {
    const currency = this.getCurrencyByCountryCodeFromCache(countryCode);
    if (!currency) {
      return null;
    }

    return {
      code: currency.code,
      symbol: currency.symbol,
      name: language === 'zh' ? currency.name.zh : currency.name.en,
    };
  }

  /**
   * 根据国家名称获取货币信息
   */
  getCurrencyByCountryName(
    countryName: string,
    language: string = 'zh',
  ): {
    code: string;
    symbol: string;
    name: string;
  } | null {
    // 1. 尝试从缓存或硬编码数据获取国家代码
    const countryCode = this.getCountryCodeByName(countryName);
    if (countryCode) {
      return this.getCurrencyByCountryCode(countryCode, language);
    }

    // 2. 如果缓存中没有，尝试硬编码数据的其他匹配方式
    if (!this.cacheLoaded || this.countryNameToCodeCache.size === 0) {
      // 尝试不区分大小写匹配
      const normalized = countryName.trim();
      for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
        if (name.toLowerCase() === normalized.toLowerCase()) {
          return this.getCurrencyByCountryCode(code, language);
        }
      }

      // 尝试包含匹配
      for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
        if (
          normalized.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(normalized.toLowerCase())
        ) {
          return this.getCurrencyByCountryCode(code, language);
        }
      }
    }

    return null;
  }

  /**
   * 根据坐标获取货币信息（使用地理编码API）
   */
  async getCurrencyByCoordinates(
    lat: number,
    lng: number,
    language: string = 'zh',
  ): Promise<{
    code: string;
    symbol: string;
    name: string;
  } | null> {
    try {
      // 如果没有地理编码服务，返回 null
      if (!this.geocodeService) {
        this.logger.debug(
          `根据坐标获取货币: lat=${lat}, lng=${lng} (地理编码服务未配置)`,
        );
        return null;
      }

      // 使用反向地理编码获取国家信息
      const geocodeResult = await this.geocodeService.reverseGeocode({
        lat,
        lng,
        language: language === 'zh' ? 'zh-CN' : 'en',
        limit: 1,
      });

      // 从地理编码结果中获取国家代码
      const countryCode = geocodeResult.data.countryCode;
      if (!countryCode) {
        this.logger.debug(
          `根据坐标获取货币: lat=${lat}, lng=${lng} (未找到国家代码)`,
        );
        return null;
      }

      // 根据国家代码获取货币
      const currency = this.getCurrencyByCountryCode(countryCode, language);
      if (currency) {
        this.logger.debug(
          `根据坐标获取货币: lat=${lat}, lng=${lng} -> 国家代码: ${countryCode} -> 货币: ${currency.code}`,
        );
        return currency;
      }

      this.logger.debug(
        `根据坐标获取货币: lat=${lat}, lng=${lng} -> 国家代码: ${countryCode} (未找到对应货币)`,
      );
      return null;
    } catch (error) {
      this.logger.warn(
        `根据坐标获取货币失败: lat=${lat}, lng=${lng}`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * 根据目的地信息推断货币
   * 优先级：国家代码 > 坐标 > 国家名称 > 地址 > 默认
   */
  async inferCurrency(
    destination: {
      countryCode?: string;
      countryName?: string;
      coordinates?: { lat: number; lng: number };
      address?: string;
      destination?: string; // 目的地字符串（用于兼容）
    },
    language: string = 'zh',
  ): Promise<{
    code: string;
    symbol: string;
    name: string;
  }> {
    // 优先级1：使用国家代码（最准确）
    if (destination.countryCode) {
      const currency = this.getCurrencyByCountryCode(
        destination.countryCode,
        language,
      );
      if (currency) {
        this.logger.debug(
          `根据国家代码推断货币: ${destination.countryCode} -> ${currency.code}`,
        );
        return currency;
      }
    }

    // 优先级2：使用坐标（准确）
    if (destination.coordinates) {
      const currency = await this.getCurrencyByCoordinates(
        destination.coordinates.lat,
        destination.coordinates.lng,
        language,
      );
      if (currency) {
        this.logger.debug(
          `根据坐标推断货币: (${destination.coordinates.lat}, ${destination.coordinates.lng}) -> ${currency.code}`,
        );
        return currency;
      }
    }

    // 优先级3：使用国家名称
    if (destination.countryName) {
      const currency = this.getCurrencyByCountryName(
        destination.countryName,
        language,
      );
      if (currency) {
        this.logger.debug(
          `根据国家名称推断货币: ${destination.countryName} -> ${currency.code}`,
        );
        return currency;
      }
    }

    // 优先级4：从地址中提取国家名称
    if (destination.address) {
      const countryName = this.extractCountryFromAddress(destination.address);
      if (countryName) {
        const currency = this.getCurrencyByCountryName(countryName, language);
        if (currency) {
          this.logger.debug(
            `从地址提取国家推断货币: ${countryName} -> ${currency.code}`,
          );
          return currency;
        }
      }
    }

    // 优先级5：从目的地字符串中提取国家信息
    if (destination.destination) {
      const countryName = this.extractCountryFromAddress(destination.destination);
      if (countryName) {
        const currency = this.getCurrencyByCountryName(countryName, language);
        if (currency) {
          this.logger.debug(
            `从目的地字符串推断货币: ${countryName} -> ${currency.code}`,
          );
          return currency;
        }
      }
    }

    // 默认返回人民币
    this.logger.debug('使用默认货币: CNY');
    return {
      code: 'CNY',
      symbol: '¥',
      name: language === 'zh' ? '人民币' : 'CNY',
    };
  }

  /**
   * 格式化金额
   */
  formatCurrency(
    amount: number,
    currency: { code: string; symbol: string },
  ): string {
    if (amount == null || isNaN(amount)) {
      return `${currency.symbol}0`;
    }

    // 对于日元、韩元、越南盾、印尼盾等小面额货币，不显示小数点
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'ISK'];
    if (noDecimalCurrencies.includes(currency.code)) {
      return `${currency.symbol}${Math.round(amount)}`;
    }

    // 其他货币保留两位小数
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
}

