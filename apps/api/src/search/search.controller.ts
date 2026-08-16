import { Body, Controller, Post } from '@nestjs/common';

import { searchPropertiesSchema, type SearchProperties, type Viewer } from '@ghar/shared';

import { CurrentViewer, Public } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /**
   * POST rather than GET: the filter object is nested (coordinates, arrays of
   * property types) and, more importantly, a buyer's location must never end
   * up in a URL query string, a server log or a Referer header.
   */
  @Public()
  @Post()
  async find(
    @Body(zodBody(searchPropertiesSchema)) input: SearchProperties,
    @CurrentViewer() viewer: Viewer,
  ) {
    return this.search.search(input, viewer);
  }
}
