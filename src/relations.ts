import { InvalidOperation } from '@spinajs/exceptions';
import { IRelationDescriptor, IModelDescrtiptor, IBuilderMiddleware, RelationType } from './interfaces';
import { NewInstance, DI } from '@spinajs/di';
import { SelectQueryBuilder } from './builders';
import { extractModelDescriptor, ModelBase } from './model';
import { Orm } from './orm';

export interface IOrmRelation {
    execute(callback?: (this: SelectQueryBuilder, relation: OrmRelation) => void): void;
}

export abstract class OrmRelation implements IOrmRelation {

    protected _targetModel: Constructor<ModelBase<any>>;
    protected _targetModelDescriptor: IModelDescrtiptor;
    protected _relationQuery: SelectQueryBuilder;

    get Alias(): string {
        return this.parentRelation !== undefined ? `$${this.parentRelation.Alias}$${this._description.Name}$` : `$${this._description.Name}$`;
    }

    constructor(protected _orm: Orm, protected _query: SelectQueryBuilder<any>, protected _description: IRelationDescriptor, protected parentRelation?: OrmRelation) {
        this._targetModel = this._orm.Models.find(m => m.name === this._description.TargetModel.name)?.type ?? undefined;

        if (this._targetModel === undefined) {
            throw new InvalidOperation(`model ${this._description.TargetModel} not exists in orm module`);
        }

        this._targetModelDescriptor = extractModelDescriptor(this._targetModel);

        const orm = DI.get<Orm>(Orm);
        const driver = orm.Connections.get(this._targetModelDescriptor.Connection);

        const cnt = driver.Container;
        this._relationQuery = cnt.resolve<SelectQueryBuilder>(SelectQueryBuilder, [driver, this._targetModel, this]);

        if (driver.Options.Database) {
            this._relationQuery.schema(driver.Options.Database);
        }
    }

    public abstract execute(callback?: (this: SelectQueryBuilder, relation: OrmRelation) => void): void;
}

class HasManyRelationMiddleware implements IBuilderMiddleware {

    constructor(protected _relationQuery: SelectQueryBuilder, protected _description: IRelationDescriptor) {

    }

    public afterData(data: any[]): any[] {
        return data;

    }

    public async  afterHydration(data: Array<ModelBase<any>>): Promise<any[]> {

        const self = this;
        const pks = data.map(d => (d as any)[this._description.PrimaryKey]);
        const hydrateMiddleware = {
            afterData(data: any[]) { return data; },
            async afterHydration(relationData: Array<ModelBase<any>>) {

                data.forEach(d => {
                    (d as any)[self._description.Name] = relationData.filter(rd => (rd as any)[self._description.ForeignKey] === (d as any)[self._description.PrimaryKey]);
                })

            }
        }

        this._relationQuery.whereIn(this._description.ForeignKey, pks);
        this._relationQuery.middleware(hydrateMiddleware)
        return await this._relationQuery;
    }
}

class HasManyToManyRelationMiddleware implements IBuilderMiddleware {

    constructor(protected _relationQuery: SelectQueryBuilder, protected _description: IRelationDescriptor) {

    }

    public afterData(data: any[]): any[] {
        return data;

    }

    public async  afterHydration(data: Array<ModelBase<any>>): Promise<any[]> {

        const self = this;
        const pks = data.map(d => (d as any)[this._description.PrimaryKey]);
        const hydrateMiddleware = {
            afterData(data: any[]) { return data; },
            async afterHydration(relationData: Array<ModelBase<any>>) {

                data.forEach(d => {
                    (d as any)[self._description.Name] = relationData.filter(rd => (rd as any)[self._description.ForeignKey] === (d as any)[self._description.PrimaryKey]);
                })

            }
        }

        this._relationQuery.whereIn(this._description.ForeignKey, pks);
        this._relationQuery.middleware(hydrateMiddleware)
        return await this._relationQuery;
    }
}

class BelongsToRelationResultTransformMiddleware implements IBuilderMiddleware {
    public afterData(data: any[]): any[] {

        return data.map(d => {

            const transformedData = Object.assign(d);
            for (const key in transformedData) {
                if (key.startsWith('$')) {
                    this.setDeep(transformedData, key.replace(/\$+/g, '').split("."), d[key]);
                    delete transformedData[key];
                }
            }

            return transformedData;

        });
    }

    // tslint:disable-next-line: no-empty
    public async afterHydration(_data: Array<ModelBase<any>>) {
    }

    /**
     * Dynamically sets a deeply nested value in an object.
     * Optionally "bores" a path to it if its undefined.
     * @function
     * @param {!object} obj  - The object which contains the value you want to change/set.
     * @param {!array} path  - The array representation of path to the value you want to change/set.
     * @param {!mixed} value - The value you want to set it to.
     * @param {boolean} setrecursively - If true, will set value of non-existing path as well.
     */
    protected setDeep(obj: any, path: any[], value: any, setrecursively = true) {
        path.reduce((a, b, level) => {
            if (setrecursively && typeof a[b] === "undefined" && level !== path.length - 1) {
                a[b] = {};
                return a[b];
            }

            if (level === path.length - 1) {
                a[b] = value;
                return value;
            }
            return a[b];
        }, obj);
    }

}


@NewInstance()
export class BelongsToRelation extends OrmRelation {

    protected _targetModel: Constructor<ModelBase<any>>;
    protected _targetModelDescriptor: IModelDescrtiptor;
    protected _relationQuery: SelectQueryBuilder;

    constructor(_orm: Orm, _query: SelectQueryBuilder<any>, _description: IRelationDescriptor, _parentRelation?: OrmRelation) {
        super(_orm, _query, _description, _parentRelation);

        this._relationQuery.from(this._targetModelDescriptor.TableName, this.Alias);
        this._relationQuery.columns(this._targetModelDescriptor.Columns.map((c) => {
            return `${this.Alias}.${c.Name}`;
        }));

    }

    public execute(callback: (this: SelectQueryBuilder, relation: OrmRelation) => void) {

        this._query.leftJoin(this._targetModelDescriptor.TableName, this.Alias, this._description.ForeignKey, `${this._description.PrimaryKey}`);

        if (callback) {
            callback.call(this._relationQuery, [this]);
        }

        this._query.mergeStatements(this._relationQuery);
        this._query.middleware(new BelongsToRelationResultTransformMiddleware());
    }

}

@NewInstance()
export class OneToManyRelation extends OrmRelation {

    constructor(_orm: Orm, _query: SelectQueryBuilder<any>, _description: IRelationDescriptor, _parentRelation?: OrmRelation) {
        super(_orm, _query, _description, _parentRelation);

        this._relationQuery.from(this._targetModelDescriptor.TableName);
        this._relationQuery.columns(this._targetModelDescriptor.Columns.map((c) => {
            return c.Name;
        }));

    }

    public execute(callback?: (this: SelectQueryBuilder<any>, relation: OrmRelation) => void): void {

        if (callback) {
            callback.call(this._relationQuery, [this]);
        }

        this._query.middleware(new HasManyRelationMiddleware(this._relationQuery, this._description));

    }

}

@NewInstance()
export class ManyToManyRelation extends OrmRelation {

    protected _joinModel: Constructor<ModelBase<any>>;
    protected _joinModelDescriptor: IModelDescrtiptor;
    protected _joinQuery: SelectQueryBuilder;

    public get TableJoinQuery() {
        return this._joinQuery;
    }

    public get RelationQuery() {
        return this._relationQuery;
    }

    constructor(_orm: Orm, _query: SelectQueryBuilder<any>, _description: IRelationDescriptor, _parentRelation?: OrmRelation) {
        super(_orm, _query, _description, _parentRelation);

        this._joinModel = this._orm.Models.find(m => m.name === this._description.JunctionModel?.name)?.type ?? undefined;

        if (this._joinModel === undefined) {
            throw new InvalidOperation(`model ${this._description.JunctionModel} not exists in orm module`);
        }

        this._joinModelDescriptor = extractModelDescriptor(this._joinModel);

        const orm = DI.get<Orm>(Orm);
        const driver = orm.Connections.get(this._targetModelDescriptor.Connection);

        const cnt = driver.Container;
        this._joinQuery = cnt.resolve<SelectQueryBuilder>(SelectQueryBuilder, [driver, this._targetModel, this]);

        if (driver.Options.Database) {
            this._joinQuery.schema(driver.Options.Database);
        }

        this._joinQuery.from(this._joinModelDescriptor.TableName);
        this._joinQuery.columns(this._joinModelDescriptor.Columns.map((c) => {
            return c.Name;
        }));

        this._relationQuery.from(this._targetModelDescriptor.TableName, this.Alias);
        this._relationQuery.columns(this._targetModelDescriptor.Columns.map((c) => {
            return `${this.Alias}.${c.Name}`;
        }));
    }

    public execute(callback?: (this: SelectQueryBuilder<any>, relation: OrmRelation) => void): void {

        this._relationQuery.leftJoin(this._targetModelDescriptor.TableName, this.Alias, this._description.JunctionModelTargetModelFKey_Name, `${this._description.ForeignKey}`);

        if (callback) {
            callback.call(this._joinQuery, [this]);
        }

        const joinRelationDescriptor = { 
            Name: this._description.Name,
            Type: RelationType.Many,
            TargetModel: this._description.JunctionModel,
            SourceModel: this._description.SourceModel,
            ForeignKey: this._description.JunctionModelSourceModelFKey_Name,
            PrimaryKey: this._description.PrimaryKey
        }

        this._joinQuery.mergeStatements(this._relationQuery);

        this._query.middleware(new HasManyToManyRelationMiddleware(this._joinQuery, joinRelationDescriptor));
    }
}