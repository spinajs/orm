import { MODEL_DESCTRIPTION_SYMBOL } from './../src/decorators';
import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { Orm } from '../src/orm';
import { dir } from "./misc";
import { IModelDescrtiptor } from '../src/interfaces';


const expect = chai.expect;



async function db() {
    return await DI.resolve(Orm);
}

export class ModelConf extends Configuration {

    protected conf = {
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
 
describe("Find models test", () => {

    beforeEach(() => {
        DI.register(ModelConf).as(Configuration);
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
        expect(models[0].type.name).to.eq("Model1");
        expect(models[1].type.name).to.eq("Model2");
    })

    it("Models should have proper properties", async () => {

        const orm = await db();
        const models = await orm.Models;

        let toCheck = models[0];
        let descriptor = (toCheck.type)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;

        expect(descriptor).to.deep.include({
            Connection: "SampleConnection1",
            TableName: "TestTable1",
            SoftDelete: {
                DeletedAt: "DeletedAt"
            },
            Archived: {
                ArchivedAt: "ArchivedAt"
            },
            Columns: [],
            Timestamps: {
                CreatedAt: "CreatedAt",
                UpdatedAt: "UpdatedAt"
            },
            PrimaryKey: "Id"
        });

        toCheck = models[1];
        descriptor = (toCheck.type)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;

        expect(descriptor).to.deep.include({
            Connection: "SampleConnection2",
            TableName: "TestTable2",
            SoftDelete: {
                DeletedAt: "DeletedAt"
            },
            Archived: {
                ArchivedAt: "ArchivedAt"
            },
            Columns: [],
            Timestamps: {
                CreatedAt: "CreatedAt",
                UpdatedAt: "UpdatedAt"
            },
            PrimaryKey: "Id"
        });

    })
});