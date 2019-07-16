import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as _ from "lodash";
import 'mocha';
import { dir } from "./misc";
// import { Orm } from '../src/orm';
 

export class OrmConf extends Configuration {

    private conf = {
        system: {
            dirs: {
                models: [dir("./mocks/models")],
            }
        },
 
    }
 
    public get(path: string[], defaultValue?: any): any {
        return _.get(this.conf, path, defaultValue);
    }
}

// async function db() {
//     return DI.resolve<Orm>(Orm);
// }

describe("Models test", () => {

    beforeEach(() => {
        DI.register(OrmConf).as(Configuration);
    });

    afterEach(async ()=>{
        DI.clear();
    });
    
    it("Load models from dirs", async () => {

        // const orm = await db();
        // const models = await orm.Models;

        // chai.expect(models.length).to.eq(2);
    })

});