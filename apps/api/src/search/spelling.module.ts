import { Module } from '@nestjs/common';
import { SpellingService } from './spelling.service';

/**
 * Spelling correction, shared by the forum search and the research feed. Its own module
 * because neither owns it: the dictionary is drawn from the literature, but the forum is the
 * other half of its use, and importing one epic's module into another for it would be wrong.
 */
@Module({
  providers: [SpellingService],
  exports: [SpellingService],
})
export class SpellingModule {}
