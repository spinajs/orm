import { Configuration } from '@spinajs/configuration';
import { AsyncResolveStrategy, IContainer } from "@spinajs/di";
import { Autoinject } from '@spinajs/di';
import { Log, Logger } from "@spinajs/log";
import { ClassInfo, ListFromFiles } from "@spinajs/reflection";
import _ from "lodash";
import { IDriverOptions, OrmDriver } from "./interfaces";
import { ModelBase } from "./model";

/**
 * Used to exclude sensitive data to others. eg. removed password field from cfg
 */
const CFG_PROPS = ["Database", "User", "Host", "Port", "Filename", "Driver", "Name"];

export class Orm extends AsyncResolveStrategy {

    @ListFromFiles("/**/*.{ts,js}", "system.dirs.models")
    public Models: Array<ClassInfo<ModelBase>>;

    public Connections: Map<string, OrmDriver> = new Map<string, OrmDriver>();

    @Logger({ module: "ORM" })
    private Log: Log;

    @Autoinject()
    private Configuration: Configuration;

    public async resolveAsync(container: IContainer): Promise<void> {

        const connections = this.Configuration.get<IDriverOptions[]>("db.connections", []);

        for (const c of connections) {

            const driver = container.resolve<OrmDriver>(c.Driver, [c]);
            if (!driver) {
                this.Log.warn(`No Orm driver was found for DB ${c.Driver}, connection: ${c.Name}`, _.pick(c, CFG_PROPS));
                continue;
            }

            this.Connections.set(c.Name, driver);
        }

        await Promise.all(Array.from(this.Connections.values()).map((d: OrmDriver) => {
            d.connect();

            this.Log.info("ORM connected",  _.pick(d.Options, CFG_PROPS));
        }))
    }
}
