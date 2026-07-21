import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VocabularyService } from './vocabulary.service';

/**
 * The composer's pickers (EPIC-C §5). Behind the gates like the rest of the forum —
 * the vocabulary isn't secret, but there's no reason to serve it to anyone who can't post.
 *
 * Two controllers' worth of routes in one class isn't possible with a single `@Controller`
 * prefix, so the paths are declared absolute-ish here: the class takes no prefix and each
 * route names itself.
 */
@Controller()
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class VocabularyController {
  constructor(private readonly vocabulary: VocabularyService) {}

  @Get('categories')
  categories() {
    return this.vocabulary.listCategories();
  }

  @Get('tags')
  tags() {
    return this.vocabulary.listTags();
  }
}
