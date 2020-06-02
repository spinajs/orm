import { QueryContext } from './interfaces';
import { SyncModule, IContainer } from '@spinajs/di';
import { IDriverOptions, IColumnDescriptor } from '.';
import {
  UpdateQueryBuilder,
  SelectQueryBuilder,
  IndexQueryBuilder,
  DeleteQueryBuilder,
  InsertQueryBuilder,
  SchemaQueryBuilder,
  QueryBuilder,
} from './builders';
import { ModelHydrator, DbPropertyHydrator, OneToOneRelationHydrator, NonDbPropertyHydrator, JunctionModelPropertyHydrator } from './hydrators';
import { Logger, Log } from '@spinajs/log';

export type TransactionCallback = (driver: OrmDriver) => Promise<any>;

export abstract class OrmDriver extends SyncModule {
  /**
   * Connection options
   */
  public Options: IDriverOptions;

  public Container: IContainer;

  @Logger({ module: 'ORM' })
  protected Log: Log;

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
   * @param context query context to optimize queries sent to DB
   */
  public execute(stmt: string | object, params: any[], context: QueryContext): Promise<any[] | any> {
    if (this.Options.Debug?.Queries) {
      this.Log.trace('[ QUERY ] raw query: %s , bindings: %s, context: %s', stmt, params.join(','), context);
    }

    return undefined;
  }

  /**
   * Checks if database is avaible
   * @returns false if cannot reach database
   */
  public abstract ping(): Promise<boolean>;

  /**
   * Connects to database
   * @throws {OrmException} if can't connec to to database
   */
  public abstract connect(): Promise<OrmDriver>;

  /**
   * Disconnects from database
   */
  public abstract disconnect(): Promise<OrmDriver>;

  public abstract tableInfo(name: string, schema?: string): Promise<IColumnDescriptor[]>;

  public resolve(container: IContainer) {
    container.register(DbPropertyHydrator).as(ModelHydrator);
    container.register(NonDbPropertyHydrator).as(ModelHydrator);
    container.register(OneToOneRelationHydrator).as(ModelHydrator);
    container.register(JunctionModelPropertyHydrator).as(ModelHydrator);
  }

  /**
   * Creates select query builder associated with this connection.
   * This can be used to execute raw queries to db without orm model layer
   */
  public select(): SelectQueryBuilder {
    return this.Container.resolve(SelectQueryBuilder, [this]);
  }

  /**
   * Creates delete query builder associated with this connection.
   * This can be used to execute raw queries to db without orm model layer
   */
  public del(): DeleteQueryBuilder {
    return this.Container.resolve(DeleteQueryBuilder, [this]);
  }

  /**
   * Creates insert query builder associated with this connection.
   * This can be used to execute raw queries to db without orm model layer
   */
  public insert(): InsertQueryBuilder {
    return this.Container.resolve(InsertQueryBuilder, [this]);
  }

  /**
   * Creates update query builder associated with this connection.
   * This can be used to execute raw queries to db without orm model layer
   */
  public update(): UpdateQueryBuilder {
    return this.Container.resolve(UpdateQueryBuilder, [this]);
  }

  /**
   * Creates schema query builder associated with this connection.
   * This can be use to modify database structure
   */
  public schema(): SchemaQueryBuilder {
    return this.Container.resolve(SchemaQueryBuilder, [this]);
  }

  /**
   * Creates index query builder associated with this connection.
   * This can be use to create table indexes
   */
  public index(): IndexQueryBuilder {
    return this.Container.resolve(IndexQueryBuilder, [this]);
  }

  /**
   * Executes all queries in transaction
   *
   * @param queryOrCallback - one or more queries to execute in transaction scope. If parameter is function
   * its executed in transaction scope, thus all db operation in callback function are in transaction
   */
  public abstract transaction(queryOrCallback?: QueryBuilder[] | TransactionCallback): Promise<void>;
}
