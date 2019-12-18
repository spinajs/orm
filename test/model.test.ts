import { PropertyHydrator, ModelHydrator } from './../src/hydrators';
import { ModelNoConnection } from './mocks/models/ModelNoConnection';
import { ModelNoDescription } from './mocks/models/ModelNoDescription';
import { SelectQueryBuilder, QueryBuilder } from './../src/builders';
import { Model1 } from './mocks/models/Model1';
import { MODEL_DESCTRIPTION_SYMBOL } from './../src/decorators';
import { Configuration } from "@spinajs/configuration";
import { DI, Inject, Container } from "@spinajs/di";
import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import { Orm } from '../src/orm';
import { dir } from "./misc";
import { IModelDescrtiptor, OrmDriver, SelectQueryCompiler, ICompilerOutput, DeleteQueryCompiler, UpdateQueryCompiler, InsertQueryCompiler, IColumnDescriptor } from '../src/interfaces';
import { SpinaJsDefaultLog, LogModule } from '@spinajs/log';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import { RawModel } from './mocks/models/RawModel';

const expect = chai.expect;
chai.use(chaiAsPromised);


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
        db: {
            connections: [
                {
                    Driver: "sqlite",
                    Filename: ":memory",
                    Name: "sqlite"
                },
            ]
        }


    }

    public get(path: string[], defaultValue?: any): any {
        return _.get(this.conf, path, defaultValue);
    }
}

@Inject(Container)
// @ts-ignore
class FakeSqliteDriver extends OrmDriver {

    public async execute(_stmt: string | object, _params?: any[]): Promise<any[] | any> {
        return true;
    }

    public async ping(): Promise<void> {
    }

    public async connect(): Promise<void> {

    }

    public disconnect(): void {
    }

    public tableInfo(_table : string, _schema : string) : Promise<IColumnDescriptor[]>{
        return null;
    }
}

class FakeSelectQueryCompiler extends SelectQueryCompiler {

    public compile(): ICompilerOutput {
        return null;
    }

}

class FakeDeleteQueryCompiler extends DeleteQueryCompiler {

    public compile(): ICompilerOutput {
        return null;
    }

}

class FakeInsertQueryCompiler extends InsertQueryCompiler {

    public compile(): ICompilerOutput {
        return null;
    }

}

class FakeUpdateQueryCompiler extends UpdateQueryCompiler {

    // @ts-ignore
    constructor(private _builder: QueryBuilder) {
        super()
    }

    public compile(): ICompilerOutput {
        return null;
    }

}

describe("General model tests", () => {

    beforeEach(() => {
        DI.register(ModelConf).as(Configuration);
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

    it("Load models from dirs", async () => {

        const orm = await db();
        const models = await orm.Models;

        expect(models.length).to.eq(5);
        expect(models[0].name).to.eq("Model1");
        expect(models[1].name).to.eq("Model2");
        expect(models[0].type.name).to.eq("Model1");
        expect(models[1].type.name).to.eq("Model2");
    })

    it("Models should have added mixins", async () => {
        // @ts-ignore
        const orm = await db();

        expect(Model1.all).to.be.an("function");
        expect(Model1.destroy).to.be.an("function");
        expect(Model1.find).to.be.an("function");
        expect(Model1.findOrFail).to.be.an("function");
        expect(Model1.firstOrCreate).to.be.an("function");
        expect(Model1.firstOrNew).to.be.an("function");
        expect(Model1.where).to.be.an("function");
    })

    it("Model should throw if no description", async () => {
        // @ts-ignore
        const orm = await db();

        expect(() => {
            ModelNoDescription.where(1, 1);
        }).to.throw("model ModelNoDescription does not have model descriptor. Use @model decorator on class");
    })

    it("Model should throw if invalid connection", async () => {
        // @ts-ignore
        const orm = await db();

        expect(() => {
            ModelNoConnection.where(1, 1);
        }).to.throw("model ModelNoConnection have invalid connection SampleConnectionNotExists, please check your db config file or model connection name");
    })


    it("Where mixin should work", async () => {
        // @ts-ignore
        const orm = await db();

        let query = Model1.where("id", 1);
        expect(query instanceof SelectQueryBuilder).to.be.true;
        expect(query.Statements).to.be.an("array").with.length(1).to.deep.include.members([{
            _column: "id",
            _operator: "=",
            _value: 1
        }]);

        query = Model1.where("id", ">", 1);
        expect(query instanceof SelectQueryBuilder).to.be.true;
        expect(query.Statements).to.be.an("array").with.length(1).to.deep.include.members([{
            _column: "id",
            _operator: ">",
            _value: 1
        }]);
    })

    it("All mixin should work", async () => {
        // @ts-ignore
        const orm = await db();

        const compile = sinon.stub(FakeSelectQueryCompiler.prototype, "compile").returns({
            expression: "SELECT * FROM model1",
            bindings: []
        });

        const execute = sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([{
                a: 1
            }]);
        }));

        const result = await Model1.all<Model1>();

        expect(compile.calledOnce).to.be.true;
        expect(execute.calledOnceWith("SELECT * FROM model1", [])).to.be.true;
        expect(result).to.be.an("array").with.length(1);
        expect(result[0]).instanceOf(Model1);

    })

    it("Find mixin should work for single val", async () => {
        // @ts-ignore
        const orm = await db();

        const compile = sinon.stub(FakeSelectQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        const execute = sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([{
                a: 1
            }]);
        }));

        const result = await Model1.find<Model1>(1);

        expect(compile.calledOnce).to.be.true;
        expect(execute.calledOnce).to.be.true;
        expect(result).instanceof(Model1);
    })

    it("Find mixin should work for multiple vals", async () => {
        // @ts-ignore
        const orm = await db();

        const compile = sinon.stub(FakeSelectQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        const execute = sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([{
                a: 1
            }, {
                a: 1
            }]);
        }));

        const result = await Model1.find<Model1>([1, 2]);

        expect(compile.calledOnce).to.be.true;
        expect(execute.calledOnce).to.be.true;
        expect(result).to.be.an("array").with.length(2);
        expect(result[0]).instanceof(Model1);
    })


    it("FindOrFail mixin should work", async () => {

        // @ts-ignore
        const orm = await db();

        const compile = sinon.stub(FakeSelectQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        const execute = sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([{
                a: 1
            }]);
        }));

        const result = await Model1.findOrFail<Model1>(1);

        expect(compile.calledOnce).to.be.true;
        expect(execute.calledOnce).to.be.true;
        expect(result).instanceof(Model1);
    })

    it("FindOrFail mixin should fail", async () => {

        // @ts-ignore
        const orm = await db();

        sinon.stub(FakeSelectQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([]);
        }));

        expect(Model1.findOrFail<Model1>(1)).to.be.rejected;
    })

    it("destroy mixin should work", async () => {
        // @ts-ignore
        const orm = await db();

        sinon.stub(FakeDeleteQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        const execute = sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([]);
        }));

        await RawModel.destroy(1);
        expect(execute.calledOnce).to.be.true;
    })

    it("firstOrCreate mixin should work", async () => {
        // @ts-ignore
        const orm = await db();

        sinon.stub(FakeInsertQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        sinon.stub(FakeSelectQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });


        const execute = sinon.stub(FakeSqliteDriver.prototype, "execute").onCall(0).returns(new Promise((res) => {
            res([]);
        })).onCall(1).returns(new Promise((res) => {
            res([1]);
        }));

        const result = await Model1.firstOrCreate<Model1>(1);
        expect(execute.calledTwice).to.be.true;
        expect(result).to.be.not.null;
        expect(result).instanceOf(Model1);
        expect(result.PrimaryKeyValue).to.eq(1);
    })

    it("firstOrNew should work", async () => {
        // @ts-ignore
        const orm = await db();

        sinon.stub(FakeSelectQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        const execute = sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([]);
        }));

        const result = await Model1.firstOrNew<Model1>(1);
        expect(execute.calledOnce).to.be.true;
        expect(result).to.be.not.null;
        expect(result).instanceOf(Model1);
        expect(result.PrimaryKeyValue).to.be.undefined;
    })

    it("Model save should set updated_at", async () => {

        // @ts-ignore
        const orm = await db();

        sinon.stub(FakeUpdateQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([]);
        }));

        const model = new Model1();
        model.PrimaryKeyValue = 1;

        await model.save();

        expect(model.UpdatedAt).to.be.not.null;
    })

    it("destroy should update deleted_at", async () => {
        // @ts-ignore
        const orm = await db();

        const df = sinon.stub(FakeDeleteQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        const uf = sinon.stub(FakeUpdateQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        sinon.stub(FakeSqliteDriver.prototype, "execute").onCall(0).returns(new Promise((res) => {
            res([{ Id: 1 }]);
        })).onCall(1).returns(new Promise((res) => {
            res([1]);
        }));

        await Model1.destroy(1);

        expect(df.calledOnce).to.be.false;
        expect(uf.calledOnce).to.be.true;

    })

    it("Model save should update created_at", async () => {
        // @ts-ignore
        const orm = await db();

        sinon.stub(FakeInsertQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([]);
        }));

        const model = new Model1();
        await model.save();

        expect(model.CreatedAt).to.be.not.null;
    })

    it("Model delete should delete if no soft delete", async () => {
        // @ts-ignore
        const orm = await db();

        const del = sinon.stub(FakeDeleteQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([]);
        }));

        const model = new RawModel();
        model.PrimaryKeyValue = 1;

        await model.destroy();

        expect(del.calledOnce).to.be.true;
    })

    it("Model delete should soft delete", async () => {
        // @ts-ignore
        const orm = await db();

        const del = sinon.stub(FakeDeleteQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        const up = sinon.stub(FakeUpdateQueryCompiler.prototype, "compile").returns({
            expression: "",
            bindings: []
        });

        sinon.stub(FakeSqliteDriver.prototype, "execute").returns(new Promise((res) => {
            res([]);
        }));

        const model = new Model1();
        model.PrimaryKeyValue = 1;

        await model.destroy();

        expect(del.calledOnce).to.be.false;
        expect(up.calledOnce).to.be.true;
        expect(model.DeletedAt).to.be.not.null;


    })

    it("dehydrate should call converter if avaible", async () => {

    })

    it("hydrate should call converter if avaible", async () => {

    })

    it("TableQueryBuilder should have methods", () => {

    })

    it("Orm should load column info for models", async () => {

    })

    it("Models should have proper properties", async () => {

        const orm = await db();
        const models = await orm.Models;

        let toCheck = models[0];
        let descriptor = (toCheck.type)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;

        expect(descriptor).to.deep.include({
            Connection: "sqlite",
            TableName: "TestTable1",
            SoftDelete: {
                DeletedAt: "DeletedAt"
            },
            Archived: {
                ArchivedAt: "ArchivedAt"
            },
            Columns: null,
            Timestamps: {
                CreatedAt: "CreatedAt",
                UpdatedAt: "UpdatedAt"
            },
            PrimaryKey: "Id"
        });

        toCheck = models[1];
        descriptor = (toCheck.type)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;

        expect(descriptor).to.deep.include({
            Connection: "SampleConnection1",
            TableName: "TestTable2",
            SoftDelete: {
                DeletedAt: "DeletedAt"
            },
            Archived: {
                ArchivedAt: "ArchivedAt"
            },
            Columns: null,
            Timestamps: {
                CreatedAt: "CreatedAt",
                UpdatedAt: "UpdatedAt"
            },
            PrimaryKey: "Id"
        });

    })
});