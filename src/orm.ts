import { Configuration } from '@spinajs/configuration';
import { AsyncResolveStrategy, Container, IContainer } from "@spinajs/di";
import { Autoinject } from '@spinajs/di';
import { Log, Logger } from "@spinajs/log";
import { ClassInfo, ListFromFiles } from "@spinajs/reflection";
import _ from "lodash";
import { IDriverOptions, IMigrationDescriptor, OrmMigration } from "./interfaces";
import { ModelBase, MODEL_STATIC_MIXINS, extractModelDescriptor } from "./model";
import { MIGRATION_DESCRIPTION_SYMBOL, MODEL_DESCTRIPTION_SYMBOL } from './decorators';
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

            await migration.up(cn)
        }
    }

    /**
     * This function is exposed mainly for unit testing purposes. It reloads table information for models
     * ORM always try to load table at resolve time
     */
    public async reloadTableInfo() {
        for (const m of this.Models) {
            const descriptor = extractModelDescriptor(m.type);
            if (descriptor) {
                const connection = this.Connections.get(descriptor.Connection);

                if (connection) {
                    const columns = await connection.tableInfo(descriptor.TableName, connection.Options.Database);

                    if(columns){
                        m.type[MODEL_DESCTRIPTION_SYMBOL].Columns = _.uniqBy(descriptor.Columns.concat(columns), "Name");
                    }
                }
            }
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
                return d.connect();
            }));

            for (const m of this.Models) {

                // tslint:disable-next-line: forin
                for (const mixin in MODEL_STATIC_MIXINS) {
                    m.type[mixin] = ((MODEL_STATIC_MIXINS as any)[mixin]).bind(m.type);
                }
            }

            await this.reloadTableInfo();
        } catch (err) {
            this.Log.error("Cannot initialize ORM module", err);
        }
    }

    
}
