import { ResolveStrategy, IContainer } from "@spinajs/di";
import { IDriverOptions, IColumnDescriptor, SelectQueryBuilder, DeleteQueryBuilder, InsertQueryBuilder, SchemaQueryBuilder } from ".";
import { UpdateQueryBuilder } from "./builders";

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
}