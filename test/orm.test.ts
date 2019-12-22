import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { Orm } from '../src/orm';
import { ConnectionConf, FakeSqliteDriver, FakeMysqlDriver } from "./misc";
import sinon from 'sinon';
import { SpinaJsDefaultLog, LogModule } from "@spinajs/log";


const expect = chai.expect;

async function db() {
    return await DI.resolve(Orm);
}



describe("Orm general", () => {

    beforeEach(() => {
        DI.register(ConnectionConf).as(Configuration);
        DI.register(SpinaJsDefaultLog).as(LogModule);
        DI.register(FakeSqliteDriver).as("sqlite");
        DI.register(FakeMysqlDriver).as("mysql");


        DI.resolve(LogModule);
    });

    afterEach(async () => {
        sinon.restore();
        DI.clear();
    });


    it("ORM should create connections", async () => {

        const connect1 = sinon.stub(FakeSqliteDriver.prototype, "connect").returnsThis();
        const connect2 = sinon.stub(FakeMysqlDriver.prototype, "connect").returnsThis();

        // @ts-ignore
        const orm = await db();


        expect(connect1.calledOnce).to.be.true;
        expect(connect2.calledOnce).to.be.true;

        expect(orm.Connections).to.be.an("Map").that.have.length(2);
        expect(orm.Connections.get("main_connection")).to.be.not.null;
        expect(orm.Connections.get("sqlite")).to.be.not.null;
    })


});