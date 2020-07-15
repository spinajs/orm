import { RawQuery } from './builders';
import { SORT_ORDER, WhereBoolean } from './enums';
import { IQueryStatement } from './statements';
import { WhereFunction } from './types';
import { OrmDriver } from './driver';
import { NewInstance } from '@spinajs/di';
import { ModelBase } from './model';
import { MethodNotImplemented } from '@spinajs/exceptions';

export enum QueryContext {
  Insert,
  Select,
  Update,
  Delete,
  Schema,
  Transaction,
}

export enum InsertBehaviour {
  /**
   * On duplicate entry ignore & fetch only model primary key
   */
  OnDuplicateIgnore,

  /**
   * On duplicate update entry ( when unique constraint is hit update db from model data)
   */
  OnDuplicateUpdate,

  /**
   * Throw error if model hits constraint ( primary or unique keys )
   */
  None,
}

/**
 * Foreign key referential actions
 */
export enum ReferentialAction {
  Cascade = 'CASCADE',
  SetNull = 'SET NULL',
  Restrict = 'RESTRICT',
  NoAction = 'NO ACTION',
  SetDefault = 'SET DEFAULT',
}

/**
 * Transaction mode when migration DB
 */
export enum MigrationTransactionMode {
  /**
   * Migration is run whithout transaction
   */
  None,

  /**
   * On transaction for one migration - every migration has its own
   */
  PerMigration,
}

/**
 * Configuration options to set in configuration file and used in OrmDriver
 */
export interface IDriverOptions {
  /**
   * Max connections limit
   */
  PoolLimit: number;

  /**
   * Database name associated with this connection
   */
  Database?: string;

  /**
   * User associatet with this connection
   */
  User?: string;

  /**
   * Password to database
   */
  Password?: string;

  /**
   * DB Host
   */
  Host?: string;

  /**
   * Connection port
   */
  Port?: number;

  /**
   * Connection encoding eg. utf-8
   */
  Encoding?: string;

  /**
   * Database filename eg. for Sqlite driver
   */
  Filename?: string;

  /**
   * Driver name eg. mysql, sqlite, mssql etc.
   */
  Driver: string;

  /**
   * Connection name for identification
   */
  Name: string;

  /**
   * Additional driver-specific options
   */
  Options: any;

  Migration?: {
    /**
     * Migration table name, if not set default is spinajs_orm_migrations
     */
    Table?: string;

    /**
     * Migration transaction options
     */
    Transaction?: {
      /**
       * How to run migration - with or without transaction
       */
      Mode?: MigrationTransactionMode;
    };
  };

  DefaultConnection: boolean;

  /**
   * Debug queries sent to orm driver. It writes raw queries queries to log for debug purposes
   */
  Debug?: {
    Queries?: boolean;
  };
}

export interface IMigrationDescriptor {
  /**
   * Whitch connection migration will be executed
   */
  Connection: string;
}

/**
 * Describes model, used internally
 */
export interface IModelDescrtiptor {
  /**
   * Primary key name
   */
  PrimaryKey: string;

  /**
   * Connection name, must be avaible in db config
   */
  Connection: string;

  /**
   * Table name in database for this model
   */
  TableName: string;

  /**
   * Optional, describes timestamps in model
   */
  Timestamps: IModelTimestampDescriptor;

  /**
   * Optional, describes soft delete
   */
  SoftDelete: IModelSoftDeleteDescriptor;

  /**
   * Optional, is archive mode enabled
   */
  Archived: IModelArchivedDescriptor;

  /**
   * Column  / fields list in model
   */
  Columns: IColumnDescriptor[];

  /**
   * Converters attached to fields
   */
  Converters: Map<string, Constructor<ValueConverter>>;

  /**
   * List of unique columns ( UNIQUE constraint )
   */
  JunctionModelProperties: IJunctionProperty[];

  /**
   * List of relations in model
   */
  Relations: Map<string, IRelationDescriptor>;

  /** Name of model */
  Name: string;

  /**
   * Model discrimination map that  allows to create different models based on db field value
   */
  DiscriminationMap: IDiscriminationMap;

  /**
   * Orm driver that this model
   */
  Driver: OrmDriver;
}

export interface IDiscriminationMap {
  /**
   * DB field that holds inheritance value
   */
  Field: string;

  /**
   * Field values mapped for proper models
   */
  Models: Map<string, Constructor<ModelBase<any>>>;
}

export interface IDiscriminationEntry {
  Key: string;
  Value: Constructor<ModelBase<any>>;
}

export enum RelationType {
  One,
  Many,
  ManyToMany,
}

export type ForwardRefFunction = () => Constructor<ModelBase<any>>;

export interface IRelationDescriptor {
  /**
   * Name of relations, defaults for property name in model that owns relation
   */
  Name: string;

  /**
   * Is it one-to-one, one-to-many or many-to-many
   */
  Type: RelationType;

  /**
   * Relation model (  foreign )
   */
  TargetModel: Constructor<ModelBase<any>> | ForwardRefFunction;

  /**
   * Relation owner
   */
  SourceModel: Constructor<ModelBase<any>>;

  /**
   * Relation foreign key (one to one, one to many)
   */
  ForeignKey: string;

  /**
   * Relation primary key (one to one, one to many)
   */
  PrimaryKey: string;

  /**
   * Used in many to many relations, model for join table
   */
  JunctionModel?: Constructor<ModelBase<any>>;

  /**
   * Join table foreign keys, defaults to auto generated field names. Can be override.
   */
  JunctionModelTargetModelFKey_Name?: string;
  JunctionModelSourceModelFKey_Name?: string;

  /**
   * Is this relation recursive ? Used for hierarchical / paren one-to-one relations
   */
  Recursive: boolean;
}

export interface IJunctionProperty {
  Name: string;

  Model: Constructor<ModelBase<any>>;
}

/**
 * Table column description, used in models to build schema, validate & other stuff
 */
export interface IColumnDescriptor {
  /**
   * Columnt  type eg int, varchar, text
   */
  Type: string;

  /**
   * Max character lenght handled in column
   */
  MaxLength: number;

  /**
   * Column comment, use it for documentation purposes.
   */
  Comment: string;

  /**
   * Default column value
   */
  DefaultValue: any;

  /**
   * Full database type with size/length info & sign eg. int(10) unsigned if avaible
   */
  NativeType: string;

  /**
   * Numeric types sign
   */
  Unsigned: boolean;

  /**
   * Is column nullable (can be null)
   */
  Nullable: boolean;

  /**
   * Is column primary key
   */
  PrimaryKey: boolean;

  /**
   * Is column auto increment
   */
  AutoIncrement: boolean;

  /**
   * Column name
   */
  Name: string;

  /**
   * Value converter between database & model
   */
  Converter: IValueConverter;

  /**
   * JSON schema definition build for this column. Used to automate data validation
   */
  Schema: any;

  /**
   * Does have unique constraint
   */
  Unique: boolean;

  /**
   * Is uuid generated column
   */
  Uuid: boolean;

  // should be skipped when serializing to json
  Ignore: boolean;
}

/**
 * Value converter between model & database data types
 */
export interface IValueConverter {
  /**
   * Converts value to database type
   *
   * @param value - value to convert
   */
  toDB(value: any): any;

  /**
   * Converts value from database type eg. mysql timestamp to DateTime
   *
   * @param value - value to convert
   */
  fromDB(value: any): any;
}

/**
 * Model timestamps description
 */
export interface IModelTimestampDescriptor {
  /**
   * Created at column name
   */
  CreatedAt: string;

  /**
   * Updated at column name
   */
  UpdatedAt: string;
}

/**
 * Model soft delete description
 */
export interface IModelSoftDeleteDescriptor {
  /**
   * Deleted at column name
   */
  DeletedAt: string;
}

@NewInstance()
export abstract class OrmMigration {
  /**
   *
   * Migrate up - create tables, indices etc.
   * Be aware that model function are not avaible yet. To fill tables with
   * data use fill function
   *
   * @param connection
   */
  public abstract up(connection: OrmDriver): Promise<void>;

  /**
   * Migrate down - undo changes made in up
   * @param connection
   */
  public abstract down(connection: OrmDriver): Promise<void>;
}

/**
 * Model archived description
 */
export interface IModelArchivedDescriptor {
  /**
   * Archived at column name
   */
  ArchivedAt: string;
}

export interface IQueryLimit {
  limit?: number;
  offset?: number;
}

export interface ISort {
  column: string;
  order: SORT_ORDER;
}

export interface IQueryBuilder {
  Table: string;
  TableAlias: string;
  Schema: string;
  schema(schema: string): IQueryBuilder;
  from(table: string, alias?: string): this;
  setAlias(alias: string): this;
}

export interface ILimitBuilder {
  take(count: number): this;
  skip(count: number): this;
  first<T>(): Promise<T>;
  firstOrFail<T>(): Promise<T>;
  getLimits(): IQueryLimit;
}

export interface IOrderByBuilder {
  orderBy(column: string): this;
  orderByDescending(column: string): this;
  getSort(): ISort;
}

export interface IColumnsBuilder {
  /**
   * clears selected columns
   */
  clearColumns(): this;

  /**
   *
   * Select columns from db result ( multiple at once )
   *
   * @param names column names to select
   */
  columns(names: string[]): this;

  /**
   * Return selected columns in this query
   */
  getColumns(): IQueryStatement[];

  /**
   * Selects single column from DB result with optional alias
   * Can be used multiple times
   *
   * @param column column to select
   * @param alias column alias ( optional )
   */
  select(column: string, alias?: string): this;

  /**
   * Selects custom values from DB. eg. Count(*)
   *
   * @param rawQuery  raw query to be executed
   */
  select(rawQuery: RawQuery): this;

  /**
   * Selects multiple columns at once with aliases. Map key property is column name, value is its alias
   *
   * @param columns column list with aliases
   */
  // tslint:disable-next-line: unified-signatures
  select(columns: Map<string, string>): this;
}

export interface IWhereBuilder {
  Statements: IQueryStatement[];

  Op: WhereBoolean;

  where(column: string | boolean | {} | WhereFunction, operator?: any, value?: any): this;
  orWhere(column: string | boolean | {} | WhereFunction, operator?: any, value?: any): this;
  andWhere(column: string | boolean | {} | WhereFunction, operator?: any, value?: any): this;
  whereObject(obj: any): this;
  whereNotNull(column: string): this;
  whereNull(column: string): this;
  whereNot(column: string, val: any): this;
  whereIn(column: string, val: any[]): this;
  whereNotIn(column: string, val: any[]): this;
  whereExist(query: ISelectQueryBuilder): this;
  whereNotExists(query: ISelectQueryBuilder): this;
  whereBetween(column: string, val: any[]): this;
  whereNotBetween(column: string, val: any[]): this;
  whereInSet(column: string, val: any[]): this;
  whereNotInSet(column: string, val: any[]): this;
  clearWhere(): this;
}

export interface IWithRecursiveBuilder {
  CteRecursive: IQueryStatement;

  withRecursive(recKeyName: string, pkKeyName: string): this;
}

export interface IJoinBuilder {
  JoinStatements: IQueryStatement[];

  clearJoins(): this;

  innerJoin(query: RawQuery): this;
  innerJoin(table: string, foreignKey: string, primaryKey: string): this;
  // tslint:disable-next-line: unified-signatures
  innerJoin(table: string, tableAlias: string, foreignKey: string, primaryKey: string): this;

  leftJoin(query: RawQuery): this;
  leftJoin(table: string, foreignKey: string, primaryKey: string): this;

  // tslint:disable-next-line: unified-signatures
  leftJoin(table: string, tableAlias: string, foreignKey: string, primaryKey: string): this;

  leftOuterJoin(query: RawQuery): this;
  leftOuterJoin(table: string, foreignKey: string, primaryKey: string): this;
  // tslint:disable-next-line: unified-signatures
  leftOuterJoin(table: string, tableAlias: string, foreignKey: string, primaryKey: string): this;

  rightJoin(query: RawQuery): this;
  rightJoin(table: string, foreignKey: string, primaryKey: string): this;
  // tslint:disable-next-line: unified-signatures
  rightJoin(table: string, tableAlias: string, foreignKey: string, primaryKey: string): this;

  rightOuterJoin(query: RawQuery): this;
  rightOuterJoin(table: string, foreignKey: string, primaryKey: string): this;
  // tslint:disable-next-line: unified-signatures
  rightOuterJoin(table: string, tableAlias: string, foreignKey: string, primaryKey: string): this;

  fullOuterJoin(query: RawQuery): this;
  fullOuterJoin(table: string, foreignKey: string, primaryKey: string): this;
  // tslint:disable-next-line: unified-signatures
  fullOuterJoin(table: string, tableAlias: string, foreignKey: string, primaryKey: string): this;

  crossJoin(query: RawQuery): this;
  crossJoin(table: string, foreignKey: string, primaryKey: string): this;
  // tslint:disable-next-line: unified-signatures
  crossJoin(table: string, tableAlias: string, foreignKey: string, primaryKey: string): this;
}

export interface ISelectQueryBuilder
  extends IColumnsBuilder,
  IOrderByBuilder,
  ILimitBuilder,
  IWhereBuilder,
  IJoinBuilder,
  IWithRecursiveBuilder {
  min(column: string, as?: string): this;
  max(column: string, as?: string): this;
  count(column: string, as?: string): this;
  sum(column: string, as?: string): this;
  avg(column: string, as?: string): this;
  distinct(): this;
  clone(): this;
}

export interface ICompilerOutput {
  expression: string;
  bindings: any[];
}

export interface IQueryCompiler {
  compile(): ICompilerOutput;
}

export interface ILimitCompiler {
  limit(builder: ILimitBuilder): ICompilerOutput;
}

export interface IRecursiveCompiler {
  recursive(builder: IWithRecursiveBuilder): ICompilerOutput;
}

export interface IColumnsCompiler {
  columns(builder: IColumnsBuilder): ICompilerOutput;
}

export interface IWhereCompiler {
  where(builder: IWhereBuilder): ICompilerOutput;
}

export interface IJoinCompiler {
  join(builder: IJoinBuilder): ICompilerOutput;
}

/**
 *  Definitions of query compiler are needed for DI resolving
 * ==========================================================
 */
@NewInstance()
export abstract class RecursiveQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}
@NewInstance()
export abstract class SelectQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class JoinQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class IndexQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class ForeignKeyQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class DeleteQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class UpdateQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class InsertQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class OnDuplicateQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class TableQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class ColumnQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

@NewInstance()
export abstract class OrderByQueryCompiler implements IQueryCompiler {
  public abstract compile(): ICompilerOutput;
}

/**
 * ==========================================================
 */

/**
 * Middlewares for query builders
 */
export interface IBuilderMiddleware {
  /**
   *
   * Executed AFTER query is executed in DB and fetcher raw data
   * Use it to transform DB data before everything else
   *
   * @param data raw data fetched from DB
   */
  afterData(data: any[]): any[];

  /**
   * Executed when model is about to create. Use it to
   * override model creation logic. If null is returned, default model
   * is executed
   *
   * @param data raw data to create
   */
  modelCreation(data: any): ModelBase<any>;

  /**
   * executed after model was created ( all returned data by query is executed)
   *
   * @param data hydrated data. Models are created and hydrated with data
   */
  afterHydration(data: Array<ModelBase<any>>): Promise<any[] | void>;
}

export class ValueConverter implements IValueConverter {
  /**
   * Converts value to database type
   *
   * @param value - value to convert
   */
  public toDB(_value: any): any {
    throw new MethodNotImplemented();
  }

  /**
   * Converts value from database type eg. mysql timestamp to DateTime
   *
   * @param value - value to convert
   */
  public fromDB(_value: any): any {
    throw new MethodNotImplemented();
  }
}

/**
 * Converter for DATETIME field (eg. mysql datetime)
 */
export class DatetimeValueConverter extends ValueConverter { }

/**
 * Converter for set field (eg. mysql SET)
 */
export class SetValueConverter extends ValueConverter { }
