import { InvalidOperation, InvalidArgument } from '@spinajs/exceptions';
import {
  IRelationDescriptor,
  IModelDescrtiptor,
  IBuilderMiddleware,
  RelationType,
  InsertBehaviour,
  ForwardRefFunction,
} from './interfaces';
import { NewInstance, DI } from '@spinajs/di';
import { SelectQueryBuilder, DeleteQueryBuilder } from './builders';
import { extractModelDescriptor, ModelBase } from './model';
import { Orm } from './orm';
import _ from 'lodash';

export interface IOrmRelation {
  execute(callback?: (this: SelectQueryBuilder, relation: OrmRelation) => void): void;
}

export abstract class OrmRelation implements IOrmRelation {
  protected _targetModel: Constructor<ModelBase> | ForwardRefFunction;
  protected _targetModelDescriptor: IModelDescrtiptor;
  protected _relationQuery: SelectQueryBuilder;

  get Alias(): string {
    return this.parentRelation
      ? `${this.parentRelation.Alias}.$${this._description.Name}$`
      : `$${this._description.Name}$`;
  }

  constructor(
    protected _orm: Orm,
    protected _query: SelectQueryBuilder<any>,
    public _description: IRelationDescriptor,
    public parentRelation?: OrmRelation,
  ) {
    this._targetModel = this._description.TargetModel ?? undefined;

    this._targetModelDescriptor = extractModelDescriptor(this._targetModel);

    const driver = this._orm.Connections.get(this._targetModelDescriptor.Connection);
    const cnt = driver.Container;
    this._relationQuery = cnt.resolve<SelectQueryBuilder>(SelectQueryBuilder, [driver, this._targetModel, this]);

    if (driver.Options.Database) {
      this._relationQuery.schema(driver.Options.Database);
    }
  }

  public abstract execute(callback?: (this: SelectQueryBuilder, relation: OrmRelation) => void): void;
}

class HasManyRelationMiddleware implements IBuilderMiddleware {
  constructor(protected _relationQuery: SelectQueryBuilder, protected _description: IRelationDescriptor, protected _path: string) { }

  public afterData(data: any[]): any[] {
    return data;
  }

  public modelCreation(_: any): ModelBase {
    return null;
  }

  public async afterHydration(data: ModelBase[]): Promise<any[]> {
    const self = this;
    const pks = data.map(d => {
      if (this._path) {
        return _.get((d as any), this._path)[this._description.PrimaryKey];
      } else {
        return (d as any)[this._description.PrimaryKey];
      }
    });
    const hydrateMiddleware = {
      afterData(data: any[]) {
        return data;
      },
      modelCreation(_: any): ModelBase {
        return null;
      },
      async afterHydration(relationData: ModelBase[]) {
        data.forEach(d => {
          const relData = relationData.filter(
            rd => {
              if (self._path) {
                return _.get((d as any), self._path)[self._description.PrimaryKey] === (rd as any)[self._description.ForeignKey];
              } else {
                return (rd as any)[self._description.ForeignKey] === (d as any)[self._description.PrimaryKey];
              }
            }
          );

          if (self._path) {
            _.get((d as any), self._path)[self._description.Name] = new OneToManyRelationList(
              d,
              self._description.TargetModel,
              self._description,
              relData,
            );
          } else {
            (d as any)[self._description.Name] = new OneToManyRelationList(
              d,
              self._description.TargetModel,
              self._description,
              relData,
            );
          }
          
        });
      },
    };

    if (pks.length !== 0) {
      this._relationQuery.whereIn(this._description.ForeignKey, pks);
      this._relationQuery.middleware(hydrateMiddleware);
      return await this._relationQuery;
    }

    return [];
  }
}

class BelongsToRelationRecursiveMiddleware implements IBuilderMiddleware {
  constructor(
    protected _relationQuery: SelectQueryBuilder,
    protected _description: IRelationDescriptor,
    protected _targetModelDescriptor: IModelDescrtiptor,
  ) { }

  public afterData(data: any[]): any[] {
    return data;
  }

  public modelCreation(_: any): ModelBase {
    return null;
  }

  public async afterHydration(data: ModelBase[]): Promise<any[]> {
    const self = this;
    const pks = data.map(d => (d as any)[this._description.PrimaryKey]);
    const hydrateMiddleware = {
      afterData(data: any[]) {
        return data;
      },
      modelCreation(_: any): ModelBase {
        return null;
      },
      async afterHydration(relationData: ModelBase[]) {
        const roots = relationData.filter(
          rd => (rd as any)[self._description.ForeignKey] === 0 || (rd as any)[self._description.ForeignKey] === null,
        );
        const leafs = roots.map(r => {
          return fillRecursive(r);

          function fillRecursive(parent: any): any {
            const child = relationData.find(
              rd => (rd as any)[self._description.ForeignKey] === parent[self._description.PrimaryKey],
            );
            if (!child) {
              return parent;
            }

            (child as any)[self._description.Name] = parent;
            return fillRecursive(child);
          }
        });

        data.forEach(d => {
          (d as any)[self._description.Name] = leafs.find(
            l => (l as any)[self._description.PrimaryKey] === (d as any)[self._description.PrimaryKey],
          )[self._description.Name];
        });
      },
    };

    this._relationQuery.whereIn(this._description.PrimaryKey, pks);
    this._relationQuery.middleware(new DiscriminationMapMiddleware(this._targetModelDescriptor));
    this._relationQuery.middleware(hydrateMiddleware);
    return await this._relationQuery;
  }
}

class HasManyToManyRelationMiddleware implements IBuilderMiddleware {
  constructor(
    protected _relationQuery: SelectQueryBuilder,
    protected _description: IRelationDescriptor,
    protected _targetModelDescriptor: IModelDescrtiptor,
  ) { }

  public afterData(data: any[]): any[] {
    return data;
  }

  public modelCreation(_: any): ModelBase {
    return null;
  }

  public async afterHydration(data: ModelBase[]): Promise<any[]> {
    const self = this;
    const pks = data.map(d => (d as any)[this._description.PrimaryKey]);
    const hydrateMiddleware = {
      afterData(data: any[]) {
        return data.map(d =>
          Object.assign({}, d[self._description.Name], { JunctionModel: self.pickProps(d, [self._description.Name]) }),
        );
      },
      modelCreation(_: any): ModelBase {
        return null;
      },
      async afterHydration(relationData: ModelBase[]) {
        data.forEach(d => {
          const relData = relationData.filter(
            rd => (rd as any).JunctionModel[self._description.ForeignKey] === (d as any)[self._description.PrimaryKey],
          );
          (d as any)[self._description.Name] = new OneToManyRelationList(
            d,
            self._description.TargetModel,
            self._description,
            relData,
          );
        });

        relationData.forEach(d => delete (d as any).JunctionModel);
      },
    };

    if (pks.length !== 0) {
      this._relationQuery.whereIn(this._description.ForeignKey, pks);
      this._relationQuery.middleware(new BelongsToRelationResultTransformMiddleware());
      this._relationQuery.middleware(new DiscriminationMapMiddleware(this._targetModelDescriptor));
      this._relationQuery.middleware(hydrateMiddleware);
      return await this._relationQuery;
    }

    return [];
  }

  private pickProps(source: any, except: string[]) {
    const obj: any = {};
    for (const p in source) {
      if (except.indexOf(p) === -1) {
        obj[p] = source[p];
      }
    }

    return obj;
  }
}

class BelongsToRelationResultTransformMiddleware implements IBuilderMiddleware {
  public afterData(data: any[]): any[] {
    return data.map(d => {
      const transformedData = Object.assign(d);
      for (const key in transformedData) {
        if (key.startsWith('$')) {
          this.setDeep(transformedData, this.keyTransform(key), d[key]);
          delete transformedData[key];
        }
      }

      return transformedData;
    });
  }

  public modelCreation(_: any): ModelBase {
    return null;
  }

  // tslint:disable-next-line: no-empty
  public async afterHydration(_data: Array<ModelBase>) { }

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
      if (setrecursively && typeof a[b] === 'undefined' && level !== path.length - 1) {
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

  protected keyTransform(key: string) {
    return key.replace(/\$+/g, '').split('.');
  }
}

class BelongsToRelationResultTransformOneToManyMiddleware extends BelongsToRelationResultTransformMiddleware {
  protected keyTransform(key: string) {
    return  key.replace(/\$+/g, '').split('.');
  }

}

export class DiscriminationMapMiddleware implements IBuilderMiddleware {
  constructor(protected _description: IModelDescrtiptor) { }

  public afterData(data: any[]): any[] {
    return data;
  }

  public modelCreation(data: any): ModelBase {
    if (this._description.DiscriminationMap && this._description.DiscriminationMap.Field) {
      const distValue = data[this._description.DiscriminationMap.Field];
      if (distValue && this._description.DiscriminationMap.Models.has(distValue)) {
        const result = new (this._description.DiscriminationMap.Models.get(distValue) as any)();
        result.hydrate(data);

        return result;
      }
    }

    return null;
  }

  // tslint:disable-next-line: no-empty
  public async afterHydration(_data: ModelBase[]) { }
}

@NewInstance()
export class BelongsToRelation extends OrmRelation {
  protected _targetModel: Constructor<ModelBase>;
  protected _targetModelDescriptor: IModelDescrtiptor;
  protected _relationQuery: SelectQueryBuilder;

  constructor(
    _orm: Orm,
    _query: SelectQueryBuilder<any>,
    _description: IRelationDescriptor,
    _parentRelation?: OrmRelation,
  ) {
    super(_orm, _query, _description, _parentRelation);

    this._relationQuery.from(this._targetModelDescriptor.TableName, this.Alias);
    this._targetModelDescriptor.Columns.forEach(c => {
      this._relationQuery.select(c.Name, `${this.Alias}.${c.Name}`);
    });
  }

  public execute(callback: (this: SelectQueryBuilder, relation: OrmRelation) => void) {

    if (!this.parentRelation && !this._query.TableAlias) {
      this._query.setAlias(`$${this._description.SourceModel.name}$`);
    }

    this._query.leftJoin(
      this._targetModelDescriptor.TableName,
      this.Alias,
      this._description.ForeignKey,
      `${this._description.PrimaryKey}`,
    );

    if (callback) {
      callback.call(this._relationQuery, [this]);
    }

    this._query.mergeStatements(this._relationQuery);

    if (!this.parentRelation) {

      // if we are on top of the belongsTo relation stack 
      // add transform middleware
      // we do this becouse belongsTo modifies query (not creating new like oneToMany and manyToMany)
      // and we only need to run transform once
      this._query.middleware(new BelongsToRelationResultTransformMiddleware());
    } else if (!this.parentRelation.parentRelation && this.parentRelation instanceof OneToManyRelation) {

      // if we called populate from OneToMany relation
      // we must use different path transform ( couse onetomany is separate query)
      // otherwise we would fill invalid property on entity
      this._query.middleware(new BelongsToRelationResultTransformOneToManyMiddleware());
    }
  }
}

@NewInstance()
export class BelongsToRecursiveRelation extends OrmRelation {
  protected _targetModel: Constructor<ModelBase>;
  protected _targetModelDescriptor: IModelDescrtiptor;
  protected _relationQuery: SelectQueryBuilder;

  constructor(
    _orm: Orm,
    _query: SelectQueryBuilder<any>,
    _description: IRelationDescriptor,
    _parentRelation?: OrmRelation,
  ) {
    super(_orm, _query, _description, _parentRelation);

    this._relationQuery
      .withRecursive(this._description.ForeignKey, this._description.PrimaryKey)
      .from(this._targetModelDescriptor.TableName, this.Alias);
    this._targetModelDescriptor.Columns.forEach(c => {
      this._relationQuery.select(c.Name, `${this.Alias}.${c.Name}`);
    });
  }

  public execute(callback: (this: SelectQueryBuilder, relation: OrmRelation) => void) {
    if (callback) {
      callback.call(this._relationQuery, [this]);
    }

    this._query.middleware(
      new BelongsToRelationRecursiveMiddleware(this._relationQuery, this._description, this._targetModelDescriptor),
    );
  }
}

@NewInstance()
export class OneToManyRelation extends OrmRelation {
  constructor(
    _orm: Orm,
    _query: SelectQueryBuilder<any>,
    _description: IRelationDescriptor,
    _parentRelation?: OrmRelation,
  ) {
    super(_orm, _query, _description, _parentRelation);

    this._relationQuery.from(this._targetModelDescriptor.TableName, this.Alias);
    this._relationQuery.columns(
      this._targetModelDescriptor.Columns.map(c => {
        return c.Name;
      }),
    );
  }

  public execute(callback?: (this: SelectQueryBuilder<any>, relation: OrmRelation) => void): void {

    if (!this.parentRelation && !this._query.TableAlias) {
      this._query.setAlias(`$${this._description.SourceModel.name}$`);
    }

    const path = [];
    let cur = this.parentRelation;
    while (cur && !(cur instanceof OneToManyRelation)) {
      path.push(cur._description.Name);
      cur = cur.parentRelation;
    }

    if (callback) {
      callback.call(this._relationQuery, [this]);
    }

    this._query.middleware(new DiscriminationMapMiddleware(this._targetModelDescriptor));
    this._query.middleware(new HasManyRelationMiddleware(this._relationQuery, this._description, path.join(".")));
  }
}

@NewInstance()
export class ManyToManyRelation extends OrmRelation {
  protected _joinModel: Constructor<ModelBase>;
  protected _joinModelDescriptor: IModelDescrtiptor;
  protected _joinQuery: SelectQueryBuilder;

  public get TableJoinQuery() {
    return this._joinQuery;
  }

  public get RelationQuery() {
    return this._relationQuery;
  }

  constructor(
    _orm: Orm,
    _query: SelectQueryBuilder<any>,
    _description: IRelationDescriptor,
    _parentRelation?: OrmRelation,
  ) {
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

    this._joinQuery.from(this._joinModelDescriptor.TableName, `$${this._joinModelDescriptor.TableName}$`);
    this._joinQuery.columns(
      this._joinModelDescriptor.Columns.map(c => {
        return c.Name;
      }),
    );

    this._relationQuery.from(this._targetModelDescriptor.TableName, this.Alias);
    this._targetModelDescriptor.Columns.forEach(c => {
      this._relationQuery.select(c.Name, `${this.Alias}.${c.Name}`);
    });
  }

  public execute(callback?: (this: SelectQueryBuilder<any>, relation: OrmRelation) => void): void {
    this._joinQuery.leftJoin(
      this._targetModelDescriptor.TableName,
      this.Alias,
      this._description.JunctionModelTargetModelFKey_Name,
      this._description.ForeignKey,
    );

    if (callback) {
      callback.call(this._relationQuery, [this]);
    }

    const joinRelationDescriptor = {
      Name: this._description.Name,
      Type: RelationType.Many,
      TargetModel: this._description.JunctionModel,
      SourceModel: this._description.SourceModel,
      ForeignKey: this._description.JunctionModelSourceModelFKey_Name,
      PrimaryKey: this._description.PrimaryKey,
      Recursive: false,
    };

    this._joinQuery.mergeStatements(this._relationQuery);

    this._query.middleware(
      new HasManyToManyRelationMiddleware(this._joinQuery, joinRelationDescriptor, this._targetModelDescriptor),
    );
  }
}

/**
 * Iterable list of populated relation entities
 *
 * It allows to add / remove objects to relation
 */
export abstract class Relation<R extends ModelBase> extends Array<R> {
  protected TargetModelDescriptor: IModelDescrtiptor;

  protected Orm: Orm;

  constructor(
    protected owner: ModelBase,
    protected model: Constructor<R> | ForwardRefFunction,
    protected Relation: IRelationDescriptor,
    objects?: R[],
  ) {
    super();

    if (objects) {
      this.push(...objects);
    }

    this.TargetModelDescriptor = extractModelDescriptor(model);
    this.Orm = DI.get(Orm);
  }

  /**
   * Removes from relation & deletes from db
   *
   * @param obj data to remove
   */
  public abstract async remove(obj: R | R[]): Promise<void>;

  /**
   *
   * Add to relation & saves to db
   *
   * @param obj data to add
   */
  public abstract async add(obj: R | R[], mode?: InsertBehaviour): Promise<void>;

  /**
   * Delete all objects from relation
   */
  public async clear(): Promise<void> {
    await this.remove(this);
  }

  /**
   * Populates this relation
   */
  public async populate(callback?: (this: SelectQueryBuilder<this>, relation: OrmRelation) => void): Promise<void> {
    /**
     * Do little cheat - we construct query that loads initial model with given relation.
     * Then we only assign relation property.
     *
     * TODO: create only relation query without loading its owner.
     */
    const result = await (this.owner.constructor as any)
      .where(this.owner.PrimaryKeyName, this.owner.PrimaryKeyValue)
      .populate(this.Relation.Name, callback)
      .firstOrFail();

    if (result) {
      this.splice(0, this.length);
      this.push(...result[this.Relation.Name]);
    }
  }
}

export class ManyToManyRelationList<T extends ModelBase> extends Relation<T> {
  public async remove(obj: T | T[]): Promise<void> {
    const self = this;
    const data = (Array.isArray(obj) ? obj : [obj]).map(d => (d as ModelBase).PrimaryKeyValue);
    const driver = this.Orm.Connections.get(this.TargetModelDescriptor.Connection);
    const jmodelDescriptor = extractModelDescriptor(this.Relation.JunctionModel);

    if (!driver) {
      throw new InvalidArgument(`connection ${this.TargetModelDescriptor.Connection} not exists`);
    }

    const query = driver.Container.resolve<DeleteQueryBuilder>(DeleteQueryBuilder, [
      driver,
      this.Relation.JunctionModel,
    ])
      .from(jmodelDescriptor.TableName)
      .where(function () {
        this.whereIn(self.Relation.JunctionModelTargetModelFKey_Name, data);
        this.andWhere(self.Relation.JunctionModelSourceModelFKey_Name, self.owner.PrimaryKeyValue);
      });

    await query;

    _.remove(this, o => data.indexOf(o.PrimaryKeyValue) !== -1);
  }

  public async add(obj: T | T[], mode?: InsertBehaviour): Promise<void> {
    const data = Array.isArray(obj) ? obj : [obj];
    const relEntities = data.map(d => {
      const relEntity = new this.Relation.JunctionModel();
      (relEntity as any)[this.Relation.JunctionModelSourceModelFKey_Name] = this.owner.PrimaryKeyValue;
      (relEntity as any)[this.Relation.JunctionModelTargetModelFKey_Name] = d.PrimaryKeyValue;

      return relEntity;
    });

    for (const m of relEntities) {
      await m.insert(mode);
    }

    this.push(...data);
  }
}

export class OneToManyRelationList<T extends ModelBase> extends Relation<T> {
  public async remove(obj: T | T[]): Promise<void> {
    const data = (Array.isArray(obj) ? obj : [obj]).map(d => (d as ModelBase).PrimaryKeyValue);
    const driver = this.Orm.Connections.get(this.TargetModelDescriptor.Connection);

    if (!driver) {
      throw new InvalidArgument(`connection ${this.TargetModelDescriptor.Connection} not exists`);
    }

    const query = driver.Container.resolve<DeleteQueryBuilder>(DeleteQueryBuilder, [
      driver,
      this.Relation.TargetModel,
    ]).whereIn(this.Relation.ForeignKey, data);
    await query;

    _.remove(this, o => data.indexOf(o.PrimaryKeyValue) !== -1);
  }

  public async add(obj: T | T[], mode?: InsertBehaviour): Promise<void> {
    const data = Array.isArray(obj) ? obj : [obj];
    data.forEach(d => {
      (d as any)[this.Relation.ForeignKey] = this.owner.PrimaryKeyValue;
    });

    for (const m of data) {
      await m.insert(mode);
    }

    this.push(...data);
  }
}
