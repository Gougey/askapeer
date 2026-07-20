import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * EPIC-J (Administration & Platform Configuration), read side only for now. The
 * administrator-facing config surfaces (categories, tags, blocklist, settings) arrive
 * with S13; this module exists from S3 because the access gate needs to read a setting.
 */
@Module({
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
