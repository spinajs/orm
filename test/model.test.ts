import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import 'mocha';
import { Orm } from '../src/orm';
import { OrmConf } from './orm.conf';


async function db() {
    return DI.resolve<Orm>(Orm);
}

describe("Models test", () => {

    beforeEach(() => {
        DI.register(OrmConf).as(Configuration);
    });

    afterEach(async ()=>{
        DI.clear();
    });
    
    it("Load models from dirs", async () => {

        const orm = await db();
        const models = await orm.Models;

        chai.expect(models.length).to.eq(2);
    })

});