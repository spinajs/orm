import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { Orm } from '../src/orm';
import { dir } from "./misc";
import { OrmDriver } from '../src/driver';
import sinon from 'sinon';
import { SpinaJsDefaultLog, LogModule } from "@spinajs/log";


const expect = chai.expect;

async function db() {
    return await DI.resolve(Orm);
}

export class ConnectionConf extends Configuration {

    protected conf = {
        system: {
            dirs: {
                models: [dir("./mocks/models")],
            }
        },
        db: {
            connections: [
                {
                    Driver: "sqlite",
                    Filename: "foo.sqlite",
                    Name: "cache"
                },
                {
                    Driver: "mysql",
                    Database: "foo",
                    User: "root",
                    Password: "root",
                    Host: "localhost",
                    Port: 1234,
                    Name: "main_connection"
                }
            ]
        }
    }

    public get(path: string[], defaultValue?: any): any {
        return _.get(this.conf, path, defaultValue);
    }
}

describe("Orm general", () => {

    beforeEach(() => {
        DI.register(ConnectionConf).as(Configuration);
        DI.register(SpinaJsDefaultLog).as(LogModule);

        DI.resolve(LogModule);
    });

    afterEach(async () => {
        DI.clear();
    });


    it("ORM should create connections", async () => {

        const sqliteDriver = sinon.createStubInstance(OrmDriver);
        const mysqlDriver = sinon.createStubInstance(OrmDriver);

        sqliteDriver.connect = sinon.stub<any, any>().resolves();
        sqliteDriver.tableInfo = sinon.stub<any, any>().resolves();
        mysqlDriver.connect = sinon.stub<any, any>().resolves();
        mysqlDriver.tableInfo = sinon.stub<any, any>().resolves();
        mysqlDriver.resolve = sinon.stub<any, any>().resolves();



        DI.register(() => {
            return sqliteDriver;
        }).as("sqlite");

        DI.register(() => {
            return mysqlDriver;
        }).as("mysql");

        // @ts-ignore
        const orm = await db();


        expect(sqliteDriver.connect.calledOnce).to.be.true;
        expect(mysqlDriver.connect.calledOnce).to.be.true;

        expect(orm.Connections).to.be.an("Map").that.have.length(2);
        expect(orm.Connections.get("main_connection")).to.be.not.null;
        expect(orm.Connections.get("cache")).to.be.not.null;
    })


});