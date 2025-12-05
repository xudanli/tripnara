/**
 * 高海拔地区静态数据
 * 
 * 这是一个静态数据数组，作为"基础数据库"使用。
 * 优势：0 延迟，0 成本，永不宕机。
 */

export interface HighAltitudeRegion {
  id: string;
  name: string;
  aliases?: string[]; // 别名，用于模糊搜索
  country: string;
  region?: string; // 地区/省份（可选）
  altitudeRange: string; // 海拔范围，如 "3650m" 或 "2400-2800m"
  category: 'low' | 'medium' | 'high' | 'extreme'; // 海拔分类
  approxElevation?: number; // 近似海拔（米），用于排序和筛选
  notes?: string; // 特殊说明，如"开车直达"等
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // 多语言名称字段
  chineseName?: string; // 中文名称
  englishName?: string; // 英文名称
  destinationLanguageName?: string; // 目的地语言名称（当地语言）
  locationName?: string; // 位置名称（完整地址或位置描述）
}

/**
 * 高海拔地区数据数组
 * 
 */
export const HIGH_ALTITUDE_REGIONS: HighAltitudeRegion[] = [
// 1. 中国 - 西藏自治区 (Tibet, China)
  // ==========================================
  {
    id: 'cn-xizang',
    name: '西藏自治区',
    aliases: ['西藏', 'Tibet'],
    country: '中国',
    altitudeRange: '平均 4000m+',
    category: 'extreme',
    notes: '世界屋脊，以拉萨为中心参考。',
    coordinates: { latitude: 29.652, longitude: 91.117 }
  },
  {
    id: 'cn-lasa',
    name: '拉萨',
    aliases: ['Lhasa'],
    country: '中国',
    region: '西藏',
    altitudeRange: '约 3650m',
    category: 'extreme',
    approxElevation: 3650,
    notes: '进藏首站，需注意第一晚睡眠。',
    coordinates: { latitude: 29.650, longitude: 91.130 }
  },
  {
    id: 'cn-ali',
    name: '阿里地区',
    aliases: ['Ngari', 'Shiquanhe'],
    country: '中国',
    region: '西藏',
    altitudeRange: '4500m 以上',
    category: 'extreme',
    notes: '世界屋脊的屋脊，环境严酷。',
    coordinates: { latitude: 32.501, longitude: 80.105 }
  },
  {
    id: 'cn-everest-base-camp',
    name: '珠穆朗玛峰大本营（北坡）',
    aliases: ['EBC', '珠峰大本营'],
    country: '中国',
    region: '西藏',
    altitudeRange: '约 5200m',
    category: 'extreme',
    approxElevation: 5200,
    notes: '定日县境内，普通游客可达的最高点之一。',
    coordinates: { latitude: 28.141, longitude: 86.851 }
  },
  {
    id: 'cn-namco',
    name: '纳木错',
    aliases: ['Nam Co'],
    country: '中国',
    region: '西藏',
    altitudeRange: '约 4718m',
    category: 'extreme',
    notes: '海拔极高，风大温低。',
    coordinates: { latitude: 30.778, longitude: 90.963 }
  },
  {
    id: 'cn-yamdrok',
    name: '羊卓雍措',
    aliases: ['Yamdrok Yumtso'],
    country: '中国',
    region: '西藏',
    altitudeRange: '约 4441m',
    category: 'extreme',
    notes: '岗巴拉山口观景台。',
    coordinates: { latitude: 28.937, longitude: 90.667 }
  },
  {
    id: 'cn-kailash',
    name: '冈仁波齐',
    aliases: ['Mount Kailash'],
    country: '中国',
    region: '西藏',
    altitudeRange: '转山起点约 4600m',
    category: 'extreme',
    approxElevation: 4600,
    notes: '塔钦 (Darchen) 镇坐标。',
    coordinates: { latitude: 30.976, longitude: 81.287 }
  },
  {
    id: 'cn-manasa',
    name: '玛旁雍错',
    aliases: ['Manasarovar'],
    country: '中国',
    region: '西藏',
    altitudeRange: '约 4588m',
    category: 'extreme',
    notes: '圣湖，邻近冈仁波齐。',
    coordinates: { latitude: 30.670, longitude: 81.470 }
  },
  {
    id: 'cn-naqu',
    name: '那曲',
    aliases: ['Nagqu'],
    country: '中国',
    region: '西藏',
    altitudeRange: '4500m 以上',
    category: 'extreme',
    notes: '高寒缺氧，植被稀少。',
    coordinates: { latitude: 31.476, longitude: 92.057 }
  },

  // ==========================================
  // 2. 中国 - 青海/甘肃/新疆 (Northwest China)
  // ==========================================
  {
    id: 'cn-qinghai-plateau',
    name: '青海高原',
    aliases: ['Qinghai'],
    country: '中国',
    region: '青海',
    altitudeRange: '平均 3000m+',
    category: 'extreme',
    notes: '青海湖区域参考。',
    coordinates: { latitude: 36.650, longitude: 100.400 }
  },
  {
    id: 'cn-xining',
    name: '西宁',
    aliases: ['Xining'],
    country: '中国',
    region: '青海',
    altitudeRange: '约 2260m',
    category: 'medium',
    notes: '适应高海拔的最佳中转站。',
    coordinates: { latitude: 36.623, longitude: 101.778 }
  },
  {
    id: 'cn-yushu',
    name: '玉树',
    aliases: ['Yushu'],
    country: '中国',
    region: '青海',
    altitudeRange: '3700m 以上',
    category: 'extreme',
    notes: '结古镇，海拔较高。',
    coordinates: { latitude: 33.004, longitude: 97.013 }
  },
  {
    id: 'cn-hoh-xil',
    name: '可可西里',
    aliases: ['Hoh Xil'],
    country: '中国',
    region: '青海',
    altitudeRange: '4500m 以上',
    category: 'extreme',
    notes: '无人区，索南达杰保护站。',
    coordinates: { latitude: 35.435, longitude: 94.072 }
  },
  {
    id: 'cn-golmud',
    name: '格尔木',
    aliases: ['Golmud'],
    country: '中国',
    region: '青海',
    altitudeRange: '约 2800m',
    category: 'high',
    notes: '青藏线关键节点。',
    coordinates: { latitude: 36.402, longitude: 94.903 }
  },
  {
    id: 'cn-qilian',
    name: '祁连县',
    aliases: ['Qilian'],
    country: '中国',
    region: '青海',
    altitudeRange: '约 2700m',
    category: 'high',
    notes: '东方小瑞士，卓尔山。',
    coordinates: { latitude: 38.179, longitude: 100.245 }
  },
  {
    id: 'cn-zhagana',
    name: '扎尕那',
    aliases: ['Zhagana'],
    country: '中国',
    region: '甘肃',
    altitudeRange: '3000m - 3300m',
    category: 'high',
    notes: '甘南秘境，地形封闭。',
    coordinates: { latitude: 34.195, longitude: 103.142 }
  },
  {
    id: 'cn-taxkorgan',
    name: '塔什库尔干 (塔县)',
    aliases: ['Taxkorgan'],
    country: '中国',
    region: '新疆',
    altitudeRange: '约 3090m',
    category: 'high',
    notes: '帕米尔高原，中巴公路节点。',
    coordinates: { latitude: 37.774, longitude: 75.226 }
  },
  {
    id: 'cn-karakul',
    name: '卡拉库里湖',
    aliases: ['Karakul Lake'],
    country: '中国',
    region: '新疆',
    altitudeRange: '约 3600m',
    category: 'extreme',
    notes: '慕士塔格峰脚下。',
    coordinates: { latitude: 38.445, longitude: 75.056 }
  },
  {
    id: 'cn-hongqilapu',
    name: '红其拉甫国门',
    aliases: ['Khunjerab Pass'],
    country: '中国',
    region: '新疆',
    altitudeRange: '约 4733m',
    category: 'extreme',
    notes: '世界最高国门，不可久留。',
    coordinates: { latitude: 36.853, longitude: 75.428 }
  },

  // ==========================================
  // 3. 中国 - 川西/云南/台湾 (Southwest China & Taiwan)
  // ==========================================
  {
    id: 'cn-daocheng-yading',
    name: '稻城亚丁',
    aliases: ['Daocheng Yading'],
    country: '中国',
    region: '四川',
    altitudeRange: '景区核心 4000m - 4700m',
    category: 'extreme',
    notes: '牛奶海、五色海海拔极高。',
    coordinates: { latitude: 28.397, longitude: 100.320 }
  },
  {
    id: 'cn-seda',
    name: '色达',
    aliases: ['Sertar'],
    country: '中国',
    region: '四川',
    altitudeRange: '3800m - 4000m',
    category: 'extreme',
    notes: '佛学院海拔较高，夜间寒冷。',
    coordinates: { latitude: 32.228, longitude: 100.485 }
  },
  {
    id: 'cn-siguniang',
    name: '四姑娘山',
    aliases: ['Mount Siguniang'],
    country: '中国',
    region: '四川',
    altitudeRange: '镇2900m / 景点3500m+',
    category: 'high',
    notes: '日隆镇坐标。',
    coordinates: { latitude: 30.988, longitude: 102.827 }
  },
  {
    id: 'cn-ganzi',
    name: '甘孜县',
    aliases: ['Ganzi'],
    country: '中国',
    region: '四川',
    altitudeRange: '约 3390m',
    category: 'high',
    notes: '川西环线重要站点。',
    coordinates: { latitude: 31.623, longitude: 99.997 }
  },
  {
    id: 'cn-aba',
    name: '马尔康 (阿坝州)',
    aliases: ['Aba', 'Maerkang'],
    country: '中国',
    region: '四川',
    altitudeRange: '约 2600m',
    category: 'high',
    notes: '相对温和，但周边山区海拔高。',
    coordinates: { latitude: 31.905, longitude: 102.225 }
  },
  {
    id: 'cn-shangri-la',
    name: '香格里拉',
    aliases: ['Shangri-La'],
    country: '中国',
    region: '云南',
    altitudeRange: '约 3300m',
    category: 'high',
    notes: '独克宗古城。',
    coordinates: { latitude: 27.818, longitude: 99.706 }
  },
  {
    id: 'cn-deqin',
    name: '德钦 (梅里雪山)',
    aliases: ['Deqin', 'Meili'],
    country: '中国',
    region: '云南',
    altitudeRange: '飞来寺约 3400m',
    category: 'high',
    notes: '雨崩徒步区海拔更高。',
    coordinates: { latitude: 28.448, longitude: 98.835 }
  },
  {
    id: 'cn-yulong',
    name: '玉龙雪山',
    aliases: ['Yulong Snow Mountain'],
    country: '中国',
    region: '云南',
    altitudeRange: '索道上站 4506m',
    category: 'high',
    notes: '冰川公园，需氧气瓶。',
    coordinates: { latitude: 27.106, longitude: 100.223 }
  },
  {
    id: 'cn-lijiang',
    name: '丽江',
    aliases: ['Lijiang'],
    country: '中国',
    region: '云南',
    altitudeRange: '约 2400m',
    category: 'medium',
    notes: '适合作为适应地。',
    coordinates: { latitude: 26.870, longitude: 100.233 }
  },
  {
    id: 'cn-kunming',
    name: '昆明',
    aliases: ['Kunming'],
    country: '中国',
    region: '云南',
    altitudeRange: '约 1890m',
    category: 'medium',
    notes: '基本无高反风险。',
    coordinates: { latitude: 25.038, longitude: 102.718 }
  },
  {
    id: 'cn-yushan',
    name: '玉山主峰',
    aliases: ['Yushan'],
    country: '中国',
    region: '台湾',
    altitudeRange: '3952m',
    category: 'extreme',
    notes: '排云山庄约 3400m。',
    coordinates: { latitude: 23.470, longitude: 120.957 }
  },
  {
    id: 'cn-hehuanshan',
    name: '合欢山 (武岭)',
    aliases: ['Hehuanshan'],
    country: '中国',
    region: '台湾',
    altitudeRange: '公路点 3275m',
    category: 'high',
    notes: '开车直达，易忽略高反。',
    coordinates: { latitude: 24.137, longitude: 121.276 }
  },

  // ==========================================
  // 4. 亚洲其他地区 (Rest of Asia)
  // ==========================================
  {
    id: 'np-kathmandu',
    name: '加德满都',
    aliases: ['Kathmandu'],
    country: '尼泊尔',
    altitudeRange: '约 1400m',
    category: 'medium',
    notes: '喜马拉雅门户。',
    coordinates: { latitude: 27.712, longitude: 85.312 }
  },
  {
    id: 'np-abc',
    name: '安纳普尔纳大本营 (ABC)',
    aliases: ['Annapurna Base Camp'],
    country: '尼泊尔',
    altitudeRange: '约 4130m',
    category: 'extreme',
    notes: '热门徒步终点。',
    coordinates: { latitude: 28.530, longitude: 83.878 }
  },
  {
    id: 'np-everest-south',
    name: '珠峰南坡大本营',
    aliases: ['EBC Nepal'],
    country: '尼泊尔',
    altitudeRange: '约 5364m',
    category: 'extreme',
    notes: '需长途徒步到达。',
    coordinates: { latitude: 28.007, longitude: 86.859 }
  },
  {
    id: 'in-leh',
    name: '列城 (拉达克)',
    aliases: ['Leh'],
    country: '印度',
    altitudeRange: '约 3500m',
    category: 'extreme',
    notes: '印度版“西藏”，高反常见。',
    coordinates: { latitude: 34.152, longitude: 77.577 }
  },
  {
    id: 'bt-thimphu',
    name: '廷布',
    aliases: ['Thimphu'],
    country: '不丹',
    altitudeRange: '约 2300m',
    category: 'medium',
    notes: '首都。',
    coordinates: { latitude: 27.472, longitude: 89.639 }
  },
  {
    id: 'jp-fuji',
    name: '富士山',
    aliases: ['Mount Fuji'],
    country: '日本',
    altitudeRange: '峰顶 3776m',
    category: 'extreme',
    notes: '五合目 (2300m) 起攀。',
    coordinates: { latitude: 35.360, longitude: 138.727 }
  },
  {
    id: 'id-rinjani',
    name: '林贾尼火山',
    aliases: ['Mount Rinjani'],
    country: '印度尼西亚',
    altitudeRange: '3726m',
    category: 'extreme',
    notes: '龙目岛徒步胜地。',
    coordinates: { latitude: -8.411, longitude: 116.457 }
  },
  {
    id: 'id-bromo',
    name: '布罗莫火山',
    aliases: ['Mount Bromo'],
    country: '印度尼西亚',
    altitudeRange: '2329m',
    category: 'medium',
    notes: '火山灰环境可能加剧呼吸不适。',
    coordinates: { latitude: -7.942, longitude: 112.953 }
  },
  {
    id: 'tj-pamir',
    name: '帕米尔公路 (M41)',
    aliases: ['Pamir Highway'],
    country: '塔吉克斯坦',
    altitudeRange: '平均 4000m+',
    category: 'extreme',
    notes: 'Ak-Baital 山口 4655m。',
    coordinates: { latitude: 38.169, longitude: 73.969 }
  },
  {
    id: 'my-kinabalu',
    name: '京那巴鲁山 (神山)',
    aliases: ['Mount Kinabalu'],
    country: '马来西亚',
    altitudeRange: '4095m',
    category: 'extreme',
    notes: '东南亚最高峰。',
    coordinates: { latitude: 6.075, longitude: 116.558 }
  },

  // ==========================================
  // 5. 南美洲 (South America)
  // ==========================================
  {
    id: 'bo-la-paz',
    name: '拉巴斯',
    aliases: ['La Paz'],
    country: '玻利维亚',
    altitudeRange: '3600m - 4000m',
    category: 'extreme',
    notes: '世界最高首都，机场海拔 4000m+。',
    coordinates: { latitude: -16.495, longitude: -68.133 }
  },
  {
    id: 'bo-uyuni',
    name: '乌尤尼盐沼',
    aliases: ['Salar de Uyuni'],
    country: '玻利维亚',
    altitudeRange: '约 3656m',
    category: 'extreme',
    notes: '天空之镜，紫外线极强。',
    coordinates: { latitude: -20.133, longitude: -67.489 }
  },
  {
    id: 'bo-titicaca',
    name: '的的喀喀湖',
    aliases: ['Lake Titicaca'],
    country: '玻利维亚/秘鲁',
    altitudeRange: '3812m',
    category: 'extreme',
    notes: '世界最高通航湖泊。',
    coordinates: { latitude: -16.166, longitude: -69.086 }
  },
  {
    id: 'pe-cusco',
    name: '库斯科',
    aliases: ['Cusco'],
    country: '秘鲁',
    altitudeRange: '约 3400m',
    category: 'high',
    notes: '马丘比丘中转站，高反高发。',
    coordinates: { latitude: -13.517, longitude: -71.978 }
  },
  {
    id: 'pe-machupicchu',
    name: '马丘比丘',
    aliases: ['Machu Picchu'],
    country: '秘鲁',
    altitudeRange: '2430m',
    category: 'high',
    notes: '遗址不高，但周边山路海拔高。',
    coordinates: { latitude: -13.163, longitude: -72.545 }
  },
  {
    id: 'pe-vinicunca',
    name: '彩虹山',
    aliases: ['Rainbow Mountain'],
    country: '秘鲁',
    altitudeRange: '5200m',
    category: 'extreme',
    notes: '极高海拔徒步，需良好体能。',
    coordinates: { latitude: -13.869, longitude: -71.303 }
  },
  {
    id: 'ec-quito',
    name: '基多',
    aliases: ['Quito'],
    country: '厄瓜多尔',
    altitudeRange: '2850m',
    category: 'high',
    notes: '高原首都。',
    coordinates: { latitude: -0.180, longitude: -78.467 }
  },
  {
    id: 'co-bogota',
    name: '波哥大',
    aliases: ['Bogota'],
    country: '哥伦比亚',
    altitudeRange: '2640m',
    category: 'high',
    notes: '安第斯山都会。',
    coordinates: { latitude: 4.711, longitude: -74.072 }
  },
  {
    id: 'cl-atacama',
    name: '阿塔卡马 (圣佩德罗)',
    aliases: ['San Pedro de Atacama'],
    country: '智利',
    altitudeRange: '镇2400m / 景点4000m+',
    category: 'high',
    notes: '间歇泉海拔极高。',
    coordinates: { latitude: -22.908, longitude: -68.199 }
  },

  // ==========================================
  // 6. 北美洲 (North America)
  // ==========================================
  {
    id: 'us-pikes-peak',
    name: '派克峰',
    aliases: ['Pikes Peak'],
    country: '美国',
    region: '科罗拉多',
    altitudeRange: '4302m',
    category: 'extreme',
    notes: '可驾车直达顶峰，极易高反。',
    coordinates: { latitude: 38.840, longitude: -105.042 }
  },
  {
    id: 'us-mauna-kea',
    name: '莫纳克亚山',
    aliases: ['Mauna Kea'],
    country: '美国',
    region: '夏威夷',
    altitudeRange: '4207m',
    category: 'extreme',
    notes: '海平面2小时车程直达山顶，风险极大。',
    coordinates: { latitude: 19.820, longitude: -155.468 }
  },
  {
    id: 'us-rocky-mountain',
    name: '落基山国家公园',
    aliases: ['RMNP'],
    country: '美国',
    region: '科罗拉多',
    altitudeRange: '3700m+',
    category: 'extreme',
    notes: 'Trail Ridge Road 公路最高点。',
    coordinates: { latitude: 40.425, longitude: -105.750 }
  },
  {
    id: 'mx-mexico-city',
    name: '墨西哥城',
    aliases: ['Mexico City'],
    country: '墨西哥',
    altitudeRange: '2250m',
    category: 'medium',
    notes: '高海拔大都会。',
    coordinates: { latitude: 19.432, longitude: -99.133 }
  },
  {
    id: 'mx-nevado-de-toluca',
    name: '托卢卡火山',
    aliases: ['Nevado de Toluca'],
    country: '墨西哥',
    altitudeRange: '4200m',
    category: 'extreme',
    notes: '可驾车接近火山口。',
    coordinates: { latitude: 19.108, longitude: -99.761 }
  },

  // ==========================================
  // 7. 欧洲 / 非洲 / 中东 (Europe, Africa, ME)
  // ==========================================
  {
    id: 'ch-jungfraujoch',
    name: '少女峰',
    aliases: ['Jungfraujoch'],
    country: '瑞士',
    altitudeRange: '3454m',
    category: 'high',
    notes: '欧洲屋脊火车站，快速上升。',
    coordinates: { latitude: 46.547, longitude: 7.982 }
  },
  {
    id: 'fr-aiguille-du-midi',
    name: '南针峰 (霞慕尼)',
    aliases: ['Aiguille du Midi'],
    country: '法国',
    altitudeRange: '3842m',
    category: 'extreme',
    notes: '缆车爬升极快。',
    coordinates: { latitude: 45.879, longitude: 6.887 }
  },
  {
    id: 'es-teide',
    name: '泰德峰',
    aliases: ['Mount Teide'],
    country: '西班牙',
    altitudeRange: '3718m',
    category: 'extreme',
    notes: '特内里费岛，缆车直达。',
    coordinates: { latitude: 28.272, longitude: -16.642 }
  },
  {
    id: 'ru-elbrus',
    name: '厄尔布鲁士峰',
    aliases: ['Mount Elbrus'],
    country: '俄罗斯',
    altitudeRange: '3800m - 5642m',
    category: 'extreme',
    notes: '欧洲最高峰。',
    coordinates: { latitude: 43.349, longitude: 42.445 }
  },
  {
    id: 'tz-kilimanjaro',
    name: '乞力马扎罗山',
    aliases: ['Kilimanjaro'],
    country: '坦桑尼亚',
    altitudeRange: '5895m',
    category: 'extreme',
    notes: '非洲之巅。',
    coordinates: { latitude: -3.067, longitude: 37.355 }
  },
  {
    id: 'et-addis',
    name: '亚的斯亚贝巴',
    aliases: ['Addis Ababa'],
    country: '埃塞俄比亚',
    altitudeRange: '2400m',
    category: 'high',
    notes: '非洲最高首都。',
    coordinates: { latitude: 9.030, longitude: 38.740 }
  },
  {
    id: 'ma-toubkal',
    name: '图卜卡勒峰',
    aliases: ['Mount Toubkal'],
    country: '摩洛哥',
    altitudeRange: '4167m',
    category: 'extreme',
    notes: '北非阿特拉斯山最高峰。',
    coordinates: { latitude: 31.061, longitude: -7.915 }
  },
  {
    id: 'ir-damavand',
    name: '达马万德山',
    aliases: ['Mount Damavand'],
    country: '伊朗',
    altitudeRange: '5610m',
    category: 'extreme',
    notes: '中东最高火山。',
    coordinates: { latitude: 35.951, longitude: 52.109 }
  },
 // --- 南美洲：阿根廷 (Argentina) ---
 {
  id: 'ar-aconcagua',
  name: '阿空加瓜峰',
  aliases: ['Aconcagua'],
  country: '阿根廷',
  region: '门多萨',
  altitudeRange: '峰顶 6961m，大本营 4300m',
  category: 'extreme',
  approxElevation: 6961,
  notes: '南半球及西半球最高峰。徒步至大本营 (Plaza de Mulas) 是热门路线。',
  coordinates: { latitude: -32.653, longitude: -70.011 }
},

// --- 中亚：吉尔吉斯斯坦 (Central Asia) ---
{
  id: 'kg-song-kul',
  name: '颂湖 (宋库尔湖)',
  aliases: ['Song Kul', 'Song-Köl'],
  country: '吉尔吉斯斯坦',
  region: '那伦',
  altitudeRange: '约 3016m',
  category: 'high',
  notes: '高山湖泊，夏季热门的游牧帐篷 (Yurt) 住宿体验地，夜间寒冷。',
  coordinates: { latitude: 41.850, longitude: 75.114 }
},
{
  id: 'kg-ala-archa',
  name: '阿拉阿恰国家公园',
  aliases: ['Ala Archa'],
  country: '吉尔吉斯斯坦',
  region: '比什凯克附近',
  altitudeRange: '入口 2200m，徒步终点 3800m+',
  category: 'high',
  notes: '离首都最近的高山徒步区，攀登 Ratsek Hut 容易发生高反。',
  coordinates: { latitude: 42.563, longitude: 74.481 }
},

// --- 高加索地区 (Caucasus) ---
{
  id: 'ge-kazbegi',
  name: '卡兹别克 (斯特潘茨明达)',
  aliases: ['Kazbegi', 'Stepantsminda', 'Mount Kazbek'],
  country: '格鲁吉亚',
  region: '姆茨赫塔-姆季阿涅季',
  altitudeRange: '镇 1700m，教堂 2170m，冰川 3000m+',
  category: 'medium',
  notes: '虽然镇子不高，但去往 Gergeti Trinity Church 和冰川的徒步爬升很大。',
  coordinates: { latitude: 42.662, longitude: 44.620 }
},
{
  id: 'tr-ararat',
  name: '亚拉拉特山',
  aliases: ['Mount Ararat'],
  country: '土耳其',
  region: '阿勒',
  altitudeRange: '峰顶 5137m',
  category: 'extreme',
  notes: '传说中诺亚方舟停靠地，土耳其最高峰，需办理许可攀登。',
  coordinates: { latitude: 39.702, longitude: 44.299 }
},

// --- 中美洲 (Central America) ---
{
  id: 'gt-acatenango',
  name: '阿卡特南戈火山',
  aliases: ['Acatenango'],
  country: '危地马拉',
  region: '安提瓜附近',
  altitudeRange: '3976m',
  category: 'extreme',
  notes: '非常著名的过夜徒步，在营地观看对面富埃戈火山喷发，海拔很高。',
  coordinates: { latitude: 14.501, longitude: -90.876 }
},

// --- 大洋洲 (Oceania) ---
{
  id: 'pg-wilhelm',
  name: '威廉山',
  aliases: ['Mount Wilhelm'],
  country: '巴布亚新几内亚',
  altitudeRange: '4509m',
  category: 'extreme',
  notes: '大洋洲最高火山之一，赤道附近的雪山，徒步难度大。',
  coordinates: { latitude: -5.780, longitude: 145.030 }
},

// --- 中国：更多进阶点位 (China Advanced) ---
{
  id: 'cn-hailuogou',
  name: '海螺沟 (贡嘎山)',
  aliases: ['Hailuogou', 'Minya Konka'],
  country: '中国',
  region: '四川',
  altitudeRange: '四号营地约 3600m',
  category: 'extreme',
  notes: '近距离观赏贡嘎主峰冰川，索道直达高海拔区。',
  coordinates: { latitude: 29.576, longitude: 101.990 }
},
{
  id: 'cn-haba',
  name: '哈巴雪山',
  aliases: ['Haba Snow Mountain'],
  country: '中国',
  region: '云南',
  altitudeRange: '峰顶 5396m，大本营 4100m',
  category: 'extreme',
  notes: '著名的“人生第一座雪山”，大本营海拔已经很高。',
  coordinates: { latitude: 27.317, longitude: 100.100 }
},
{
  id: 'cn-anyemaqen',
  name: '阿尼玛卿',
  aliases: ['Amne Machin'],
  country: '中国',
  region: '青海',
  altitudeRange: '垭口 4600m+',
  category: 'extreme',
  notes: '藏区四大神山之一，转山路线海拔极高。',
  coordinates: { latitude: 34.795, longitude: 99.462 }
},

// --- 智利极高点 (Chile Extreme) ---
{
  id: 'cl-ojos-del-salado',
  name: '奥霍斯-德尔萨拉多山',
  aliases: ['Ojos del Salado'],
  country: '智利/阿根廷',
  altitudeRange: '6893m',
  category: 'extreme',
  notes: '世界上最高的火山。部分路段可吉普车到达极高处，极度危险。',
  coordinates: { latitude: -27.109, longitude: -68.541 }
},

// --- 肯尼亚 (Kenya) ---
{
  id: 'ke-mount-kenya',
  name: '肯尼亚山',
  aliases: ['Mount Kenya'],
  country: '肯尼亚',
  altitudeRange: '峰顶 5199m，Lenana Point 4985m',
  category: 'extreme',
  notes: '非洲第二高峰，赤道雪山，徒步者的挑战。',
  coordinates: { latitude: -0.152, longitude: 37.308 }
},
];

