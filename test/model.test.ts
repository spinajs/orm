import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { Orm } from '../src/orm';
import { dir } from "./misc";
 

const expect = chai.expect;


async function db() {
    return await DI.resolve(Orm);
}

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

describe("Models test", () => {

    beforeEach(() => {
        DI.register(OrmConf).as(Configuration);
    });

    afterEach(async () => {
        DI.clear();
    });

    it("Load models from dirs", async () => {

        const orm = await db();
        const models = await orm.Models;

        expect(models.length).to.eq(2);
        expect(models[0].name).to.eq("Model1");
        expect(models[1].name).to.eq("Model2");
    })

    it("Models should have set properties", async () => {

        const orm = await db();
        const models = await orm.Models;

        expect(models.length).to.eq(2);
        expect(models[0].name).to.eq("Model1");
        expect(models[1].name).to.eq("Model2");

     
    })


});