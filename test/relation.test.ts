import { ManyToManyRelation } from './../src/relations';
import { NonDbPropertyHydrator, DbPropertyHydrator, ModelHydrator, OneToOneRelationHydrator, JunctionModelPropertyHydrator } from './../src/hydrators';
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
import { BelongsToRelation, OneToManyRelation } from '../src/relations';
import { Orm } from '../src/orm';
import { RelationModel2 } from './mocks/models/RelationModel2';
import { Model4 } from './mocks/models/Model4';

const expect = chai.expect;
chai.use(chaiAsPromised);

async function db() {
    return await DI.resolve(Orm);
}


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
        DI.register(OneToOneRelationHydrator).as(ModelHydrator);
        DI.register(JunctionModelPropertyHydrator).as(ModelHydrator);

        DI.resolve(LogModule);
        DI.resolve<Orm>(Orm);

        const tableInfoStub = sinon.stub(FakeSqliteDriver.prototype, "tableInfo");

        tableInfoStub.withArgs("TestTableRelation1", undefined).returns(new Promise(res => {
            res([{
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "Id",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            }, {
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: false,
                AutoIncrement: false,
                Name: "OwnerId",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            },
            {
                Type: "VARCHAR",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "VARCHAR",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "Property1",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            }]);
        }));

        tableInfoStub.withArgs("TestTableRelation2", undefined).returns(new Promise(res => {
            res([{
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "Id",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            }, {
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: false,
                AutoIncrement: false,
                Name: "OwnerId",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            },
            {
                Type: "VARCHAR",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "VARCHAR",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "Property2",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            }]);
        }));
        tableInfoStub.withArgs("TestTable1", undefined).returns(new Promise(res => {
            res([{
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "RelId2",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            }]);
        }));
        tableInfoStub.withArgs("JunctionTable", undefined).returns(new Promise(res => {
            res([{
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "Id",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            },
            {
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "model4_id",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            },
            {
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "model5_id",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            }]);
        }));
        tableInfoStub.withArgs("TestTable5", undefined).returns(new Promise(res => {
            res([{
                Type: "INT",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "INT",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "Id",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            },
            {
                Type: "VARCHAR",
                MaxLength: 0,
                Comment: "",
                DefaultValue: null,
                NativeType: "VARCHAR",
                Unsigned: false,
                Nullable: true,
                PrimaryKey: true,
                AutoIncrement: true,
                Name: "Property5",
                Converter: null,
                Schema: "sqlite",
                Unique: false
            }]);
        }));
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

    it("HasMany relation decorator", async () => {


        const descriptor = extractModelDescriptor(RelationModel2);

        expect(descriptor.Relations.size).to.eq(2);
        expect(descriptor.Relations.has("Many")).to.be.true;

        expect(descriptor.Relations.get("Many")).to.include({
            Name: "Many",
            Type: RelationType.Many,
            PrimaryKey: "Id",
            ForeignKey: "RelId2"
        });

        const desc = descriptor.Relations.get("Many");

        expect(desc.TargetModel.name).to.eq("Model1");
        expect(desc.SourceModel.name).to.eq("RelationModel2");
    })

    it("Belongs to relation is executed", async () => {

        await db();
        const callback = sinon.spy(BelongsToRelation.prototype, "execute");

        const query = RelationModel1.where({ Id: 1 }).populate("Owner", function () {
            this.where("Property2", "test");
        });

        expect(callback.calledOnce).to.be.true;
        expect(query).to.be.not.null;

        callback.restore();

    })

    it("Belongs to nested relation is executed", async () => {

        await db();
        const callback = sinon.spy(BelongsToRelation.prototype, "execute");

        const query = RelationModel1.where({ Id: 1 }).populate("Owner", function () {
            this.where("Property2", "test");
            this.populate("Owner");
        });

        expect(callback.calledTwice).to.be.true;
        expect(query).to.be.not.null;

        callback.restore();

    })

    it("OneToOneRelationHydrator is working", async () => {
        await db();

        sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([{
                Id: 1,
                Property1: "property1",
                OwnerId: 2,
                '$Owner$.Id': 2,
                '$Owner$.Property2': "property2",
                '$Owner$.OwnerId': 3,
                '$Owner$.$Owner$.Id': 3,
                '$Owner$.$Owner$.Bar': "bar",
            }]);
        }));


        const result = await RelationModel1.where({ Id: 1 }).populate("Owner", function () {
            this.populate("Owner");
        }).first<RelationModel1>();

        expect(result).to.be.not.null;
        expect(result.Owner).to.be.not.null;
        expect(result.Owner.Owner).to.be.not.null;

        expect(result.Owner instanceof RelationModel2).to.be.true;
        expect(result.Owner.Owner instanceof Model1).to.be.true;

    })

    it("OneToOneRelation should be dehydrated", async () => {

        await db();

        sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([{
                Id: 1,
                Property1: "property1",
                OwnerId: 2,
                '$Owner$.Id': 2,
                '$Owner$.Property2': "property2",
                '$Owner$.OwnerId': 3,
                '$Owner$.$Owner$.Id': 3,
                '$Owner$.$Owner$.Bar': "bar",
            }]);
        }));

        const result = await RelationModel1.where({ Id: 1 }).populate("Owner").first<RelationModel1>();
        const dehydrated = result.dehydrate() as any;

        expect(dehydrated).to.be.not.null;
        expect(dehydrated.OwnerId).to.eq(2);
    })

    it("HasMany relation should be executed", async () => {

        await db();

        sinon.stub(FakeSqliteDriver.prototype, "execute").onFirstCall().returns(new Promise((res) => {
            res([{
                Id: 1,
                Property2: "property2",
            }]);
        })).onSecondCall().returns(new Promise((res) => {
            res([{
                Id: 1,
                RelId2: 1
            },
            {
                Id: 2,
                RelId2: 1
            }]);
        }));



        const callback = sinon.spy(OneToManyRelation.prototype, "execute");
        const query = RelationModel2.where({ Id: 1 }).populate("Many").first<RelationModel2>();

        expect(callback.calledOnce).to.be.true;
        expect(query).to.be.not.null;

        const result = await query;

        expect(result).to.be.not.null;
        expect(result.Many.length).to.eq(2);

        callback.restore();
    })

    it("HasMany relation with belongsToRelation should be executed", async () => {

        await db();

        sinon.stub(FakeSqliteDriver.prototype, "execute").onFirstCall().returns(new Promise((res) => {
            res([{
                Id: 1,
                Property2: "property2",
            }]);
        })).onSecondCall().returns(new Promise((res) => {
            res([{
                Id: 1,
                RelId2: 1,
                '$Owner$.Id': 2,
                '$Owner$.Property4': "property1",
            },
            {
                Id: 2,
                RelId2: 1,
                '$Owner$.Id': 2,
                '$Owner$.Property4': "property1",
            }]);
        }));



        const callback = sinon.spy(OneToManyRelation.prototype, "execute");
        const query = RelationModel2.where({ Id: 1 }).populate("Many", function () {
            this.populate("Owner");
        }).first<RelationModel2>();
 
        const result = await query;
 
        expect(result.Many[0].Owner).to.be.not.null;
        expect(result.Many[1].Owner).to.be.not.null;

        callback.restore();

    })

    it("HasManyToMany relation should be executed", async () => {

        await db();

        sinon.stub(FakeSqliteDriver.prototype, "execute").onFirstCall().returns(new Promise((res) => {
            res([{
                Id: 1,
                Property4: "property4",
            }]);
        })).onSecondCall().returns(new Promise((res) => {
            res([{
                Id: 1,
                model4_id: 1,
                model5_id: 2,
                JoinProperty: "joinProp1",
                '$ForeignModel$.Property5': "prop5",
                '$ForeignModel$.Id': 2,

            },
            {
                Id: 2,
                model4_id: 1,
                model5_id: 3,
                JoinProperty: "joinProp2",
                '$ForeignModel$.Property5': "prop5",
                '$ForeignModel$.Id': 3,
            }]);
        }));



        const callback = sinon.spy(ManyToManyRelation.prototype, "execute");
        const query = Model4.where({ Id: 1 }).populate("ManyOwners").first<Model4>();

        expect(callback.calledOnce).to.be.true;
        expect(query).to.be.not.null;

        const result = await query;

        expect(result).to.be.not.null;
        expect(result.ManyOwners.length).to.eq(2);

        callback.restore();
    })

});