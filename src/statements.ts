import { SelectQueryBuilder, WhereBuilder, RawQuery } from './builders';
import { ColumnMethods, WhereOperators, JoinMethod } from './enums';
import { NewInstance } from '@spinajs/di';
import _ from 'lodash';

export interface IQueryStatementResult {
  Statements: string[];
  Bindings: any[];
}

export interface IQueryStatement {
  build(): IQueryStatementResult;
}

@NewInstance()
export abstract class RawQueryStatement implements IQueryStatement {
  protected _query: string;
  protected _bindings: any[];

  constructor(query: string, bindings?: any[]) {
    this._query = query || '';
    this._bindings = bindings || [];
  }

  public abstract build(): IQueryStatementResult;
}

@NewInstance()
export abstract class BetweenStatement implements IQueryStatement {
  protected _val: any[];
  protected _not: boolean;
  protected _column: string;

  constructor(column: string, val: any[], not: boolean) {
    this._val = val || [];
    this._not = not || false;
    this._column = column || '';
  }

  public abstract build(): IQueryStatementResult;
}
@NewInstance()
export abstract class WhereQueryStatement implements IQueryStatement {
  protected _builder: WhereBuilder;

  constructor(builder: WhereBuilder) {
    this._builder = builder;
  }

  public abstract build(): IQueryStatementResult;
}

@NewInstance()
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

@NewInstance()
export abstract class JoinStatement implements IQueryStatement {
  protected _table: string;
  protected _method: JoinMethod;
  protected _foreignKey: string;
  protected _primaryKey: string;
  protected _query: RawQuery;

  constructor(table: string | RawQuery, method: JoinMethod, foreignKey: string, primaryKey: string) {
    this._method = method;

    if (_.isString(table)) {
      this._table = table;
      this._foreignKey = foreignKey;
      this._primaryKey = primaryKey;
    } else {
      this._query = table;
    }
  }

  public abstract build(): IQueryStatementResult;
}

@NewInstance()
export abstract class InStatement implements IQueryStatement {
  protected _val: any[];
  protected _not: boolean;
  protected _column: string;

  constructor(column: string, val: any[], not: boolean) {
    this._val = val || [];
    this._not = not || false;
    this._column = column || '';
  }

  public abstract build(): IQueryStatementResult;
}

@NewInstance()
export abstract class SelectQueryStatement implements IQueryStatement {
  protected _builder: SelectQueryBuilder;
  constructor(builder: SelectQueryBuilder) {
    this._builder = builder;
  }

  public abstract build(): IQueryStatementResult;
}

@NewInstance()
export abstract class ExistsQueryStatement extends SelectQueryStatement {
  protected _not: boolean;

  constructor(builder: SelectQueryBuilder, not: boolean) {
    super(builder);

    this._not = not || false;
  }

  public abstract build(): IQueryStatementResult;
}

@NewInstance()
export abstract class InSetStatement implements IQueryStatement {
  protected _val: any[];
  protected _not: boolean;
  protected _column: string;

  constructor(column: string, val: any[], not: boolean) {
    this._val = val || [];
    this._not = not || false;
    this._column = column || '';
  }

  public abstract build(): IQueryStatementResult;
}
@NewInstance()
export abstract class ColumnStatement implements IQueryStatement {
  protected _column: string | RawQuery;
  protected _alias: string;

  constructor(column: string | RawQuery, alias?: string) {
    this._column = column || '';
    this._alias = alias || '';
  }

  get Column() {
    return this._column;
  }

  get Alias() {
    return this._alias;
  }

  get IsWildcard() {
    if (this._column instanceof RawQuery) {
      return false;
    }

    return this._column && this._column.trim() === '*';
  }

  public abstract build(): IQueryStatementResult;
}

export abstract class ColumnRawStatement implements IQueryStatement {
  constructor(public RawQuery: RawQuery) {}

  public abstract build(): IQueryStatementResult;
}

@NewInstance()
export abstract class ColumnMethodStatement extends ColumnStatement {
  protected _method: ColumnMethods;

  constructor(column: string, method: ColumnMethods, alias?: string) {
    super(column, alias);
    this._method = method;
  }

  public abstract build(): IQueryStatementResult;
}
