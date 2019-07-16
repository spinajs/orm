import { ArgumentException, InvalidOperationException } from "@spinajs/exceptions";
import * as _ from "lodash";
import { QueryMethod, SORT_ORDER, WhereBoolean, WhereOperators, ColumnType } from "./enums";
import { OrmDriver, IQueryLimit, ISort, ILimitQueryBuilder, IOrderByQueryBuilder, IColumnsQueryBuilder, IWhereQueryBuilder, IRawQuery, ISelectQueryBuilder } from "./interfaces";
import { applyMixins } from "./helpers";
import { isBoolean, isFunction, isString, isObject } from 'util';
import { RawQueryStatement, QueryStatement, WhereQueryStatement, WhereStatement, InQueryStatement, ExistsQueryStatement, BetweenStatement, InSetQueryStatement, ColumnStatement } from "./statements";
import { Container } from "@spinajs/di";
import { setMaxListeners } from "cluster";
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
     * SELECT * FROM `spine`.`users` as u
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
    _fail = false;
    _first = false;

    _limit: IQueryLimit = {
        limit: -1,
        offset: -1
    };

    take(count: number) {
        if (count <= 0) {
            throw new ArgumentException(`take count cannot be negative number`)
        }

        this._limit.limit = count;
        return this;
    }

    skip(count: number) {
        if (count <= 0) {
            throw new ArgumentException(`skip count cannot be negative number`)
        }

        this._limit.offset = count;
        return this;
    }

    first() {
        this._first = true;
        this._limit.limit = 1;
        return this;
    }

    firstOrFail() {
        this._fail = true;
        return this.first();
    }

    getLimits() {
        return this._limit;
    }
}



export class OrderByQueryBuilder implements IOrderByQueryBuilder {
    _sort: ISort = null;

    orderBy(column: string, order: SORT_ORDER) {
        this._sort = {
            column: column,
            order: order
        };
        return this;
    }

    getSort() {
        return this._sort;
    }
}


export class ColumnsQueryBuilder implements IColumnsQueryBuilder {

    _columns: QueryStatement[] = [];

    /**
   * Clears all select clauses from the query.
   * 
   * @example
   * 
   * query.columns()
   * 
   */
    clearColumns() {
        this._columns = [];

        return this;
    }

    columns(names: string[]) {
        this._columns = names.map(n => {
            return createStatement(ColumnStatement, n);
        });

        return this;
    }

    getColumns() {
        return this._columns;
    }
}

export class RawQuery {
    private _query: string = "";
    private _bindings: any[] = [];

    constructor(query: string, bindings?: any[]) {
        this._query = query;
        this._bindings = bindings;
    }

    get Query() {
        return this._query;
    }

    get Bindings() {
        return this._bindings;
    }

    public static create(query: string, bindings?: any[]) {
        return new RawQuery(query, bindings);
    }
}


export class WhereQueryBuilder extends QueryBuilder implements IWhereQueryBuilder {

    protected _statements: Array<QueryStatement> = [];

    protected _boolean: WhereBoolean = WhereBoolean.AND;

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
    }

    where(column: string | boolean | WhereFunction | IRawQuery | {}, operator?: WhereOperators | any, value?: any): this {

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
            (<WhereFunction>column).call(_builder);

            this._statements.push(createStatement(WhereQueryStatement, _builder));
            return this;
        }

        // handle simple key = object[key] AND ....
        if (isObject(column)) {
            return this.whereObject(column);
        }

        if (arguments.length == 2) {
            return _handleForTwo.call(this, column, operator);
        }

        return _handleForThree.call(this, column, operator, value);


        /**
         * handles for where("foo", 1).where(...) cases 
         * it produces WHERE foo = 1
         * @param column 
         * @param operator 
         */
        function _handleForTwo(column: any, value: any) {

            if (value === undefined) {
                throw new ArgumentException(`value cannot be undefined`);
            }

            if (!isString(column)) {
                throw new ArgumentException(`column is not of type string.`)
            }

            if (value === null) {
                return this.whereNull(column);
            }

            const stmt = this._container.Registry.get(WhereStatement);
            if (stmt && setMaxListeners.length > 0) {
                this._statements.push(createStatement(WhereStatement, column, WhereOperators.EQ, value));
            }

            return this;
        }

        /**
         * Handles for where("foo",'!=',1) etc
         * it produces WHERE foo != 1 
         * @param column 
         * @param operator 
         * @param value 
         */
        function _handleForThree(column: any, operator: any, value: any) {

            if (!isWhereOperator(operator)) {
                throw new ArgumentException(`operator ${operator} is invalid`);
            }

            if (!isString(column)) {
                throw new ArgumentException(`column is not of type string.`)
            }

            if (value === null) {
                return (operator == WhereOperators.NOT_NULL) ? this.whereNotNull(column) : this.whereNull(column);
            }

            self._statements.push(createStatement(WhereStatement, column, operator, value));

            return this;
        }


    }


    orWhere(column: string | boolean | WhereFunction | {}, operator?: WhereOperators | any, value?: any) {
        this._boolean = WhereBoolean.OR;
        return this.where(column, ...(Array.from(arguments).slice(1)));
    }

    andWhere(column: string | boolean | WhereFunction | {}, operator?: WhereOperators | any, value?: any) {

        this._boolean = WhereBoolean.AND;
        return this.where(column, ...(Array.from(arguments).slice(1)));
    }

    whereObject(obj: any) {

        for (let key in obj) {
            this.andWhere(key, WhereOperators.EQ, obj[key]);
        }

        return this;
    }

    whereNotNull(column: string): this {
        this._statements.push(createStatement(column, WhereOperators.NOT_NULL, column));
        return this;
    }

    whereNull(column: string): this {
        this._statements.push(createStatement(column, WhereOperators.NULL, column));
        return this;
    }

    whereNot(column: string, val: any): this {
        return this.where(column, WhereOperators.NOT, val);
    }

    whereIn(column: string, val: Array<any>): this {
        this._statements.push(createStatement(InQueryStatement, column, val, false));
        return this;
    }

    whereNotIn(column: string, val: Array<any>): this {
        this._statements.push(createStatement(InQueryStatement, column, val, true));
        return this;
    }

    whereExist(query: SelectQueryBuilder): this {
        this._statements.push(createStatement(ExistsQueryStatement, query, false));
        return this;
    }

    whereNotExists(query: SelectQueryBuilder): this {
        this._statements.push(createStatement(ExistsQueryStatement, query, true));
        return this;
    }

    whereBetween(column: string, val: Array<any>): this {
        this._statements.push(createStatement(BetweenStatement, column, val, false));
        return this;
    }

    whereNotBetween(column: string, val: Array<any>): this {
        this._statements.push(createStatement(BetweenStatement, column, val, true));
        return this;
    }

    whereInSet(column: string, val: Array<any>): this {
        this._statements.push(createStatement(InSetQueryStatement, column, val, false));
        return this;
    }

    whereNotInSet(column: string, val: Array<any>): this {
        this._statements.push(createStatement(InSetQueryStatement, column, val, true));
        return this;
    }

    clearWhere() {
        this._statements = [];
        return this;
    }
}

export class SelectQueryBuilder extends QueryBuilder implements ISelectQueryBuilder {
    _distinct = false;

    _columns: QueryStatement[] = [];


    public get Distinct() {
        return this._distinct;
    }

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
    public orderBy: (column: string, order: SORT_ORDER) => this;
    public getSort: () => ISort
    public clearColumns: () => this;
    public columns: (names: string[]) => this;
    public getColumns: () => QueryStatement[];

    public min: (column: string, as?: string) => this;
    public max: (column: string, as?: string) => this;
    public count: (column: string, as?: string) => this;
    public sum: (column: string, as?: string) => this;
    public avg: (column: string, as?: string) => this;
    public distinct() {
        if (this._columns.length == 0 || (<ColumnStatement>this._columns[0]).IsWildcard) {
            throw new InvalidOperationException("Cannot force DISTINCT on unknown column");
        }

        this._distinct = true;

        return this;
    }

}

export class DeleteQueryBuilder extends QueryBuilder implements IWhereQueryBuilder, ILimitQueryBuilder {
    _truncate = false;

    get Truncate() {
        return this._truncate;
    }

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
}

export class UpdateQueryBuilder extends QueryBuilder implements IWhereQueryBuilder {
    _value: {} = null;

    get Value(): {} {
        return this._value;
    }

    public in(name: string) {
        this.setTable(name);
        return this;
    }

    public update(value: {}) {
        this._value = value;

        return this;
    }

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

}

export class InsertQueryBuilder extends QueryBuilder implements IColumnsQueryBuilder {

    _values: Array<any[]> = [];

    _columns: ColumnStatement[] = [];

    _onDuplicate: UpdateQueryBuilder = null;

    constructor(driver: OrmDriver) {
        super(driver);

        this._method = QueryMethod.INSERT;
    }

    public clearColumns: () => this;
    public columns: (names: string[]) => this;
    public getColumns: () => QueryStatement[];

    get Values() {
        return this._values;
    }

    values(data: {} | Array<{}>) {
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
            let binding: any[] = [];

            self._columns.map(c => {
                return (<ColumnStatement>c).Column
            }).forEach(c => {
                binding.push(d[c]);
            });

            self._values.push(binding);
        }

        return this;
    }

    into(table: string, schema?: string) {
        this.setTable(table, schema);
        return this;
    }

    onDuplicate(callback: (this: UpdateQueryBuilder) => void): InsertQueryBuilder {
        this._onDuplicate = new UpdateQueryBuilder(this._driver);
        callback.call(this._onDuplicate);

        return this;
    }
}

export class ColumnQueryBuilder {

    _name: string;

    _unique: boolean = false;

    _unsigned: boolean = false;

    _autoIncrement: boolean = false;

    _default: string | RawQuery | number = null;

    _primaryKey: boolean = false;

    _comment: string = "";

    _charset: string = "";

    _collation: string = "";

    _notNull: boolean = false;

    _type: string = undefined;

    _args: any[] = [];


    constructor(name: string, type: string, ...args: any[]) {
        this._name = name;
        this._type = type;

        this._args.push(...args);
    }

    notNull() {
        this._notNull = true;

        return this;
    }

    unique() {
        this._unique = true;

        return this;
    }

    unsigned() {
        this._unsigned = true;

        return this;
    }

    autoIncrement() {
        this._autoIncrement = true;

        return this;
    }

    default(val: string | RawQuery | number) {
        this._default = val;

        return this;
    }

    primaryKey() {
        this._primaryKey = true;
        return this;
    }

    comment(comment: string) {
        this._comment = comment;

        return this;
    }

    charset(charset: string) {
        this._charset = charset;

        return this;
    }

    collation(collation: string) {
        this._collation = collation;

        return this;
    }
}

export class TableQueryBuilder extends QueryBuilder {

    _columns: ColumnQueryBuilder[] = [];

    _comment: string = "";

    _charset: string = "";

    get Columns() {
        return this._columns;
    }

    constructor(name: string, driver: OrmDriver) {
        super(driver);

        this.setTable(name);
    }

    increments(name: string) {

        return this.int(name)
            .autoIncrement()
            .notNull()
            .primaryKey();
    }

    int: (name: string) => ColumnQueryBuilder;
    bigint: (name: string) => ColumnQueryBuilder;
    tinyint: (name: string) => ColumnQueryBuilder;
    smallint: (name: string) => ColumnQueryBuilder;
    mediumint: (name: string) => ColumnQueryBuilder;


    text: (name: string) => ColumnQueryBuilder;
    tinytext: (name: string) => ColumnQueryBuilder;
    mediumtext: (name: string) => ColumnQueryBuilder;
    smalltext: (name: string) => ColumnQueryBuilder;
    longtext: (name: string) => ColumnQueryBuilder;
    string: (name: string, length?: number) => ColumnQueryBuilder;

    float: (name: string, precision?: number, scale?: number) => ColumnQueryBuilder;
    double: (name: string, precision?: number, scale?: number) => ColumnQueryBuilder;
    decimal: (name: string, precision?: number, scale?: number) => ColumnQueryBuilder;
    boolean: (name: string) => ColumnQueryBuilder;
    bit: (name: string) => ColumnQueryBuilder;

    date: (name: string) => ColumnQueryBuilder;
    dateTime: (name: string) => ColumnQueryBuilder;
    time: (name: string) => ColumnQueryBuilder;
    timestamp: (name: string) => ColumnQueryBuilder;
    enum: (name: string, values: any[]) => ColumnQueryBuilder;
    json: (name: string) => ColumnQueryBuilder;

    comment(comment: string) {
        this._comment = comment;
    }

    charset(charset: string) {
        this._charset = charset;
    }
}

export class SchemaQueryBuilder {

    _builder: TableQueryBuilder = null;

    _driver: OrmDriver = null;

    constructor(driver: OrmDriver) {
        this._driver = driver;
    }

    createTable(name: string, callback: (table: TableQueryBuilder) => void) {

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

    (<any>TableQueryBuilder.prototype)[type] = function (name: string, ...args: any[]) {
        const _builder = new ColumnQueryBuilder(name, type, ...args);
        this._columns.push(_builder);
        return _builder;
    }
});