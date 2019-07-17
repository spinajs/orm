import { SelectQueryBuilder, WhereBuilder } from "./builders";
import { ColumnMethods, WhereOperators } from "./enums";

export interface IQueryStatementResult {
    Statements: string[];
    Bindings: any[];
}

export interface IQueryStatement {
    build(): IQueryStatementResult;
}

export abstract class RawQueryStatement implements IQueryStatement {

    protected _query: string;
    protected _bindings: any[];

    constructor(query: string, bindings?: any[]) {
        this._query = query || "";
        this._bindings = bindings || [];
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class BetweenStatement implements IQueryStatement {

    protected _val: any[];
    protected _not: boolean;
    protected _column: string;

    constructor(column: string, val: any[], not: boolean) {
        this._val = val || [];
        this._not = not || false;
        this._column = column || "";
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class WhereQueryStatement implements IQueryStatement {

    protected _builder: WhereBuilder;

    constructor(builder: WhereBuilder) {
        this._builder = builder;
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class WhereStatement implements IQueryStatement {
    protected _column: string;
    protected _operator: WhereOperators;
    protected _value: any;

    constructor(column: string, operator: WhereOperators, value: any) {
        this._column = column;
        this._operator = operator;
        this._value = value;
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class InStatement implements IQueryStatement {

    protected _val: any[];
    protected _not: boolean;
    protected _column: string;

    constructor(column: string, val: any[], not: boolean) {
        this._val = val || [];
        this._not = not || false;
        this._column = column || "";
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class SelectQueryStatement implements IQueryStatement {

    protected _builder: SelectQueryBuilder;
    constructor(builder: SelectQueryBuilder) {
        this._builder = builder;
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class ExistsQueryStatement extends SelectQueryStatement {

    protected _not: boolean;

    constructor(builder: SelectQueryBuilder, not: boolean) {
        super(builder);

        this._not = not || false;
    }

    public abstract build(): IQueryStatementResult;
}


export abstract class InSetStatement implements IQueryStatement {

    protected _val: any[];
    protected _not: boolean;
    protected _column: string;

    constructor(column: string, val: any[], not: boolean) {
        this._val = val || [];
        this._not = not || false;
        this._column = column || "";
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class ColumnStatement implements IQueryStatement {

    protected _column: string;
    protected _alias: string;

    constructor(column: string, alias?: string) {
        this._column = column || "";
        this._alias = alias || "";
    }

    get Column() {
        return this._column;
    }

    get Alias() {
        return this._alias;
    }

    get IsWildcard() {
        return this._column && this._column.trim() === "*";
    }

    public abstract build(): IQueryStatementResult;
}

export abstract class ColumnMethodStatement extends ColumnStatement {
    protected _method: ColumnMethods;

    constructor(column: string, method: ColumnMethods, alias?: string) {
        super(column, alias);
        this._method = method;
    }
 
    public abstract build(): IQueryStatementResult;
}

