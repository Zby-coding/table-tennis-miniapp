import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  health() {
    return {
      name: 'TableTennisPro Server',
      status: 'ok',
      docs: 'Use /api routes for miniapp APIs',
    };
  }
}
