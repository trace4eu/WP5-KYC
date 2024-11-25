import {  Module } from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "../../config/configuration.js";
import { TnTController } from "./tnt.controller.js";
import { TntService } from "./tnt.service.js";

import { EbsiModule } from "../ebsi/ebsi.module.js";


import { MongooseModule } from "@nestjs/mongoose";

import { CacheManagerOptions, CacheModule } from "@nestjs/cache-manager";

import { Bank, BanksSchema } from "../../shared/models/banks.model.js";
import { Event,EventsSchema } from "../../shared/models/events.model.js";

export const cacheConfig: CacheManagerOptions = {
  ttl: 0,
  max: 10_000,
};

@Module({
  imports: [
    ApiConfigModule,
   
    // DataStoreModule,
     EbsiModule,
    // LogsModule,
   
    MongooseModule.forFeature([
   
      { name: Bank.name, schema: BanksSchema},
      { name: Event.name, schema: EventsSchema},
   
    ]),
    CacheModule.register(cacheConfig),
    
  ],
  controllers: [TnTController],
  providers: [ConfigService, TntService],
  exports: [TntService],
})
export class TnTModule {}

export default TnTModule;
