import { join, normalize, resolve } from 'path';
import { IColumnDescriptor, ColumnQueryCompiler, SelectQueryCompiler, ICompilerOutput, DeleteQueryCompiler, InsertQueryCompiler, UpdateQueryCompiler, TableQueryCompiler } from '../src';
import { IContainer } from '@spinajs/di';
import { OrmDriver } from "./../src/driver";
import { Configuration } from '@spinajs/configuration';
import _ from 'lodash';

export function dir(path: string) {
    return resolve(normalize(join(__dirname, path)));
}

export class ConnectionConf extends Configuration {

    protected conf = {
        log: {
            name: 'spine-framework',
            /**
             * streams to log to. See more on bunyan docs
             */
            streams: null as any
        },
        system: {
            dirs: {
                migrations: [dir("./mocks/migrations")],
                models: [dir("./mocks/models")],

            }
        },
        db: {
            connections: [
                {
                    Driver: "sqlite",
                    Filename: "foo.sqlite",
                    Name: "sqlite"
                },
                {
                    Driver: "mysql",
                    Database: "foo",
                    User: "root",
                    Password: "root",
                    Host: "localhost",
                    Port: 1234,
                    Name: "main_connection"
                }
            ]
        }
    }

    public get(path: string[], defaultValue?: any): any {
        return _.get(this.conf, path, defaultValue);
    }
}



// @ts-ignore
export class FakeSqliteDriver extends OrmDriver {

    public async execute(_stmt: string | object, _params?: any[]): Promise<any[] | any> {
        return true;
    }

    // tslint:disable-next-line: no-empty
    public async ping(): Promise<boolean> {
        return true;
    }

    // tslint:disable-next-line: no-empty
    public async connect(): Promise<OrmDriver> {
        return this;
    }

    // tslint:disable-next-line: no-empty
    public async disconnect(): Promise<OrmDriver> {
        return this;
    }

    public async tableInfo(_table: string, _schema: string): Promise<IColumnDescriptor[]> {
        return null;
    }

    // tslint:disable-next-line: no-empty
    public resolve(_container: IContainer): void {

    }
}

export class FakeMysqlDriver extends OrmDriver {

    public async execute(_stmt: string | object, _params?: any[]): Promise<any[] | any> {
        return true;
    }

    // tslint:disable-next-line: no-empty
    public async ping(): Promise<boolean> {
        return true;
    }

    // tslint:disable-next-line: no-empty
    public async connect(): Promise<OrmDriver> {
        return this;

    }

    // tslint:disable-next-line: no-empty
    public async disconnect(): Promise<OrmDriver> {
        return this;
    }

    public async tableInfo(_table: string, _schema: string): Promise<IColumnDescriptor[]> {
        return null;
    }

    // tslint:disable-next-line: no-empty
    public resolve(_container: IContainer): void {

    }
}

export class FakeSelectQueryCompiler extends SelectQueryCompiler {

    public compile(): ICompilerOutput {
        return null;
    }

}

export class FakeDeleteQueryCompiler extends DeleteQueryCompiler {

    public compile(): ICompilerOutput {
        return null;
    }

}

export class FakeInsertQueryCompiler extends InsertQueryCompiler {

    // @ts-ignore
    constructor(private _builder: QueryBuilder) {
        super()
    }


    public compile(): ICompilerOutput {
        return null;
    }

}

export class FakeUpdateQueryCompiler extends UpdateQueryCompiler {

    // @ts-ignore
    constructor(private _builder: QueryBuilder) {
        super()
    }

    public compile(): ICompilerOutput {
        return null;
    }

}


export class FakeTableQueryCompiler extends TableQueryCompiler {

    // @ts-ignore
    constructor(private _builder: QueryBuilder) {
        super()
    }

    public compile(): ICompilerOutput {
        return null;
    }
}

export class FakeColumnQueryCompiler extends ColumnQueryCompiler {

    // @ts-ignore
    constructor(private _builder: QueryBuilder) {
        super()
    }

    public compile(): ICompilerOutput {
        return null;
    }

}