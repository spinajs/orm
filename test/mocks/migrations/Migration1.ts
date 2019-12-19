import { OrmMigration } from "../../../src";
import { OrmDriver } from "../../../src/driver";

export class Migration1 extends OrmMigration {

    // tslint:disable-next-line: no-empty
    public async up(_connection: OrmDriver): Promise<void> {

    }

    // tslint:disable-next-line: no-empty
    public async down(_connection: OrmDriver): Promise<void> {

    }


}