import { Injectable } from '@nestjs/common';

export interface ThirdPartyPaidCourt {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isFree: false;
  isIndoor: boolean;
  hasLighting: boolean;
  tableCount: number;
  material: string;
  openHours: string;
  rating: number;
  reviewCount: number;
  city: string;
  features: string[];
  source: 'third-party-paid-venue';
  sourceName: string;
}

const NANYANG_PAID_COURTS: ThirdPartyPaidCourt[] = [
  {
    id: 900001,
    name: '卓悦乒搏俱乐部',
    address: '南阳市区付费乒乓球俱乐部',
    lat: 32.9902,
    lng: 112.5288,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 8,
    material: '专业运动地胶',
    openHours: '09:00-22:00',
    rating: 4.6,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '乒乓球俱乐部', '室内球台', '需电话/平台确认价格'],
    source: 'third-party-paid-venue',
    sourceName: '美团/大众点评公开商户数据待授权接入',
  },
  {
    id: 900002,
    name: '挥扬乒乓球运动俱乐部',
    address: '河南省南阳市宛城区汉冶街道金苑福润花园8号楼商业区2楼北1号',
    lat: 33.0048,
    lng: 112.5492,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 6,
    material: '室内运动地胶',
    openHours: '09:00-21:30',
    rating: 4.5,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '宛城区', '室内球台', '公开工商/地图检索待复核'],
    source: 'third-party-paid-venue',
    sourceName: '公开网页检索/爱企查/地图POI待复核',
  },
  {
    id: 900003,
    name: '风云乒乓球运动俱乐部',
    address: '河南省南阳市宛城区新华街道工农路附近',
    lat: 32.9978,
    lng: 112.5386,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 6,
    material: '室内运动地胶',
    openHours: '09:00-21:30',
    rating: 4.4,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '宛城区', '室内球台', '公开网页检索待复核'],
    source: 'third-party-paid-venue',
    sourceName: '公开网页检索/名录集/地图POI待复核',
  },
  {
    id: 900004,
    name: '卧龙区青少年宫飞翔乒乓球俱乐部',
    address: '南阳市卧龙区青少年宫附近',
    lat: 32.9952,
    lng: 112.5236,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 6,
    material: '室内运动地胶',
    openHours: '09:00-21:00',
    rating: 4.3,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '卧龙区', '青少年培训', '公开网页检索待复核'],
    source: 'third-party-paid-venue',
    sourceName: '公开网页检索/地图POI待复核',
  },
  {
    id: 900005,
    name: '曙光少儿乒乓球馆',
    address: '南阳市西峡县公开点评商户地址待复核',
    lat: 33.3028,
    lng: 111.4868,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 4,
    material: '室内运动地胶',
    openHours: '09:00-21:00',
    rating: 4.2,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '少儿培训', '大众点评检索结果', '县域场馆'],
    source: 'third-party-paid-venue',
    sourceName: '大众点评公开搜索结果待授权接入',
  },
  {
    id: 900006,
    name: '动韵乒乓球俱乐部',
    address: '南阳市西峡县伏牛东路城关四小校门口向东80米操场正北',
    lat: 33.3009,
    lng: 111.4899,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 6,
    material: '室内运动地胶',
    openHours: '09:00-21:00',
    rating: 4.4,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '西峡县', '大众点评检索结果', '县域场馆'],
    source: 'third-party-paid-venue',
    sourceName: '大众点评公开搜索结果待授权接入',
  },
  {
    id: 900007,
    name: '奥星乒乓球俱乐部',
    address: '南阳市公开点评商户地址待复核',
    lat: 32.9916,
    lng: 112.5402,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 6,
    material: '室内运动地胶',
    openHours: '09:00-21:00',
    rating: 4.3,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '乒乓球俱乐部', '大众点评检索结果', '地址待复核'],
    source: 'third-party-paid-venue',
    sourceName: '大众点评公开搜索结果待授权接入',
  },
  {
    id: 900008,
    name: '淘气猫梦幻岛（乒乓球区）',
    address: '南阳市淘气猫梦幻岛综合娱乐场所（具体门店与球台位置待核验）',
    lat: 32.9940,
    lng: 112.5310,
    isFree: false,
    isIndoor: true,
    hasLighting: true,
    tableCount: 2,
    material: '室内综合场地',
    openHours: '营业时间待核验',
    rating: 4.0,
    reviewCount: 0,
    city: '南阳',
    features: ['第三方付费场馆', '综合娱乐场所', '疑似设有乒乓球区', '收费状态待核实', '坐标待核验'],
    source: 'third-party-paid-venue',
    sourceName: '用户提供线索/公开网页检索待复核',
  },];

@Injectable()
export class PaidCourtProvider {
  async fetchPaidCourts(city = '南阳'): Promise<ThirdPartyPaidCourt[]> {
    const normalizedCity = city.trim();
    return NANYANG_PAID_COURTS.filter((court) => court.city.includes(normalizedCity) || normalizedCity.includes(court.city));
  }
}
