import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { Orm } from '../src/orm';
import { dir, FakeSqliteDriver, FakeSelectQueryCompiler, FakeDeleteQueryCompiler, FakeUpdateQueryCompiler, FakeInsertQueryCompiler } from "./misc";
import sinon from 'sinon';
import { SpinaJsDefaultLog, LogModule } from "@spinajs/log";
import { SelectQueryCompiler, DeleteQueryCompiler, UpdateQueryCompiler, InsertQueryCompiler, PropertyHydrator, ModelHydrator } from "../src";
import { Migration1 } from "./mocks/migrations/Migration1";


const expect = chai.expect;

async function db() {
    return await DI.resolve(Orm);
}

export class ConnectionConf extends Configuration {

    protected conf = {
        system: {
            dirs: {
                migrations: [dir("./mocks/migrations")],
            }
        },
        db: {
            connections: [
                {
                    Driver: "sqlite",
                    Filename: "foo.sqlite",
                    Name: "sqlite"
                },
            ]
        }
    }

    public get(path: string[], defaultValue?: any): any {
        return _.get(this.conf, path, defaultValue);
    }
}

describe("Orm migrations", () => {


    beforeEach(() => {
        DI.register(ConnectionConf).as(Configuration);
        DI.register(SpinaJsDefaultLog).as(LogModule);
        DI.register(FakeSqliteDriver).as("sqlite");
        DI.register(FakeSelectQueryCompiler).as(SelectQueryCompiler);
        DI.register(FakeDeleteQueryCompiler).as(DeleteQueryCompiler);
        DI.register(FakeUpdateQueryCompiler).as(UpdateQueryCompiler);
        DI.register(FakeInsertQueryCompiler).as(InsertQueryCompiler);


        DI.register(PropertyHydrator).as(ModelHydrator);


        DI.resolve(LogModule);
    });

    afterEach(async () => {
        DI.clear();

        sinon.restore();
    });


    it("ORM should load migrations", async () => {
        // @ts-ignore
        const orm = await db();

        expect(orm.Migrations).to.be.an("array").with.length(1);
        expect(orm.Migrations[0]).instanceOf(Migration1)
    })

    it("ORM should run migration by name", async () => {
        // @ts-ignore
        const orm = await db();

        const up = sinon.stub(Migration1.prototype, "up");
        await orm.migrateUp("Migration1");

        expect(up.calledOnceWith(orm.Connections.get("sqlite")));
    })

    it("ORM should run all migrations", async () => {
    })
});