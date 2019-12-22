import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { Orm } from '../src/orm';
import { FakeSqliteDriver, FakeSelectQueryCompiler, FakeDeleteQueryCompiler, FakeUpdateQueryCompiler, FakeInsertQueryCompiler, ConnectionConf, FakeMysqlDriver } from "./misc";
import sinon from 'sinon';
import { SpinaJsDefaultLog, LogModule } from "@spinajs/log";
import { SelectQueryCompiler, DeleteQueryCompiler, UpdateQueryCompiler, InsertQueryCompiler, PropertyHydrator, ModelHydrator, OrmMigration, Migration } from "../src";
import { Migration1 } from "./mocks/migrations/Migration1";


const expect = chai.expect;

async function db() {
    return await DI.resolve(Orm);
}


describe("Orm migrations", () => {


    beforeEach(() => {
        DI.register(ConnectionConf).as(Configuration);
        DI.register(SpinaJsDefaultLog).as(LogModule);
        DI.register(FakeSqliteDriver).as("sqlite");
        DI.register(FakeMysqlDriver).as("mysql");

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
        expect(orm.Migrations[0].type.name).to.eq("Migration1");
    })

    it("ORM should run migration by name", async () => {

        const orm = await db();

        const up = sinon.stub(Migration1.prototype, "up");
        await orm.migrateUp("Migration1");

        expect(up.calledOnceWith(orm.Connections.get("sqlite")));
    })

    it("ORM should run all migrations", async () => {
        // @ts-ignore
        const orm = await db();

        const up = sinon.stub(Migration1.prototype, "up");
        await orm.migrateUp();

        expect(up.calledOnceWith(orm.Connections.get("sqlite")));
    })

    it("Should register model programatically", async () => {
        @Migration("sqlite")
        // @ts-ignore
        class Test extends OrmMigration {

        }

        class FakeOrm extends Orm {
            constructor() {
                super();

                this.registerMigration(Test);
            }
        }

        const container = DI.child();
        container.register(FakeOrm).as(Orm);

        const orm = await container.resolve(Orm);
        const migrations = await orm.Migrations;

        expect(migrations.find(m => m.name === "Test.registered")).to.be.not.null;

    })
});