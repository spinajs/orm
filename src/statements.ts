import { WhereOperators, ColumnMethods } from "./enums";
import { WhereQueryBuilder, SelectQueryBuilder } from "./builders";

export interface QueryStatementResult {
    Statements: string[];
    Bindings: any[];
}

export interface QueryStatement {
    build(): QueryStatementResult;
}

export abstract class RawQueryStatement implements QueryStatement {

    _query: string = "";
    _bindings: any[] = [];

    constructor(query: string, bindings?: any[]) {
        this._query = query;
        this._bindings = bindings;
    }

    public abstract build(): QueryStatementResult;
}

export abstract class BetweenStatement implements QueryStatement {

    protected _val: any[] = [];
    protected _not: boolean = false;
    protected _column: string = "";

    constructor(column: string, val: any[], not: boolean) {
        this._val = val;
        this._not = not;
        this._column = column;
    }

    public abstract build(): QueryStatementResult;
}

export abstract class WhereQueryStatement implements QueryStatement {

    protected _builder: WhereQueryBuilder;

    constructor(builder: WhereQueryBuilder) {
        this._builder = builder;
    }

    public abstract build(): QueryStatementResult;
}

export abstract class WhereStatement implements QueryStatement {
    protected _column: string;
    protected _operator: WhereOperators;
    protected _value: any;

    constructor(column: string, operator: WhereOperators, value: any) {
        this._column = column;
        this._operator = operator;
        this._value = value;
    }

    public abstract build(): QueryStatementResult;
}

export abstract class InQueryStatement implements QueryStatement {

    _val: any[] = [];
    _not: boolean = false;
    _column: string = "";

    constructor(column: string, val: any[], not: boolean) {
        this._val = val;
        this._not = not;
        this._column = column;
    }

    public abstract build(): QueryStatementResult;
}

export abstract class SelectQueryStatement implements QueryStatement {

    protected _builder: SelectQueryBuilder;
    constructor(builder: SelectQueryBuilder) {
        this._builder = builder;
    }

    public abstract build(): QueryStatementResult;
}

export abstract class ExistsQueryStatement extends SelectQueryStatement {

    _not: boolean = false;

    constructor(builder: SelectQueryBuilder, not: boolean) {
        super(builder);

        this._not = not;
    }

    public abstract build(): QueryStatementResult;
}


export abstract class InSetQueryStatement implements QueryStatement {

    _val: any[] = [];
    _not: boolean = false;
    _column: string = "";

    constructor(column: string, val: any[], not: boolean) {
        this._val = val;
        this._not = not;
        this._column = column;
    }

    public abstract build(): QueryStatementResult;
}

export abstract class ColumnStatement implements QueryStatement {

    _column: string = "";
    _alias: string = "";

    constructor(column: string, alias?: string) {
        this._column = column;
        this._alias = alias;
    }

    get Column() {
        return this._column;
    }

    get Alias() {
        return this._alias;
    }

    get IsWildcard() {
        return this._column === "*";
    }

    public abstract build(): QueryStatementResult;
}

export abstract class ColumnMethodStatement extends ColumnStatement {
    _method: ColumnMethods = null;

    constructor(column: string, method: ColumnMethods, alias?: string) {
        super(column, alias);
        this._method = method;
    }
 
    public abstract build(): QueryStatementResult;
}

