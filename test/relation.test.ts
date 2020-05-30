import { NonDbPropertyHydrator, DbPropertyHydrator, ModelHydrator } from './../src/hydrators';
import { Model1 } from './mocks/models/Model1';
import { MODEL_DESCTRIPTION_SYMBOL } from './../src/decorators';
import { Configuration } from "@spinajs/configuration";
import { DI } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { FakeSqliteDriver, FakeSelectQueryCompiler, FakeDeleteQueryCompiler, FakeInsertQueryCompiler, FakeUpdateQueryCompiler, ConnectionConf, FakeMysqlDriver } from "./misc";
import { SelectQueryCompiler, DeleteQueryCompiler, UpdateQueryCompiler, InsertQueryCompiler, RelationType } from '../src/interfaces';
import { SpinaJsDefaultLog, LogModule } from '@spinajs/log';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import { extractModelDescriptor } from "./../src/model";
import { RelationModel1 } from './mocks/models/RelationModel1';

const expect = chai.expect;
chai.use(chaiAsPromised);

 
describe("Orm relations tests", () => {

    beforeEach(() => {
        DI.register(ConnectionConf).as(Configuration);
        DI.register(SpinaJsDefaultLog).as(LogModule);
        DI.register(FakeSqliteDriver).as("sqlite");
        DI.register(FakeMysqlDriver).as("mysql");

        DI.register(FakeSelectQueryCompiler).as(SelectQueryCompiler);
        DI.register(FakeDeleteQueryCompiler).as(DeleteQueryCompiler);
        DI.register(FakeUpdateQueryCompiler).as(UpdateQueryCompiler);
        DI.register(FakeInsertQueryCompiler).as(InsertQueryCompiler);


        DI.register(DbPropertyHydrator).as(ModelHydrator);
        DI.register(NonDbPropertyHydrator).as(ModelHydrator);


        DI.resolve(LogModule);
    });

    afterEach(async () => {
        DI.clear();

        sinon.restore();
        (Model1 as any)[MODEL_DESCTRIPTION_SYMBOL].Columns = [] as any;
    });


    it("Belongs to relation decorator", async () => {


        const descriptor = extractModelDescriptor(RelationModel1);
        
        expect(descriptor.Relations.size).to.eq(1);
        expect(descriptor.Relations.has("Owner")).to.be.true;

        expect(descriptor.Relations.get("Owner")).to.include({
            Name: "Owner",
            Type: RelationType.One,
            PrimaryKey: "Id",
            ForeignKey: "OwnerId"
        });

        const desc = descriptor.Relations.get("Owner");

        expect(desc.TargetModel.name).to.eq("RelationModel2");
        expect(desc.SourceModel.name).to.eq("RelationModel1");
    })

    it("Belongs to relation is executed", async () => {

            RelationModel1.where()

    })

    it("Belongs to nested relation is executed", async () => {

    })

    it("Belongs to relation result fetch", async () => {


    })

});