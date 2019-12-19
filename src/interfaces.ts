import { RawQuery } from './builders';
import { SORT_ORDER, WhereBoolean } from './enums';
import { IQueryStatement } from './statements';
import { WhereFunction } from './types';
import { ResolveStrategy, IContainer } from '@spinajs/di';

/**
 * Configuration optiosn to set in configuration file and used in OrmDriver
 */
export interface IDriverOptions {

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
}

export abstract class OrmDriver extends ResolveStrategy {

    /**
     * Connection options
     */
    public Options: IDriverOptions;

    public Container: IContainer;

    constructor(container: IContainer, options: IDriverOptions) {
        super();

        this.Options = options;
        this.Container = container;
    }

    /**
     * Executes query on database
     * 
     * @param stmt query string or query objects that is executed in database
     * @param params binding parameters
     */
    public abstract execute(stmt: string | object, params?: any[]): Promise<any[] | any>;

    /**
     * Checks if database is avaible
     * @returns false if cannot reach database
     */
    public abstract ping(): Promise<boolean>;

    /**
     * Connects to database
     * @throws {OrmException} if can't connec to to database
     */
    public abstract connect(): Promise<void>;

    /**
     * Disconnects from database
     */
    public abstract disconnect(): Promise<void>;

    public abstract tableInfo(name: string, schema?: string): Promise<IColumnDescriptor[]>;

    public abstract resolve(container: IContainer): void;
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
    from(table: string, alias?: string) : this;
}

export interface ILimitBuilder {
    take(count: number): this;
    skip(count: number): this;
    first(): this;
    firstOrFail(): this;
    getLimits(): IQueryLimit;
}

export interface IOrderByBuilder {
    orderBy(column: string): this;
    orderByDescending(column: string): this;
    getSort(): ISort;
}

export interface IColumnsBuilder {
    clearColumns(): this;
    columns(names: string[]): this;
    getColumns(): IQueryStatement[];
    select(column: string | RawQuery, alias? : string): this;
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

export interface ISelectQueryBuilder extends IColumnsBuilder, IOrderByBuilder, ILimitBuilder, IWhereBuilder {
    min(column: string, as?: string): this;
    max(column: string, as?: string): this;
    count(column: string, as?: string): this;
    sum(column: string, as?: string): this;
    avg(column: string, as?: string): this;
    distinct(): this;
}

export interface ICompilerOutput {
    expression: string;
    bindings: any[];
}

export interface IQueryCompiler {
    compile(): ICompilerOutput
}

export interface IOrderByCompiler {
    sort(builder: IOrderByBuilder): ICompilerOutput;
}

export interface ILimitCompiler {
    limit(builder: ILimitBuilder): ICompilerOutput;
}

export interface IColumnsCompiler {
    columns(builder: IColumnsBuilder): ICompilerOutput;
}

export interface IWhereCompiler {
    where(builder: IWhereBuilder): ICompilerOutput;
}


/**
 *  Definitions of query compiler are needed for DI resolving
 * ==========================================================
 */

export abstract class SelectQueryCompiler implements IQueryCompiler {
    public abstract compile(): ICompilerOutput;
}

export abstract class DeleteQueryCompiler implements IQueryCompiler {
    public abstract compile(): ICompilerOutput;
}

export abstract class UpdateQueryCompiler implements IQueryCompiler {
    public abstract compile(): ICompilerOutput;
}

export abstract class InsertQueryCompiler implements IQueryCompiler {
    public abstract compile(): ICompilerOutput;
}

export abstract class TableQueryCompiler implements IQueryCompiler {
    public abstract compile(): ICompilerOutput;
}

export declare abstract class ColumnQueryCompiler implements IQueryCompiler {
    public abstract compile(): ICompilerOutput;
}


/**
 * ==========================================================
 */