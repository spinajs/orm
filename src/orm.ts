import { Configuration } from '@spinajs/configuration';
import { AsyncResolveStrategy, Container } from "@spinajs/di";
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
    protected Log: Log;

    @Autoinject()
    protected Configuration: Configuration;


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

                    if (columns) {
                        m.type[MODEL_DESCTRIPTION_SYMBOL].Columns = _.uniqBy(descriptor.Columns.concat(columns), "Name");
                    }
                }
            }
        }
    }

    public async resolveAsync(): Promise<void> {

        await this.createConnections();
        await this.reloadTableInfo();

        this.applyModelMixins();
    }

    /**
     * 
     * Register model to ORM programatically so ORM can see it and use it. Sometimes dynamical model discovery is not possible eg. 
     * in webpack evnironment. In such case we must tell ORM manually what to load.
     * 
     * NOTE: use it in ORM constructor before ORM is resolved & model list used.
     * 
     * @param model model to register
     */
    protected registerModel<T extends ModelBase<any>>(model: Class<T>) {
        this.Models.push({
            file: `${model.name}.registered`,
            name: model.name,
            type: model,
        });
    }

    /**
     * 
     * Register migration to ORM programatically so ORM can see it and use it. Sometimes dynamical migration discovery is not possible eg. 
     * in webpack evnironment. In such case we must tell ORM manually what to load.
     * 
     * NOTE: use it in ORM constructor before ORM is resolved & migrate function used.
     * 
     * @param model model to register
     */
    protected registerMigration<T extends OrmMigration>(migration: Class<T>) {
        this.Migrations.push({
            file: `${migration.name}.registered`,
            name: migration.name,
            type: migration,
        });
    }

    private async createConnections() {
        const connections = await Promise.all(
            this.Configuration.get<IDriverOptions[]>("db.connections", [])
                .map((c) => {
                    return this.Container.resolve<OrmDriver>(c.Driver, [this.Container, c]);
                })
                .filter(c => c !== null)
                .map(c => c.connect())
        );

        connections.forEach(c => {
            this.Connections.set(c.Options.Name, c);
            this.Log.info(`Found ORM driver ${c.Options.Name} with parameters ${_.pick(c.Options, CFG_PROPS)}`);
        });
    }

    private applyModelMixins(){
        this.Models.forEach((m) => {

            // tslint:disable-next-line: forin
            for (const mixin in MODEL_STATIC_MIXINS) {
                m.type[mixin] = ((MODEL_STATIC_MIXINS as any)[mixin]).bind(m.type);
            }
        });
    }
}
