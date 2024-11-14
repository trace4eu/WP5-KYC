import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from "cache-manager";


@Injectable()
export class CacheService {
 
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  getCache() : Cache {
    return this.cacheManager;
  }

  
}

export default CacheService;