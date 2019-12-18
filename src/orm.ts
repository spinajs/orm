import { Configuration } from '@spinajs/configuration';
import { AsyncResolveStrategy, IContainer } from "@spinajs/di";
import { Autoinject } from '@spinajs/di';
import { Log, Logger } from "@spinajs/log";
import { ClassInfo, ListFromFiles } from "@spinajs/reflection";
import _ from "lodash";
import { IDriverOptions, OrmDriver, IModelDescrtiptor } from "./interfaces";
import { ModelBase, MODEL_STATIC_MIXINS } from "./model";
import { MODEL_DESCTRIPTION_SYMBOL } from './decorators';

/**
 * Used to exclude sensitive data to others. eg. removed password field from cfg
 */
const CFG_PROPS = ["Database", "User", "Host", "Port", "Filename", "Driver", "Name"];

export class Orm extends AsyncResolveStrategy {

    @ListFromFiles("/**/*.{ts,js}", "system.dirs.models")
    public Models: Array<ClassInfo<ModelBase<any>>>;

    public Connections: Map<string, OrmDriver> = new Map<string, OrmDriver>();

    public Container: IContainer;

    @Logger({ module: "ORM" })
    private Log: Log;

    @Autoinject()
    private Configuration: Configuration;



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
