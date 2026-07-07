import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get(getRepositoryToken(Court));

  // 先清空再插入，避免每次重启产生重复数据
  await repo.clear();

  const courts = [
    { name:'白河湿地公园乒乓球区', address:'南阳市卧龙区白河大道', lat:32.9864, lng:112.5349, isFree:true, tableCount:10, material:'户外地砖', hasLighting:false, openHours:'全天', rating:4.5, features:['免费开放','河边风景','空气好'] },
    { name:'南阳市体育中心乒乓球场', address:'南阳市卧龙区滨河路', lat:32.9906, lng:112.5284, isFree:true, tableCount:6, material:'塑胶', hasLighting:true, openHours:'06:00-21:00', rating:4.3, features:['免费开放','塑胶地面','夜间灯光'] },
    { name:'南阳理工学院乒乓球区', address:'南阳市宛城区长江路80号', lat:32.9788, lng:112.5412, isFree:true, tableCount:8, material:'水泥防滑', hasLighting:false, openHours:'06:00-20:00', rating:4.0, features:['校园场地','免费开放'] },
    { name:'解放广场乒乓球角', address:'南阳市卧龙区中州路', lat:32.9951, lng:112.5219, isFree:true, tableCount:4, material:'水泥', hasLighting:false, openHours:'06:00-20:00', rating:3.8, features:['市中心','免费开放'] },
    { name:'汉冶路社区活动中心', address:'南阳市宛城区汉冶路', lat:33.0012, lng:112.5498, isFree:true, tableCount:2, material:'塑胶', hasLighting:true, openHours:'08:00-21:00', rating:3.5, features:['室内','社区免费','灯光好'] },
    { name:'仲景养生小镇乒乓球区', address:'南阳市卧龙区仲景路', lat:32.9715, lng:112.5103, isFree:false, tableCount:3, material:'专业运动地板', hasLighting:true, openHours:'09:00-22:00', rating:4.2, features:['付费¥15/h','室内空调','专业级'] },
    { name:'南阳师范学院乒乓球场', address:'南阳市卧龙区卧龙路1638号', lat:32.9756, lng:112.5034, isFree:true, tableCount:12, material:'塑胶', hasLighting:true, openHours:'06:00-22:00', rating:4.7, features:['免费开放','球台多','高手聚集'] },
    { name:'独山大道体育公园', address:'南阳市宛城区独山大道', lat:33.0089, lng:112.5523, isFree:true, tableCount:6, material:'户外硅PU', hasLighting:false, openHours:'06:00-19:00', rating:4.1, features:['免费开放','公园环境','停车方便'] },
  ];

  for (const c of courts) {
    const entity = repo.create(c);
    await repo.save(entity);
  }

  console.log(`✅ 插入 ${courts.length} 个南阳场地`);
  await app.close();
}
seed().catch(e => { console.error(e); process.exit(1); });
