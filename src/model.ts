import { MODEL_DESCTRIPTION_SYMBOL } from "./decorators";
import { IModelDescrtiptor } from "./interfaces";
import { WhereFunction } from './types';
import { RawQuery, UpdateQueryBuilder, QueryBuilder, SelectQueryBuilder, DeleteQueryBuilder, InsertQueryBuilder } from './builders';
import { WhereOperators } from './enums';
import { DI } from '@spinajs/di';
import { Orm } from './orm';
import { ModelHydrator } from "./hydrators";

export abstract class ModelBase<T> {

    /**
     * Gets descriptor for this model. It contains information about relations, orm driver, connection properties,
     * db table attached, column information and others.
     */
    public get ModelDescriptor() {
        return (this.constructor as any)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;
    }

    public get PrimaryKeyName() {
        return this.ModelDescriptor.PrimaryKey;
    }

    public get PrimaryKeyValue() {
        return (this as any)[this.PrimaryKeyName];
    }

    public set PrimaryKeyValue(newVal: any) {
        (this as any)[this.PrimaryKeyName] = newVal;
    }

    public static async all<U>(): Promise<U[]> {
        throw Error("Not implemented");
    }

    // @ts-ignore
    public static where(column: string | boolean | WhereFunction | RawQuery | {}, operator?: WhereOperators | any, value?: any): SelectQueryBuilder {
        throw Error("Not implemented");
    }


    public static find<U>(pks: any[]): Promise<U[]>;
    public static find<U>(pks: any): Promise<U>;
    // @ts-ignore
    public static find<U>(pks: any | any[]): Promise<U | U[]> {
        throw Error("Not implemented");
    }

    // @ts-ignore
    public static findOrFail<U>(pk: any): Promise<U> {
        throw Error("Not implemented");
    }

    /**
     * 
     * Checks if model with pk key exists and if not creates one and saves to db
     * 
     * @param pk key to check
     */
    public static firstOrCreate<U>(_pk: any): Promise<U> {
        throw Error("Not implemented");
    }

    /**
     * 
     * Checks if model with pk key exists and if not creates one AND NOT save in db
     * 
     * @param pk key to check
     */
    public static firstOrNew<U>(_pk: any): Promise<U> {
        throw Error("Not implemented");
    }

    /**
     * Deletes model from db
     * 
     * @param pk 
     */
    public static destroy(_pk: any | any[]): Promise<void> {
        throw Error("Not implemented");
    }

    constructor(data?: any) {

        this.defaults();

        if (data) {
            this.hydrate(data);
        }

    }

    /**
     * Fills model with data. It only fills properties that exists in database
     * 
     * @param data data to fill
     */
    public hydrate(data: any) {
        DI.resolve(Array.ofType(ModelHydrator)).forEach(h => h.hydrate(this, data));
    }

    public dehydrate() {

        const obj = {};

        this.ModelDescriptor.Columns?.forEach(c => {
            const val = (this as any)[c.Name];
            (obj as any)[c.Name] = c.Converter ? c.Converter.toDB(val) : val;
        });

        return obj;
    }

    public async destroy() {

        if (!this.PrimaryKeyValue) {
            return;
        }
        await (this.constructor as any).destroy(this.PrimaryKeyValue);
    }

    public async save() {
        if (this.PrimaryKeyValue) {
            const { query } = _createQuery(this.constructor, UpdateQueryBuilder);
            await query.update(this.dehydrate()).where(this.PrimaryKeyName, this.PrimaryKeyValue);

        } else {

            const { query } = _createQuery(this.constructor, InsertQueryBuilder);
            const id = await query.values(this.dehydrate());

            if (this.ModelDescriptor.Timestamps.UpdatedAt) {
                (this as any)[this.ModelDescriptor.Timestamps.CreatedAt] = new Date();
            }

            this.PrimaryKeyValue = id[0];
        }
    }

    public async abstract fresh(): Promise<T>;

    /**
     * sets default values for model. values are taken from DB default column prop
     */
    protected defaults() {

        this.ModelDescriptor.Columns?.forEach(c => {
            (this as any)[c.Name] = c.DefaultValue;
        });

        if (this.ModelDescriptor.Timestamps.CreatedAt) {
            (this as any)[this.ModelDescriptor.Timestamps.CreatedAt] = new Date();
        }
    }


}

function _descriptor(model: Class<any>) {
    return (model as any)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;
}

function _createQuery<T extends QueryBuilder>(model: Class<any>, query: Class<T>) {

    const dsc = _descriptor(model);

    if (!dsc) {
        throw new Error(`model ${model.name} does not have model descriptor. Use @model decorator on class`)
    }

    const orm = DI.get<Orm>(Orm);
    const driver = orm.Connections.get(dsc.Connection);

    if (!driver) {
        throw new Error(`model ${model.name} have invalid connection ${dsc.Connection}, please check your db config file or model connection name`);
    }

    const cnt = driver.Container;
    const qr = cnt.resolve<T>(query, [driver, model]) as T;

    qr.setTable(dsc.TableName);

    if (driver.Options.Database) {
        qr.setSchema(driver.Options.Database);
    }

    return {
        query: qr,
        description: dsc,
        model
    };
}

export const MODEL_STATIC_MIXINS = {

    where(column: string | boolean | WhereFunction | RawQuery | {}, operator?: WhereOperators | any, value?: any): SelectQueryBuilder {
        const { query } = _createQuery(this as any, SelectQueryBuilder);
        return query.where(column, operator, value);
    },

    async all(): Promise<any[]> {
        const { query } = _createQuery(this as any, SelectQueryBuilder);
        return await query;
    },

    async find(pks: any | any[]): Promise<any> {


        const { query, description } = _createQuery(this as any, SelectQueryBuilder);
        const pkey = description.PrimaryKey;

        return await Array.isArray(pks) ? query.whereIn(pkey, pks) : query.where(pkey, pks).first();
    },

    async findOrFail(pks: any | any[]): Promise<any> {

        const { query, description, model } = _createQuery(this as any, SelectQueryBuilder);
        const pkey = description.PrimaryKey;

        if (Array.isArray(pks)) {
            const ar = await query.whereIn(pkey, pks);
            if (ar.length !== pks.length) {
                throw new Error(`could not find all of pkeys in model ${model.name}`)
            }

            return ar;
        }

        return await query.where(pkey, pks).firstOrFail();
    },

    async destroy(pks: any | any[]): Promise<void> {

        const description = _descriptor(this as any);

        if (description.SoftDelete?.DeletedAt) {
            const data = Array.isArray(pks) ? pks : [pks];
            const { query } = _createQuery(this as any, UpdateQueryBuilder);
            await query.whereIn(description.PrimaryKey, data.map(d => d.PrimaryKeyValue)).update({
                [description.SoftDelete.DeletedAt]: new Date()
            });

        } else {
            const { query } = _createQuery(this as any, DeleteQueryBuilder);
            await query.whereIn(description.PrimaryKey, Array.isArray(pks) ? pks : [pks]);
        }
    },

    async firstOrCreate(pk: any): Promise<any> {

        const { query, description } = _createQuery(this as any, SelectQueryBuilder);
        let entity = await query.where(description.PrimaryKey, pk).first() as any;

        if (!entity) {
            entity = new (Function.prototype.bind.apply(this))();
            await (entity as ModelBase<any>).save();
            return entity;
        }

        return entity;
    },

    async firstOrNew(pk: any): Promise<any> {

        const { query, description } = _createQuery(this as any, SelectQueryBuilder);
        let entity = await query.where(description.PrimaryKey, pk).first() as any;

        if (!entity) {
            entity = new (Function.prototype.bind.apply(this))();
            return entity;
        }

        return entity;
    },
}