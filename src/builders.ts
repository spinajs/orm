import { Container, Inject, NewInstance } from "@spinajs/di";
import { ArgumentException, NotImplementedException } from "@spinajs/exceptions";
import * as _ from "lodash";
import { use } from "typescript-mix";
import { isBoolean, isFunction, isObject, isString } from 'util';
import { ColumnMethods, ColumnType, QueryMethod, SORT_ORDER, WhereBoolean, WhereOperators } from "./enums";
import { DeleteQueryCompiler, IColumnsBuilder, ICompilerOutput, ILimitBuilder, InsertQueryCompiler, IOrderByBuilder, IQueryBuilder, IQueryLimit, ISelectQueryBuilder, ISort, IWhereBuilder, OrmDriver, SelectQueryCompiler, TableQueryCompiler, UpdateQueryCompiler } from "./interfaces";
import { BetweenStatement, ColumnMethodStatement, ColumnStatement, ExistsQueryStatement, InSetStatement, InStatement, IQueryStatement, RawQueryStatement, WhereQueryStatement, WhereStatement } from "./statements";
import { WhereFunction } from "./types";


function isWhereOperator(val: any) {
    return isString(val) && Object.values(WhereOperators).includes((val as any).toLowerCase());
}

/**
 * Base class for queires. Implements basic query functionality
 * 
 */
@NewInstance()
@Inject(OrmDriver, Container)
export class QueryBuilder implements IQueryBuilder {

    protected _method: QueryMethod;
    protected _table: string;
    protected _tableAlias: string;
    protected _schema: string;
    protected _driver: OrmDriver;
    protected _container: Container;

    constructor(driver: OrmDriver, container: Container) {
        this._driver = driver;
        this._container = container;
    }


    /**
     * SQL table name that query is executed on
     * 
     * @example
     * SELECT * FROM `users`
     */
    public get Table() {
        return this._table;
    }

    /**
     * DB table alias
     */
    public get TableAlias() {
        return this._tableAlias;
    }

    /**
     * SQL schema/database name that query is executed on. 
     * 
     * @example
     * SELECT * FROM `spinejs`.`users` as u
     */
    public get Schema() {
        return this._schema;
    }

    /**
     * Sets schema to this query.
     * 
     * @param schema - schema or database name in database
     */
    public setSchema(schema: string) {

        if (!schema) {
            throw new ArgumentException(`schema argument cannot be null or empty`)
        }

        this._schema = schema;

        return this;
    }

    /**
     * Builds query that is ready to use in DB 
     */
    public toDB(): ICompilerOutput {
        throw new NotImplementedException();
    }

    public then(resolve: (rows: any[]) => void, reject: (err: Error) => void) {
        const compiled = this.toDB();
        this._driver.execute(compiled.expression, compiled.bindings).then(resolve, reject);
    }

    /**
     * Sets table that query is executed on. Declared as protected becouse different queries have different aliases
     * 
     * @param table - sql table name
     * @param alias - sql table alias
     * 
     * @example
     * 
     * this.setTable("user","u") 
     * 
     */
    protected setTable(table: string, alias?: string) {

        if (!table) {
            throw new ArgumentException("table name is empty");
        }

        this._table = table;
        this._tableAlias = alias;
    }


}


@NewInstance()
export class LimitBuilder implements ILimitBuilder {

    protected _fail: boolean;
    protected _first: boolean;

    protected _limit: IQueryLimit;

    constructor() {
        this._fail = false;
        this._first = false;
        this._limit = {
            limit: -1,
            offset: -1
        };
    }

    public take(count: number) {
        if (count <= 0) {
            throw new ArgumentException(`take count cannot be negative number`)
        }

        this._limit.limit = count;
        return this;
    }

    public skip(count: number) {
        if (count <= 0) {
            throw new ArgumentException(`skip count cannot be negative number`)
        }

        this._limit.offset = count;
        return this;
    }

    public first() {
        this._first = true;
        this._limit.limit = 1;
        return this;
    }

    public firstOrFail() {
        this._fail = true;
        return this.first();
    }

    public getLimits() {
        return this._limit;
    }
}


@NewInstance()
export class OrderByBuilder implements IOrderByBuilder {
    protected _sort: ISort;

    constructor() {
        this._sort = {
            column: "",
            order: SORT_ORDER.ASC
        };
    }

    public orderBy(column: string) {
        this._sort = {
            column,
            order: SORT_ORDER.ASC
        };
        return this;
    }

    public orderByDescending(column: string) {
        this._sort = {
            column,
            order: SORT_ORDER.DESC
        };
        return this;
    }

    public getSort() {
        return this._sort;
    }
}



@NewInstance()
export class ColumnsBuilder implements IColumnsBuilder {

    protected _container: Container;
    protected _columns: IQueryStatement[];

    constructor() {
        this._columns = [];
    }

    /**
     * Clears all select clauses from the query.
     * 
     * @example
     * 
     * query.columns()
     * 
     */
    public clearColumns() {
        this._columns = [];

        return this;
    }

    public columns(names: string[]) {
        this._columns = names.map(n => {
            return this._container.resolve<ColumnStatement>(ColumnStatement, [n]);
        });

        return this;
    }

    public getColumns() {
        return this._columns;
    }
}

@NewInstance()
export class RawQuery {

    get Query() {
        return this._query;
    }

    get Bindings() {
        return this._bindings;
    }

    public static create(query: string, bindings?: any[]) {
        return new RawQuery(query, bindings);
    }
    private _query: string = "";
    private _bindings: any[] = [];

    constructor(query: string, bindings?: any[]) {
        this._query = query;
        this._bindings = bindings;
    }
}

@NewInstance()
export class WhereBuilder implements IWhereBuilder {

    protected _statements: IQueryStatement[] = [];

    protected _boolean: WhereBoolean = WhereBoolean.AND;

    protected _container: Container;

    get Statements() {
        return this._statements;
    }

    get Op() {
        return this._boolean;
    }

    constructor(container: Container) {
        this._container = container;
        this._boolean = WhereBoolean.AND;
        this._statements = [];
    }

    public where(column: string | boolean | WhereFunction | RawQuery | {}, operator?: WhereOperators | any, value?: any): this {

        const self = this;

        // Support "where true || where false" 
        if (isBoolean(column)) {
            return this.where(RawQuery.create(column ? "TRUE" : "FALSE"));
        }

        if (column instanceof RawQuery) {
            this.Statements.push(this._container.resolve<RawQueryStatement>(RawQueryStatement, [column.Query, column.Bindings]));
            return this;
        }

        // handle nested where's
        if (isFunction(column)) {
            const builder = new WhereBuilder(this._container);
            (column as WhereFunction).call(builder);

            self.Statements.push(this._container.resolve<WhereQueryStatement>(WhereQueryStatement, [builder]));
            return this;
        }

        // handle simple key = object[key] AND ....
        if (isObject(column)) {
            return this.whereObject(column);
        }

        if (arguments.length === 2) {
            return _handleForTwo.call(this, column, operator);
        }

        return _handleForThree.call(this, column, operator, value);


        /**
         * handles for where("foo", 1).where(...) cases 
         * it produces WHERE foo = 1
         * @param c 
         * @param operator 
         */
        function _handleForTwo(c: any, v: any) {

            if (v === undefined) {
                throw new ArgumentException(`value cannot be undefined`);
            }

            if (!isString(c)) {
                throw new ArgumentException(`column is not of type string.`)
            }

            if (v === null) {
                return this.whereNull(c);
            }

            self._statements.push(self._container.resolve<WhereStatement>(WhereStatement, [c, WhereOperators.EQ, v]));

            return self;
        }

        /**
         * Handles for where("foo",'!=',1) etc
         * it produces WHERE foo != 1 
         * @param c 
         * @param o 
         * @param v 
         */
        function _handleForThree(c: any, o: any, v: any) {

            if (!isWhereOperator(o)) {
                throw new ArgumentException(`operator ${o} is invalid`);
            }

            if (!isString(c)) {
                throw new ArgumentException(`column is not of type string.`)
            }

            if (v === null) {
                return (o === WhereOperators.NOT_NULL) ? this.whereNotNull(c) : this.whereNull(c);
            }

            self._statements.push(self._container.resolve<WhereStatement>(WhereStatement, [c, o, v]));

            return this;
        }


    }


    public orWhere(column: string | boolean | WhereFunction | {}, ..._args: any[]) {
        this._boolean = WhereBoolean.OR;
        return this.where(column, ...(Array.from(arguments).slice(1)));
    }

    public andWhere(column: string | boolean | WhereFunction | {}, ..._args: any[]) {

        this._boolean = WhereBoolean.AND;
        return this.where(column, ...(Array.from(arguments).slice(1)));
    }

    public whereObject(obj: any) {

        for (const key of Object.keys(obj)) {
            this.andWhere(key, WhereOperators.EQ, obj[key]);
        }

        return this;
    }

    public whereNotNull(column: string): this {
        this._statements.push(this._container.resolve<WhereStatement>(WhereStatement, [column, WhereOperators.NOT_NULL, column]));

        return this;
    }

    public whereNull(column: string): this {
        this._statements.push(this._container.resolve<WhereStatement>(WhereStatement, [column, WhereOperators.NULL, column]));
        return this;
    }

    public whereNot(column: string, val: any): this {
        return this.where(column, WhereOperators.NOT, val);
    }

    public whereIn(column: string, val: any[]): this {
        this._statements.push(this._container.resolve<InStatement>(InStatement, [column, val, false]));
        return this;
    }

    public whereNotIn(column: string, val: any[]): this {
        this._statements.push(this._container.resolve<InStatement>(InStatement, [column, val, true]));
        return this;
    }

    public whereExist(query: SelectQueryBuilder): this {
        this._statements.push(this._container.resolve<ExistsQueryStatement>(ExistsQueryStatement, [query, false]));
        return this;
    }

    public whereNotExists(query: SelectQueryBuilder): this {
        this._statements.push(this._container.resolve<ExistsQueryStatement>(ExistsQueryStatement, [query, true]));
        return this;
    }

    public whereBetween(column: string, val: any[]): this {
        this._statements.push(this._container.resolve<BetweenStatement>(BetweenStatement, [column, val, false]));
        return this;
    }

    public whereNotBetween(column: string, val: any[]): this {
        this._statements.push(this._container.resolve<BetweenStatement>(BetweenStatement, [column, val, true]));
        return this;
    }

    public whereInSet(column: string, val: any[]): this {
        this._statements.push(this._container.resolve<InSetStatement>(InSetStatement, [column, val, false]));
        return this;
    }

    public whereNotInSet(column: string, val: any[]): this {
        this._statements.push(this._container.resolve<InSetStatement>(InSetStatement, [column, val, true]));
        return this;
    }

    public clearWhere() {
        this._statements = [];
        return this;
    }
}

// tslint:disable-next-line
export interface SelectQueryBuilder extends ISelectQueryBuilder { }

export class SelectQueryBuilder extends QueryBuilder {

    /**
     * column query props
     */
    protected _distinct: boolean
    protected _columns: IQueryStatement[];

    /**
     * limit query props
     */
    protected _fail: boolean;
    protected _first: boolean;
    protected _limit: IQueryLimit;

    /**
     * order by query props
     */
    protected _sort: ISort;

    /**
     * where query props
     */
    protected _statements: IQueryStatement[];
    protected _boolean: WhereBoolean;

    @use(WhereBuilder, LimitBuilder, OrderByBuilder, ColumnsBuilder)
    /// @ts-ignore
    private this: this;

    public get IsDistinct() {
        return this._distinct;
    }

    constructor(driver: OrmDriver, container: Container) {
        super(driver, container);

        this._distinct = false;
        this._columns = [];
        this._method = QueryMethod.SELECT;

        this._boolean = WhereBoolean.AND;
        this._statements = [];

        this._sort = {
            column: "",
            order: SORT_ORDER.ASC
        };
        
        this._limit = {
            limit: -1,
            offset: -1
        };
    }

    public min(column: string, as?: string): this {
        this._columns.push(this._container.resolve<ColumnMethodStatement>(ColumnMethodStatement, [column, ColumnMethods.MIN, as]));
        return this;

    };

    public max(column: string, as?: string): this {
        this._columns.push(this._container.resolve<ColumnMethodStatement>(ColumnMethodStatement, [column, ColumnMethods.MAX, as]));
        return this;

    }

    public count(column: string, as?: string): this {
        this._columns.push(this._container.resolve<ColumnMethodStatement>(ColumnMethodStatement, [column, ColumnMethods.COUNT, as]));
        return this;

    }

    public sum(column: string, as?: string): this {
        this._columns.push(this._container.resolve<ColumnMethodStatement>(ColumnMethodStatement, [column, ColumnMethods.SUM, as]));
        return this;

    }

    public avg(column: string, as?: string): this {
        this._columns.push(this._container.resolve<ColumnMethodStatement>(ColumnMethodStatement, [column, ColumnMethods.AVG, as]));
        return this;
    }

    public distinct() {
        this._distinct = true;
        return this;
    }

    public toDB(): ICompilerOutput {
        const compiler = this._container.resolve<SelectQueryCompiler>(SelectQueryCompiler);
        return compiler.compile();
    }
}

// tslint:disable-next-line
export interface DeleteQueryBuilder extends IWhereBuilder, ILimitBuilder { }
export class DeleteQueryBuilder extends QueryBuilder {

    protected _truncate: boolean;
    get Truncate() {
        return this._truncate;
    }

    @use(WhereBuilder, LimitBuilder)
    /// @ts-ignore
    private this: this;

    constructor(driver: OrmDriver, container: Container) {
        super(driver, container);

        this._truncate = false;
        this._method = QueryMethod.DELETE;
    }

    public toDB(): ICompilerOutput {
        return this._container.resolve<DeleteQueryCompiler>(DeleteQueryCompiler).compile();
    }
}

// tslint:disable-next-line
export interface UpdateQueryBuilder extends IWhereBuilder { }
export class UpdateQueryBuilder extends QueryBuilder {

    protected _value: {};
    public get Value(): {} {
        return this._value;
    }

    @use(WhereBuilder)
    /// @ts-ignore
    private this: this;

    constructor(driver: OrmDriver, container: Container) {
        super(driver, container);
        this._value = [];
        this._method = QueryMethod.UPDATE;
    }

    public in(name: string) {
        this.setTable(name);
        return this;
    }

    public update(value: {}) {
        this._value = value;
        return this;
    }

    public toDB(): ICompilerOutput {
        return this._container.resolve<UpdateQueryCompiler>(UpdateQueryCompiler).compile();
    }
}

// tslint:disable-next-line
export interface InsertQueryBuilder extends IColumnsBuilder { }
export class InsertQueryBuilder extends QueryBuilder {

    protected _values: any[][];;

    protected _columns: ColumnStatement[];

    protected _onDuplicate: UpdateQueryBuilder;

    @use(ColumnsBuilder)
    /// @ts-ignore
    private this: this;

    get Values() {
        return this._values;
    }

    constructor(driver: OrmDriver, container: Container) {
        super(driver, container);

        this._method = QueryMethod.INSERT;
        this._columns = [];
        this._values = [];
    }

    public values(data: {} | Array<{}>) {
        const self = this;

        if (Array.isArray(data)) {
            this.columns(_.chain(data).map(_.keys).flatten().uniq().value());

            data.forEach((d: any) => {
                _addData(d);
            });

        } else {
            this.columns(_.keysIn(data));
            _addData(data);
        }

        function _addData(d: any) {
            const binding: any[] = [];

            self._columns.map(c => {
                return (c as ColumnStatement).Column
            }).forEach(c => {
                binding.push(d[c]);
            });

            self._values.push(binding);
        }

        return this;
    }

    public into(table: string, schema?: string) {
        this.setTable(table, schema);
        return this;
    }

    public onDuplicate(callback: (this: UpdateQueryBuilder) => void): InsertQueryBuilder {
        this._onDuplicate = new UpdateQueryBuilder(this._driver, this._container);
        callback.call(this._onDuplicate);

        return this;
    }

    public toDB(): ICompilerOutput {
        return this._container.resolve<InsertQueryCompiler>(InsertQueryCompiler).compile();
    }
}

export class ColumnQueryBuilder {

    protected _name: string;
    protected _unique: boolean;
    protected _unsigned: boolean;
    protected _autoIncrement: boolean;
    protected _default: string | RawQuery | number;
    protected _primaryKey: boolean;
    protected _comment: string;
    protected _charset: string;
    protected _collation: string;
    protected _notNull: boolean;
    protected _type: string;
    protected _args: any[];


    constructor(name: string, type: string, ...args: any[]) {
        this._name = name;
        this._type = type;
        this._charset = "";
        this._args = [];
        this._autoIncrement = false;
        this._notNull = false;
        this._default = "";
        this._name = "";
        this._collation = "";
        this._comment = "";
        this._unique = false;
        this._unsigned = false;

        this._args.push(...args);
    }

    public notNull() {
        this._notNull = true;

        return this;
    }

    public unique() {
        this._unique = true;

        return this;
    }

    public unsigned() {
        this._unsigned = true;

        return this;
    }

    public autoIncrement() {
        this._autoIncrement = true;

        return this;
    }

    public default(val: string | RawQuery | number) {
        this._default = val;

        return this;
    }

    public primaryKey() {
        this._primaryKey = true;
        return this;
    }

    public comment(comment: string) {
        this._comment = comment;

        return this;
    }

    public charset(charset: string) {
        this._charset = charset;

        return this;
    }

    public collation(collation: string) {
        this._collation = collation;

        return this;
    }
}

export class TableQueryBuilder extends QueryBuilder {

    public int: (name: string) => ColumnQueryBuilder;
    public bigint: (name: string) => ColumnQueryBuilder;
    public tinyint: (name: string) => ColumnQueryBuilder;
    public smallint: (name: string) => ColumnQueryBuilder;
    public mediumint: (name: string) => ColumnQueryBuilder;


    public text: (name: string) => ColumnQueryBuilder;
    public tinytext: (name: string) => ColumnQueryBuilder;
    public mediumtext: (name: string) => ColumnQueryBuilder;
    public smalltext: (name: string) => ColumnQueryBuilder;
    public longtext: (name: string) => ColumnQueryBuilder;
    public string: (name: string, length?: number) => ColumnQueryBuilder;

    public float: (name: string, precision?: number, scale?: number) => ColumnQueryBuilder;
    public double: (name: string, precision?: number, scale?: number) => ColumnQueryBuilder;
    public decimal: (name: string, precision?: number, scale?: number) => ColumnQueryBuilder;
    public boolean: (name: string) => ColumnQueryBuilder;
    public bit: (name: string) => ColumnQueryBuilder;

    public date: (name: string) => ColumnQueryBuilder;
    public dateTime: (name: string) => ColumnQueryBuilder;
    public time: (name: string) => ColumnQueryBuilder;
    public timestamp: (name: string) => ColumnQueryBuilder;
    public enum: (name: string, values: any[]) => ColumnQueryBuilder;
    public json: (name: string) => ColumnQueryBuilder;

    get Columns() {
        return this._columns;
    }

    protected _columns: ColumnQueryBuilder[];

    protected _comment: string;

    protected _charset: string;

    constructor(name: string, driver: OrmDriver, container: Container) {
        super(driver, container);

        this._charset = "";
        this._comment = "";
        this._columns = [];

        this.setTable(name);
    }

    public increments(name: string) {

        return this.int(name)
            .autoIncrement()
            .notNull()
            .primaryKey();
    }

    public comment(comment: string) {
        this._comment = comment;
    }

    public charset(charset: string) {
        this._charset = charset;
    }

    public toDB(): ICompilerOutput {
        return this._container.resolve<TableQueryCompiler>(TableQueryCompiler).compile();
    }
}

export class SchemaQueryBuilder {

    constructor(protected driver: OrmDriver, protected container: Container) {
    }

    public createTable(name: string, callback: (table: TableQueryBuilder) => void) {

        const builder = new TableQueryBuilder(name, this.driver, this.container);
        callback.call(this, builder);

        return this;
    }
}

Object.values(ColumnType).forEach(type => {

    (TableQueryBuilder.prototype as any)[type] = function (name: string, ...args: any[]) {
        const _builder = new ColumnQueryBuilder(name, type, ...args);
        this._columns.push(_builder);
        return _builder;
    }
});