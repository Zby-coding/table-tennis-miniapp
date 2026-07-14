import Taro from '@tarojs/taro';
import { Court } from '@/types';

export const DEFAULT_LOCATION = { lat: 32.9864, lng: 112.5349 };

export type NavRuntime = 'mobile' | 'pc' | 'devtools' | 'h5';

export interface UserLocationResult {
  location: { lat: number; lng: number };
  denied: boolean;
  fromGps: boolean;
}

export interface OpenCourtNavigationOptions {
  mapId?: string;
}

type CourtNavTarget = Pick<Court, 'lat' | 'lng' | 'name' | 'address'>;

export const isValidCoord = (lat: unknown, lng: unknown): boolean => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return Number.isFinite(nLat) && Number.isFinite(nLng) && nLat > 10 && nLat < 60 && nLng > 50 && nLng < 180;
};

export const getNavRuntime = (): NavRuntime => {
  if (process.env.TARO_ENV === 'h5') return 'h5';

  try {
    const { platform } = Taro.getSystemInfoSync();
    if (platform === 'devtools') return 'devtools';
    if (platform === 'windows' || platform === 'mac') return 'pc';
    return 'mobile';
  } catch {
    return 'mobile';
  }
};

export const getUserLocation = async (): Promise<UserLocationResult> => {
  try {
    const setting = await Taro.getSetting();
    if (setting.authSetting?.['scope.userLocation'] === false) {
      return { location: DEFAULT_LOCATION, denied: true, fromGps: false };
    }

    const res = await Taro.getLocation({ type: 'gcj02' });
    if (isValidCoord(res.latitude, res.longitude)) {
      return {
        location: { lat: Number(res.latitude), lng: Number(res.longitude) },
        denied: false,
        fromGps: true,
      };
    }
  } catch {
    // fall through to default
  }

  return { location: DEFAULT_LOCATION, denied: false, fromGps: false };
};

export const ensureLocationPermission = async (): Promise<boolean> => {
  try {
    const setting = await Taro.getSetting();
    if (setting.authSetting?.['scope.userLocation'] !== false) {
      return true;
    }

    const { confirm } = await Taro.showModal({
      title: '需要位置权限',
      content: '开启位置权限后可查看附近场地并从当前位置导航',
      confirmText: '去设置',
      cancelText: '取消',
    });

    if (!confirm) return false;

    const openRes = await Taro.openSetting();
    return openRes.authSetting?.['scope.userLocation'] === true;
  } catch {
    return false;
  }
};

const openLocationView = async (court: CourtNavTarget): Promise<void> => {
  await Taro.openLocation({
    latitude: Number(court.lat),
    longitude: Number(court.lng),
    name: court.name,
    address: court.address,
    scale: 16,
  });
};

const openMapAppNavigation = (mapId: string, court: CourtNavTarget): Promise<void> => new Promise((resolve, reject) => {
  try {
    const mapCtx = Taro.createMapContext(mapId);
    mapCtx.openMapApp({
      latitude: Number(court.lat),
      longitude: Number(court.lng),
      destination: court.name,
      preferApplication: 'tencent',
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  } catch (err) {
    reject(err);
  }
});

const showPcNavigationMenu = async (court: CourtNavTarget, runtime: 'pc' | 'devtools'): Promise<void> => {
  const tip = runtime === 'devtools'
    ? '开发者工具不支持路线导航，请使用真机预览。'
    : 'PC 端微信暂不支持一键路线导航，请使用手机微信打开小程序，或使用下方复制功能。';

  await Taro.showModal({
    title: '导航提示',
    content: tip,
    showCancel: false,
    confirmText: '知道了',
  });

  try {
    const { tapIndex } = await Taro.showActionSheet({
      itemList: ['在地图中查看', '复制地址', '复制坐标'],
    });

    if (tapIndex === 0) {
      await openLocationView(court);
      return;
    }

    if (tapIndex === 1) {
      await Taro.setClipboardData({ data: court.address || court.name });
      Taro.showToast({ title: '地址已复制', icon: 'success' });
      return;
    }

    if (tapIndex === 2) {
      await Taro.setClipboardData({ data: `${court.lat},${court.lng}` });
      Taro.showToast({ title: '坐标已复制', icon: 'success' });
    }
  } catch {
    // user cancelled action sheet
  }
};

export const openCourtNavigation = async (
  court: CourtNavTarget,
  options?: OpenCourtNavigationOptions,
): Promise<void> => {
  const runtime = getNavRuntime();

  if (runtime === 'h5') {
    Taro.showToast({ title: '请在微信小程序中使用导航功能', icon: 'none' });
    return;
  }

  if (!isValidCoord(court.lat, court.lng)) {
    Taro.showToast({ title: '场地坐标无效', icon: 'none' });
    return;
  }

  if (runtime === 'pc' || runtime === 'devtools') {
    try {
      await showPcNavigationMenu(court, runtime);
    } catch {
      Taro.showToast({ title: '操作已取消', icon: 'none' });
    }
    return;
  }

  const permitted = await ensureLocationPermission();
  if (!permitted) {
    const setting = await Taro.getSetting().catch(() => null);
    if (setting?.authSetting?.['scope.userLocation'] === false) {
      return;
    }
  }

  if (options?.mapId) {
    try {
      await openMapAppNavigation(options.mapId, court);
      return;
    } catch {
      // fallback to built-in map view
    }
  }

  try {
    await openLocationView(court);
  } catch {
    Taro.showToast({ title: '打开地图失败，请检查位置权限', icon: 'none' });
  }
};
