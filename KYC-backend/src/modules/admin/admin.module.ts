import {  Module } from "@nestjs/common";

import { DataStoreModule } from "../data-store/data-store.module.js";
import { TnTModule } from "../tnt/tnt.module.js";
import { ApiConfigModule } from "../../config/configuration.js";
import AdminController from "./admin.controller.js";
import AdminService from "./admin.service.js";
import { SharedVC, SharedVCSchema } from "../../shared/models/sharedvcs.model.js";
import { MongooseModule } from "@nestjs/mongoose";
import { UserModule } from "../users/user.module.js";
import { UserService } from "../users/user.service.js";
import { IssuedVC, IssuedVCSchema } from "../../shared/models/issuedvcs.model.js";
import { Product, ProductSchema } from "../../shared/models/products.model.js";
import { Bank, BanksSchema } from "../../shared/models/banks.model.js";
import { Event, EventsSchema } from "../../shared/models/events.model.js";


@Module({
  imports: [
    ApiConfigModule,
  
    DataStoreModule,
    TnTModule,
    MongooseModule.forFeature([
    
      { name: Product.name, schema: ProductSchema },
      { name: Bank.name, schema: BanksSchema },
      { name: Event.name, schema: EventsSchema },
     
    ]),
    UserModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

export default AdminModule;
