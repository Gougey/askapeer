import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * 200 when every dependency is up, 503 when any is down — so an uptime check or a
   * Fly health check can act on it. Reporting `degraded` inside a 200 body would leave
   * this exactly as easy to overlook as it was before.
   */
  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.check();
    res.status(report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
