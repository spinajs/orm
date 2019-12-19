import { join, normalize, resolve } from 'path';
import { IColumnDescriptor, ColumnQueryCompiler, SelectQueryCompiler, ICompilerOutput, DeleteQueryCompiler, InsertQueryCompiler, UpdateQueryCompiler, TableQueryCompiler } from '../src';
import { IContainer } from '@spinajs/di';
import { OrmDriver } from "./../src/driver";

export function dir(path: string) {
    return resolve(normalize(join(__dirname, path)));
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
    public async connect(): Promise<void> {

    }

    // tslint:disable-next-line: no-empty
    public async disconnect(): Promise<void> {
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