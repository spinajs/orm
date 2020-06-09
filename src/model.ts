import { DiscriminationMapMiddleware, OrmRelation } from './relations';
import { MODEL_DESCTRIPTION_SYMBOL } from './decorators';
import { IModelDescrtiptor, RelationType } from './interfaces';
import { WhereFunction } from './types';
import {
  RawQuery,
  UpdateQueryBuilder,
  QueryBuilder,
  SelectQueryBuilder,
  DeleteQueryBuilder,
  InsertQueryBuilder,
} from './builders';
import { WhereOperators } from './enums';
import { DI } from '@spinajs/di';
import { Orm } from './orm';
import { ModelHydrator } from './hydrators';
import * as _ from 'lodash';
import { InvalidOperation } from '@spinajs/exceptions';

export function extractModelDescriptor(target: any): IModelDescrtiptor {
  const descriptor: any = {};

  _reduce(target);
  return descriptor;

  function _reduce(t: any) {
    if (!t) {
      return;
    }

    if (t[MODEL_DESCTRIPTION_SYMBOL]) {
      _.mergeWith(descriptor, t[MODEL_DESCTRIPTION_SYMBOL], (a: any, b: any) => {
        if (!a) {
          return b;
        }

        if (Array.isArray(a)) {
          return a.concat(b);
        }

        return a;
      });
    }

    _reduce(t.prototype);
    _reduce(t.__proto__);
  }
}

export abstract class ModelBase<T> {
  /**
   * Gets descriptor for this model. It contains information about relations, orm driver, connection properties,
   * db table attached, column information and others.
   */
  public get ModelDescriptor() {
    return extractModelDescriptor(this.constructor);
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

  /**
   * Get all data from db
   */
  public static all<T>(_page?: number, _perPage?: number): SelectQueryBuilder<T> {
    throw Error('Not implemented');
  }

  /**
   * Inserts data to DB
   *
   * @param _data data to insert
   */
  public static insert<T extends ModelBase<T>>(_data: T | object): InsertQueryBuilder {
    throw Error('Not implemented');
  }

  /**
   * Inserts multiple data at once to DB
   *
   * @param _data data to insert
   */
  public static insertBulk<T extends ModelBase<T>>(_data: T[] | object[]): Promise<void> {
    throw Error('Not implemented');
  }

  /**
   * Search entities in db
   *
   * @param column column to search or function
   * @param operator boolean operator
   * @param value value to compare
   *
   * @returns {SelectQueryBuilder} fluent query builder to add more conditions if needed
   */
  public static where<T>(
    _column: string | boolean | WhereFunction | RawQuery | {},
    _operator?: WhereOperators | any,
    _value?: any,
  ): SelectQueryBuilder<T> {
    throw Error('Not implemented');
  }

  /**
   * Updates single or multiple records at once with provided value based on condition
   *
   * @param _data data to set
   */
  public static update(_data: object): UpdateQueryBuilder {
    throw Error('Not implemented');
  }

  public static find<T>(pks: any[]): Promise<T[]>;
  public static find<T>(pks: any): Promise<T>;
  // @ts-ignore
  public static find<T>(pks: any | any[]): Promise<T> {
    throw Error('Not implemented');
  }

  /**
   * Finds model by specified pk
   *
   * @param _pk pk to find
   */
  public static findOrFail<T>(_pk: any): Promise<T> {
    throw Error('Not implemented');
  }

  /**
   * Creates raw query on this model. used for quering db for partial data or to perform some kind of operations
   * that dont need full ORM model to involve
   */
  public static query<T>(): SelectQueryBuilder<T> {
    throw Error('Not implemented');
  }

  /**
   *
   * Checks if model with pk key / unique fields exists and if not creates one and saves to db
   * NOTE: it checks for unique fields too.
   *
   * @param {any} data - model width data to check
   */
  public static firstOrCreate<T>(_pk: any, _data?: any): Promise<T> {
    throw Error('Not implemented');
  }

  /**
   * Creates new model & saves is to db
   *
   * @param {any} data - initial model data
   */
  public static create<T>(_data?: any): Promise<T> {
    throw Error('Not implemented');
  }

  /**
   *
   * Checks if model with pk key or unique fields exists and if not creates one AND NOT save in db
   * NOTE: it checks for unique fields constraint
   *
   * @param {any} data - model to check
   */
  public static firstOrNew<T>(_data?: any): Promise<T> {
    throw Error('Not implemented');
  }

  /**
   * Deletes model from db
   *
   * @param pk
   */
  public static destroy(_pk: any | any[]): Promise<void> {
    throw Error('Not implemented');
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

  /**
   * Extracts all data from model. It takes only properties that exists in DB
   */
  public dehydrate() {
    const obj = {};

    this.ModelDescriptor.Columns?.forEach(c => {
      const val = (this as any)[c.Name];
      (obj as any)[c.Name] = c.Converter ? c.Converter.toDB(val) : val;
    });

    for (const [, val] of this.ModelDescriptor.Relations) {
      if (val.Type === RelationType.One) {
        if ((this as any)[val.Name]) {
          (obj as any)[val.ForeignKey] = (this as any)[val.Name].PrimaryKeyValue;
        }
      }
    }

    return obj;
  }

  /**
   * deletes enitt from db. If model have SoftDelete decorator, model is marked as deleted
   */
  public async destroy() {
    if (!this.PrimaryKeyValue) {
      return;
    }
    await (this.constructor as any).destroy(this.PrimaryKeyValue);
  }

  /**
   * Loads or reloads model relation ( if relations was not loaded already with initial query)
   * 
   * @param relation relation to load
   */
  public async populate(relation: string, callback?: (this: SelectQueryBuilder<this>, relation: OrmRelation) => void) {

    if (!this.ModelDescriptor.Relations.has(relation)) {
      throw new InvalidOperation(`relation ${relation} not exists on model ${this.constructor.name}`);
    }

    const relDesc = this.ModelDescriptor.Relations.get(relation);

    /**
     * Do little cheat - we construct query that loads initial model with given relation.
     * Then we only assign relation property. 
     * 
     * TODO: create only relation query without loading its owner.
     */
    const result = await (this.constructor as any).where(this.PrimaryKeyName, this.PrimaryKeyValue).populate(relation, callback).firstOrFail();


    if (result) {
      (this as any)[relDesc.Name] = result[relDesc.Name];
    }
  }

  /**
   * Save all changes to db. It creates new entry id db or updates existing one if
   * primary key exists
   */
  public async save(ignoreOnDuplicate: boolean = false) {
    if (this.PrimaryKeyValue) {
      const { query } = _createQuery(this.constructor, UpdateQueryBuilder);

      if (this.ModelDescriptor.Timestamps.UpdatedAt) {
        (this as any)[this.ModelDescriptor.Timestamps.UpdatedAt] = new Date();
      }

      await query.update(this.dehydrate()).where(this.PrimaryKeyName, this.PrimaryKeyValue);
    } else {
      const { query } = _createQuery(this.constructor, InsertQueryBuilder);

      if (ignoreOnDuplicate) {
        query.ignore();
      }

      const id = await query.values(this.dehydrate());

      // ignore fired, we dont have insert ID
      if (ignoreOnDuplicate && (id as any) === 0) {

        const { query, description } = _createQuery(this.constructor, SelectQueryBuilder, false);
        const idRes = await query.columns([this.PrimaryKeyName]).where(function () {
          description.Columns.filter(c => c.Unique).forEach(c => {
            this.where(c.Name, (this as any)[c.Name]);
          });
        }).first();

        this.PrimaryKeyValue = (idRes as any)[this.PrimaryKeyName];


      } else {
        this.PrimaryKeyValue = id;
      }


    }
  }

  /**
   * Gets model data from database and returns as fresh instance.
   */
  public async fresh(): Promise<T> {
    return (this.constructor as any).find(this.PrimaryKeyValue);
  }

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

    for (const [, rel] of this.ModelDescriptor.Relations) {
      if (rel.Type === RelationType.Many || rel.Type === RelationType.ManyToMany) {
        (this as any)[rel.Name] = [];
      } else {
        (this as any)[rel.Name] = null;
      }
    }
  }
}

function _descriptor(model: Class<any>) {
  return (model as any)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;
}

function _createQuery<T extends QueryBuilder>(model: Class<any>, query: Class<T>, injectModel: boolean = true) {
  const dsc = _descriptor(model);

  if (!dsc) {
    throw new Error(`model ${model.name} does not have model descriptor. Use @model decorator on class`);
  }

  const orm = DI.get<Orm>(Orm);
  const driver = orm.Connections.get(dsc.Connection);

  if (!driver) {
    throw new Error(
      `model ${model.name} have invalid connection ${dsc.Connection}, please check your db config file or model connection name`,
    );
  }

  const cnt = driver.Container;
  const qr = cnt.resolve<T>(query, [driver, injectModel ? model : null]);

  qr.middleware(new DiscriminationMapMiddleware(dsc));
  qr.setTable(dsc.TableName);

  if (driver.Options.Database) {
    qr.schema(driver.Options.Database);
  }

  return {
    query: qr,
    description: dsc,
    model,
  };
}

export const MODEL_STATIC_MIXINS = {

  query(): SelectQueryBuilder {

    const { query } = _createQuery(this as any, SelectQueryBuilder, false);
    return query;

  },

  where(
    column: string | boolean | WhereFunction | RawQuery | {},
    operator?: WhereOperators | any,
    value?: any,
  ): SelectQueryBuilder {
    const { query } = _createQuery(this as any, SelectQueryBuilder);
    query.select("*");

    return query.where(column, operator, value);
  },

  update(data: object): UpdateQueryBuilder {
    const { query } = _createQuery(this as any, UpdateQueryBuilder);
    return query.update(data);
  },

  all(page: number, perPage: number): SelectQueryBuilder {
    const { query } = _createQuery(this as any, SelectQueryBuilder);

    if (page >= 0 && perPage > 0) {
      query.take(perPage).skip(page * perPage);
    }

    return query;
  },

  insertBulk<T>(data: Array<ModelBase<T> | object>) {
    const { query } = _createQuery(this, InsertQueryBuilder);

    return query.values(
      data.map(d => {
        if (d instanceof ModelBase) {
          return d.dehydrate();
        }

        return d;
      }),
    );
  },

  /**
   * Try to insert new value
   */
  insert<T>(data: ModelBase<T> | object) {
    const { query } = _createQuery(this, InsertQueryBuilder);

    if (data instanceof ModelBase) {
      query.values(data.dehydrate());
    } else {
      query.values(data);
    }

    return query;
  },

  async find(pks: any | any[]): Promise<any> {
    const { query, description } = _createQuery(this as any, SelectQueryBuilder);
    const pkey = description.PrimaryKey;
    query.select("*");

    return (await Array.isArray(pks)) ? query.whereIn(pkey, pks) : query.where(pkey, pks).first();
  },

  async findOrFail<T>(pks: any | any[]): Promise<T | T[]> {
    const { query, description } = _createQuery(this as any, SelectQueryBuilder);
    const pkey = description.PrimaryKey;
    const middleware = {
      afterData(data: any[]) {
        if (data.length !== pks.length) {
          throw new Error(`could not find all of pkeys in model ${this.model.name}`);
        }

        return data;
      },

      modelCreation(_: any): ModelBase<any> { return null; },

      // tslint:disable-next-line: no-empty
      async afterHydration(_data: Array<ModelBase<any>>) { }
    }

    query.select("*");

    if (Array.isArray(pks)) {
      query.whereIn(pkey, pks);
      query.middleware(middleware);

      return await query;
    } else {
      return await query.where(pkey, pks).firstOrFail<T>();
    }
  },

  async destroy(pks: any | any[]): Promise<void> {
    const description = _descriptor(this as any);

    if (description.SoftDelete?.DeletedAt) {
      const data = Array.isArray(pks) ? pks : [pks];
      const { query } = _createQuery(this as any, UpdateQueryBuilder);
      await query
        .whereIn(
          description.PrimaryKey,
          data.map(d => d.PrimaryKeyValue),
        )
        .update({
          [description.SoftDelete.DeletedAt]: new Date(),
        });
    } else {
      const { query } = _createQuery(this as any, DeleteQueryBuilder);
      await query.whereIn(description.PrimaryKey, Array.isArray(pks) ? pks : [pks]);
    }
  },

  async create(data?: any): Promise<any> {
    const entity = new (Function.prototype.bind.apply(this))(data);
    await (entity as ModelBase<any>).save();
    return entity;
  },

  async firstOrCreate(data?: any): Promise<any> {
    const { query, description } = _createQuery(this as any, SelectQueryBuilder);

    // pk constrain
    if (data[description.PrimaryKey]) {
      query.where(description.PrimaryKey, data[description.PrimaryKey]);
    }

    // check for all unique columns ( unique constrain )
    description.UniqueColumns.forEach(u => {
      query.orWhere(u, data[u]);
    });

    let entity = (await query.first()) as any;

    if (!entity) {
      entity = new (Function.prototype.bind.apply(this))(data);
      await (entity as ModelBase<any>).save();
      return entity;
    }

    return entity;
  },

  async firstOrNew(data?: any): Promise<any> {
    const { query, description } = _createQuery(this as any, SelectQueryBuilder);

    // pk constrain
    if (data[description.PrimaryKey]) {
      query.where(description.PrimaryKey, data[description.PrimaryKey]);
    }

    // check for all unique columns ( unique constrain )
    description.UniqueColumns.forEach(u => {
      query.orWhere(u, data[u]);
    });

    let entity = (await query.first()) as any;

    if (!entity) {
      entity = new (Function.prototype.bind.apply(this))(data);
      return entity;
    }

    return entity;
  },
};
