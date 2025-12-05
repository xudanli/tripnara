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
}

/**
 * 高海拔地区数据数组
 * 
 * 注意：这是一个示例数据，实际使用时需要补充完整的数据集
 */
export const HIGH_ALTITUDE_REGIONS: HighAltitudeRegion[] = [
  // 中国地区
  {
    id: 'cn-lasa',
    name: '拉萨',
    aliases: ['Lhasa', 'Lasa'],
    country: '中国',
    altitudeRange: '3650m',
    category: 'high',
    notes: '西藏首府，建议到达后休息2-3小时再活动',
    coordinates: { latitude: 29.6544, longitude: 91.1722 },
  },
  {
    id: 'cn-lijiang',
    name: '丽江',
    aliases: ['Lijiang'],
    country: '中国',
    altitudeRange: '2400m',
    category: 'medium',
    coordinates: { latitude: 26.8550, longitude: 100.2277 },
  },
  {
    id: 'cn-kunming',
    name: '昆明',
    aliases: ['Kunming'],
    country: '中国',
    altitudeRange: '1890m',
    category: 'low',
    coordinates: { latitude: 25.0389, longitude: 102.7183 },
  },
  {
    id: 'cn-xining',
    name: '西宁',
    aliases: ['Xining'],
    country: '中国',
    altitudeRange: '2260m',
    category: 'medium',
    coordinates: { latitude: 36.6171, longitude: 101.7782 },
  },
  {
    id: 'cn-hehuan',
    name: '合欢山武岭',
    aliases: ['Hehuan Mountain', 'Wuling'],
    country: '中国台湾',
    altitudeRange: '3275m',
    category: 'high',
    notes: '开车直达，身体缺乏适应时间，极易发生隐性高反',
    coordinates: { latitude: 24.1378, longitude: 121.2733 },
  },
  
  // 南美洲
  {
    id: 'pe-cusco',
    name: '库斯科',
    aliases: ['Cusco', 'Cuzco'],
    country: '秘鲁',
    altitudeRange: '3399m',
    category: 'high',
    notes: '印加帝国古都，建议到达后休息1-2天适应',
    coordinates: { latitude: -13.5319, longitude: -71.9675 },
  },
  {
    id: 'pe-puno',
    name: '普诺',
    aliases: ['Puno'],
    country: '秘鲁',
    altitudeRange: '3827m',
    category: 'high',
    coordinates: { latitude: -15.8402, longitude: -70.0219 },
  },
  {
    id: 'bo-la-paz',
    name: '拉巴斯',
    aliases: ['La Paz'],
    country: '玻利维亚',
    altitudeRange: '3640m',
    category: 'high',
    notes: '世界上海拔最高的首都',
    coordinates: { latitude: -16.5000, longitude: -68.1500 },
  },
  {
    id: 'cl-ojos-del-salado',
    name: '奥霍斯-德尔萨拉多山',
    aliases: ['Ojos del Salado'],
    country: '智利/阿根廷',
    altitudeRange: '6893m',
    category: 'extreme',
    notes: '世界上最高的火山。部分路段可吉普车到达极高处，极度危险。',
    coordinates: { latitude: -27.109, longitude: -68.541 },
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
    coordinates: { latitude: -32.653, longitude: -70.011 },
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
    coordinates: { latitude: 41.850, longitude: 75.114 },
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
    coordinates: { latitude: 42.563, longitude: 74.481 },
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
    coordinates: { latitude: 42.662, longitude: 44.620 },
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
    coordinates: { latitude: 39.702, longitude: 44.299 },
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
    coordinates: { latitude: 14.501, longitude: -90.876 },
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
    coordinates: { latitude: -5.780, longitude: 145.030 },
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
    coordinates: { latitude: 29.576, longitude: 101.990 },
  },
  {
    id: 'cn-haba',
    name: '哈巴雪山',
    aliases: ['Haba Snow Mountain'],
    country: '中国',
    region: '云南',
    altitudeRange: '峰顶 5396m，大本营 4100m',
    category: 'extreme',
    notes: '著名的"人生第一座雪山"，大本营海拔已经很高。',
    coordinates: { latitude: 27.317, longitude: 100.100 },
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
    coordinates: { latitude: 34.795, longitude: 99.462 },
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
    coordinates: { latitude: -0.152, longitude: 37.308 },
  },
  
  // 亚洲其他地区
  {
    id: 'in-leh',
    name: '列城',
    aliases: ['Leh'],
    country: '印度',
    altitudeRange: '3500m',
    category: 'high',
    notes: '拉达克地区首府，建议到达后休息2-3天',
    coordinates: { latitude: 34.1526, longitude: 77.5770 },
  },
  {
    id: 'np-kathmandu',
    name: '加德满都',
    aliases: ['Kathmandu'],
    country: '尼泊尔',
    altitudeRange: '1400m',
    category: 'low',
    coordinates: { latitude: 27.7172, longitude: 85.3240 },
  },
  {
    id: 'np-namche',
    name: '南池市场',
    aliases: ['Namche Bazaar'],
    country: '尼泊尔',
    altitudeRange: '3440m',
    category: 'high',
    notes: '珠峰大本营路线上的重要驿站',
    coordinates: { latitude: 27.8058, longitude: 86.7150 },
  },
  
  // 非洲
  {
    id: 'et-addis-ababa',
    name: '亚的斯亚贝巴',
    aliases: ['Addis Ababa'],
    country: '埃塞俄比亚',
    altitudeRange: '2355m',
    category: 'medium',
    coordinates: { latitude: 9.1450, longitude: 38.7667 },
  },
  
  // 北美洲
  {
    id: 'us-pikes-peak',
    name: '派克峰',
    aliases: ['Pikes Peak'],
    country: '美国',
    altitudeRange: '4302m',
    category: 'high',
    notes: '开车直达，身体缺乏适应时间，极易发生隐性高反',
    coordinates: { latitude: 38.8405, longitude: -105.0442 },
  },
  {
    id: 'mx-mexico-city',
    name: '墨西哥城',
    aliases: ['Mexico City', 'Ciudad de México'],
    country: '墨西哥',
    altitudeRange: '2240m',
    category: 'medium',
    coordinates: { latitude: 19.4326, longitude: -99.1332 },
  },
  
  // 欧洲
  {
    id: 'ch-zermatt',
    name: '采尔马特',
    aliases: ['Zermatt'],
    country: '瑞士',
    altitudeRange: '1620m',
    category: 'low',
    coordinates: { latitude: 46.0207, longitude: 7.7491 },
  },
  {
    id: 'at-innsbruck',
    name: '因斯布鲁克',
    aliases: ['Innsbruck'],
    country: '奥地利',
    altitudeRange: '574m',
    category: 'low',
    coordinates: { latitude: 47.2692, longitude: 11.4041 },
  },
];

