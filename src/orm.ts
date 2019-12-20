import { Configuration } from '@spinajs/configuration';
import { AsyncResolveStrategy, Container, IContainer } from "@spinajs/di";
import { Autoinject } from '@spinajs/di';
import { Log, Logger } from "@spinajs/log";
import { ClassInfo, ListFromFiles } from "@spinajs/reflection";
import _ from "lodash";
import { IDriverOptions, IModelDescrtiptor, IMigrationDescriptor, OrmMigration } from "./interfaces";
import { ModelBase, MODEL_STATIC_MIXINS } from "./model";
import { MODEL_DESCTRIPTION_SYMBOL, MIGRATION_DESCRIPTION_SYMBOL } from './decorators';
import { OrmDriver } from './driver';

/**
 * Used to exclude sensitive data to others. eg. removed password field from cfg
 */
const CFG_PROPS = ["Database", "User", "Host", "Port", "Filename", "Driver", "Name"];


export class Orm extends AsyncResolveStrategy {

    @ListFromFiles("/**/*.{ts,js}", "system.dirs.models")
    public Models: Array<ClassInfo<ModelBase<any>>>;

    @ListFromFiles("/**/*.{ts,js}", "system.dirs.migrations")
    public Migrations: Array<ClassInfo<OrmMigration>>;

    public Connections: Map<string, OrmDriver> = new Map<string, OrmDriver>();

    @Autoinject()
    public Container: Container;

    @Logger({ module: "ORM" })
    private Log: Log;

    @Autoinject()
    private Configuration: Configuration;


    public async migrateUp(name?: string) {
        const migrations = name ? this.Migrations.filter(m => m.name === name) : this.Migrations;

        for (const m of migrations) {

            const md = (m.type as any)[MIGRATION_DESCRIPTION_SYMBOL] as IMigrationDescriptor;
            const cn = this.Connections.get(md.Connection);
            const migration = this.Container.resolve(m.type, [cn]) as OrmMigration;

            migration.up(cn)
        }
    }

    public async resolveAsync(container: IContainer): Promise<void> {

        const connections = this.Configuration.get<IDriverOptions[]>("db.connections", []);

        try {
            for (const c of connections) {

                const driver = container.resolve<OrmDriver>(c.Driver, [container, c]);
                if (!driver) {
                    this.Log.warn(`No Orm driver was found for DB ${c.Driver}, connection: ${c.Name}`, _.pick(c, CFG_PROPS));
                    continue;
                }

                this.Connections.set(c.Name, driver);
            }


            await Promise.all(Array.from(this.Connections.values()).map((d: OrmDriver) => {
                d.connect();
            }));

            for (const m of this.Models) {

                // tslint:disable-next-line: forin
                for (const mixin in MODEL_STATIC_MIXINS) {
                    m.type[mixin] = ((MODEL_STATIC_MIXINS as any)[mixin]).bind(m.type);
                }

                const descriptor = m.type[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;
                if (descriptor) {
                    const connection = this.Connections.get(descriptor.Connection);

                    if (connection) {
                        descriptor.Columns = await connection.tableInfo(descriptor.TableName, connection.Options.Database);
                    }
                }
            }
        } catch (err) {
            this.Log.error("Cannot initialize ORM module", err);
        }
    }
}
