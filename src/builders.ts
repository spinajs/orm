import { Container } from "@spinajs/di";
import { ArgumentException, InvalidOperationException } from "@spinajs/exceptions";
import { setMaxListeners } from "cluster";
import * as _ from "lodash";
import { isBoolean, isFunction, isObject, isString } from 'util';
import { ColumnType, QueryMethod, SORT_ORDER, WhereBoolean, WhereOperators } from "./enums";
import { applyMixins } from "./helpers";
import { IColumnsQueryBuilder, ILimitQueryBuilder, IOrderByQueryBuilder, IQueryLimit, ISelectQueryBuilder, ISort, IWhereQueryBuilder, OrmDriver } from "./interfaces";
import { BetweenStatement, ColumnStatement, ExistsQueryStatement, InQueryStatement, InSetQueryStatement, IQueryStatement, RawQueryStatement, WhereQueryStatement, WhereStatement } from "./statements";
import { WhereFunction } from "./types";


function isWhereOperator(val: any) {
    return isString(val) && Object.values(WhereOperators).includes(val.toLowerCase());
}


function createStatement(type: any, ..._args: any[]) {
    const stmt = this._container.Registry.get(type);
    if (stmt && setMaxListeners.length > 0) {
        return new (Function.prototype.bind.apply(stmt[0], Array.from(arguments).slice(1)))();
    }
    return null;
}

/**
 * Base class for queires. Implements basic query functionality
 * 
 */
export class QueryBuilder {

    protected _driver: OrmDriver;
    protected _method: QueryMethod;
    private _table: string;
    private _tableAlias: string;
    private _schema: string;


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

    constructor(driver: OrmDriver) {
        this._driver = driver;
    }

    /**
     * Sets schema to this query.
     * 
     * @param schema - schema or database name in database
     */
    public schema(schema: string) {

        if (!schema) {
            throw new ArgumentException(`schema argument cannot be null or empty`)
        }

        this._schema = schema;

        return this;
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



export class LimitQueryBuilder implements ILimitQueryBuilder {

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



export class OrderByQueryBuilder implements IOrderByQueryBuilder {
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


export class ColumnsQueryBuilder implements IColumnsQueryBuilder {

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
            return createStatement(ColumnStatement, n);
        });

        return this;
    }

    public getColumns() {
        return this._columns;
    }
}

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


export class WhereQueryBuilder extends QueryBuilder implements IWhereQueryBuilder {

    protected _statements: IQueryStatement[];

    protected _boolean: WhereBoolean;

    protected _container: Container;

    get Statements() {
        return this._statements;
    }

    get Op() {
        return this._boolean;
    }

    constructor(driver: OrmDriver, container: Container) {
        super(driver);

        this._container = container;
        this._boolean = WhereBoolean.AND;
        this._statements = [];
    }

    public where(column: string | boolean | WhereFunction | RawQuery| {}, operator?: WhereOperators | any, value?: any): this {

        const self = this;

        // Support "where true || where false" 
        if (isBoolean(column)) {
            return this.where(RawQuery.create(column ? "TRUE" : "FALSE"));
        }

        if (column instanceof RawQuery) {
            this._statements.push(createStatement(RawQueryStatement, column.Query, column.Bindings));
            return this;
        }

        // handle nested where's
        if (isFunction(column)) {
            const _builder = new WhereQueryBuilder(this._driver, this._container);
            (column as WhereFunction).call(_builder);

            this._statements.push(createStatement(WhereQueryStatement, _builder));
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

            const stmt = this._container.Registry.get(WhereStatement);
            if (stmt && setMaxListeners.length > 0) {
                this._statements.push(createStatement(WhereStatement, c, WhereOperators.EQ, v));
            }

            return this;
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

            self._statements.push(createStatement(WhereStatement, c, o, v));

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
        this._statements.push(createStatement(column, WhereOperators.NOT_NULL, column));
        return this;
    }

    public whereNull(column: string): this {
        this._statements.push(createStatement(column, WhereOperators.NULL, column));
        return this;
    }

    public whereNot(column: string, val: any): this {
        return this.where(column, WhereOperators.NOT, val);
    }

    public whereIn(column: string, val: any[]): this {
        this._statements.push(createStatement(InQueryStatement, column, val, false));
        return this;
    }

    public whereNotIn(column: string, val: any[]): this {
        this._statements.push(createStatement(InQueryStatement, column, val, true));
        return this;
    }

    public whereExist(query: SelectQueryBuilder): this {
        this._statements.push(createStatement(ExistsQueryStatement, query, false));
        return this;
    }

    public whereNotExists(query: SelectQueryBuilder): this {
        this._statements.push(createStatement(ExistsQueryStatement, query, true));
        return this;
    }

    public whereBetween(column: string, val: any[]): this {
        this._statements.push(createStatement(BetweenStatement, column, val, false));
        return this;
    }

    public whereNotBetween(column: string, val: any[]): this {
        this._statements.push(createStatement(BetweenStatement, column, val, true));
        return this;
    }

    public whereInSet(column: string, val: any[]): this {
        this._statements.push(createStatement(InSetQueryStatement, column, val, false));
        return this;
    }

    public whereNotInSet(column: string, val: any[]): this {
        this._statements.push(createStatement(InSetQueryStatement, column, val, true));
        return this;
    }

    public clearWhere() {
        this._statements = [];
        return this;
    }
}

export class SelectQueryBuilder extends QueryBuilder implements ISelectQueryBuilder {


    public where: (column: string | boolean | {} | WhereFunction | RawQuery, operator?: any, value?: any) => this;
    public orWhere: (column: string | boolean | {} | WhereFunction, operator?: any, value?: any) => this;
    public andWhere: (column: string | boolean | {} | WhereFunction, operator?: any, value?: any) => this;
    public whereObject: (obj: any) => this;
    public whereNotNull: (column: string) => this;
    public whereNull: (column: string) => this;
    public whereNot: (column: string, val: any) => this;
    public whereIn: (column: string, val: any[]) => this;
    public whereNotIn: (column: string, val: any[]) => this;
    public whereExist: (query: ISelectQueryBuilder) => this;
    public whereNotExists: (query: ISelectQueryBuilder) => this;
    public whereBetween: (column: string, val: any[]) => this;
    public whereNotBetween: (column: string, val: any[]) => this;
    public whereInSet: (column: string, val: any[]) => this;
    public whereNotInSet: (column: string, val: any[]) => this;
    public clearWhere: () => this;
    public take: (count: number) => this;
    public skip: (count: number) => this
    public first: () => this
    public firstOrFail: () => this
    public getLimits: () => IQueryLimit
    public orderBy: (column: string) => this;
    public orderByDescending: (column: string) => this;
    public getSort: () => ISort
    public clearColumns: () => this;
    public columns: (names: string[]) => this;
    public getColumns: () => IQueryStatement[];

    public min: (column: string, as?: string) => this;
    public max: (column: string, as?: string) => this;
    public count: (column: string, as?: string) => this;
    public sum: (column: string, as?: string) => this;
    public avg: (column: string, as?: string) => this;

    protected _distinct : boolean

    protected _columns: IQueryStatement[];

    public get IsDistinct() {
        return this._distinct;
    }

    constructor(driver : OrmDriver){
        super(driver)

        this._distinct = false;
        this._columns = [];
        this._method = QueryMethod.SELECT;
    }

    public distinct() {
        if (this._columns.length === 0 || (this._columns[0] as ColumnStatement).IsWildcard) {
            throw new InvalidOperationException("Cannot force DISTINCT on unknown column");
        }

        this._distinct = true;

        return this;
    }

}

export class DeleteQueryBuilder extends QueryBuilder implements IWhereQueryBuilder, ILimitQueryBuilder {

    public where: (column: string | boolean | {} | WhereFunction | RawQuery, operator?: any, value?: any) => this;
    public orWhere: (column: string | boolean | {} | WhereFunction, operator?: any, value?: any) => this;
    public andWhere: (column: string | boolean | {} | WhereFunction, operator?: any, value?: any) => this;
    public whereObject: (obj: any) => this;
    public whereNotNull: (column: string) => this;
    public whereNull: (column: string) => this;
    public whereNot: (column: string, val: any) => this;
    public whereIn: (column: string, val: any[]) => this;
    public whereNotIn: (column: string, val: any[]) => this;
    public whereExist: (query: SelectQueryBuilder) => this;
    public whereNotExists: (query: SelectQueryBuilder) => this;
    public whereBetween: (column: string, val: any[]) => this;
    public whereNotBetween: (column: string, val: any[]) => this;
    public whereInSet: (column: string, val: any[]) => this;
    public whereNotInSet: (column: string, val: any[]) => this;
    public clearWhere: () => this;
    public take: (count: number) => this;
    public skip: (count: number) => this
    public first: () => this
    public firstOrFail: () => this
    public getLimits: () => IQueryLimit

    protected _truncate : boolean;

    constructor(driver : OrmDriver){
        super(driver)

        this._truncate = false;
        this._method = QueryMethod.DELETE;
    }

    get Truncate() {
        return this._truncate;
    }


}

export class UpdateQueryBuilder extends QueryBuilder implements IWhereQueryBuilder {

    public where: (column: string | boolean | {} | WhereFunction | RawQuery, operator?: any, value?: any) => this;
    public orWhere: (column: string | boolean | {} | WhereFunction, operator?: any, value?: any) => this;
    public andWhere: (column: string | boolean | {} | WhereFunction, operator?: any, value?: any) => this;
    public whereObject: (obj: any) => this;
    public whereNotNull: (column: string) => this;
    public whereNull: (column: string) => this;
    public whereNot: (column: string, val: any) => this;
    public whereIn: (column: string, val: any[]) => this;
    public whereNotIn: (column: string, val: any[]) => this;
    public whereExist: (query: SelectQueryBuilder) => this;
    public whereNotExists: (query: SelectQueryBuilder) => this;
    public whereBetween: (column: string, val: any[]) => this;
    public whereNotBetween: (column: string, val: any[]) => this;
    public whereInSet: (column: string, val: any[]) => this;
    public whereNotInSet: (column: string, val: any[]) => this;
    public clearWhere: () => this;

    protected _value: {};
    public get Value(): {} {
        return this._value;
    }

    constructor(driver: OrmDriver) {
        super(driver)

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

}

export class InsertQueryBuilder extends QueryBuilder implements IColumnsQueryBuilder {

    public clearColumns: () => this;
    public columns: (names: string[]) => this;
    public getColumns: () => IQueryStatement[];


    protected _values: any[][];;

    protected _columns: ColumnStatement[];

    protected _onDuplicate: UpdateQueryBuilder;

    get Values() {
        return this._values;
    }

    constructor(driver: OrmDriver) {
        super(driver);

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
        this._onDuplicate = new UpdateQueryBuilder(this._driver);
        callback.call(this._onDuplicate);

        return this;
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

    constructor(name: string, driver: OrmDriver) {
        super(driver);

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
}

export class SchemaQueryBuilder {

    protected _builder: TableQueryBuilder;

    protected _driver: OrmDriver;

    constructor(driver: OrmDriver) {
        this._driver = driver;
    }

    public createTable(name: string, callback: (table: TableQueryBuilder) => void) {

        this._builder = new TableQueryBuilder(name, this._driver);

        callback.call(null, this._builder);
        return this;
    }
}


applyMixins(SelectQueryBuilder, [ColumnsQueryBuilder, OrderByQueryBuilder, LimitQueryBuilder, WhereQueryBuilder]);
applyMixins(DeleteQueryBuilder, [LimitQueryBuilder, WhereQueryBuilder]);
applyMixins(UpdateQueryBuilder, [WhereQueryBuilder]);
applyMixins(InsertQueryBuilder, [ColumnsQueryBuilder]);

Object.values(ColumnType).forEach(type => {

    (TableQueryBuilder.prototype as any)[type] = function (name: string, ...args: any[]) {
        const _builder = new ColumnQueryBuilder(name, type, ...args);
        this._columns.push(_builder);
        return _builder;
    }
});