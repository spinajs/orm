import { Configuration } from '@spinajs/configuration';
import { AsyncResolveStrategy, IContainer } from "@spinajs/di";
import { Autoinject } from '@spinajs/di';
import { Log, Logger } from "@spinajs/log";
import { ClassInfo, FromFiles } from "@spinajs/reflection";
import _ from "lodash";
import { IDriverOptions, OrmDriver } from "./interfaces";
import { Model } from "./model";

export class Orm extends AsyncResolveStrategy {

    @FromFiles("/**/*.{ts,js}", "system.dirs.models")
    public Models: Array<ClassInfo<Model>>;

    public Connections: Map<string, OrmDriver> = new Map<string, OrmDriver>();

    @Logger({ module: "ORM" })
    private Log: Log;

    @Autoinject()
    private Configuration: Configuration;

    public async resolveAsync(container: IContainer): Promise<void> {

        // do not allow to write password to log
        const cfgProps = ["Database", "User", "Host", "Port", "Filename", "Driver", "Name"];

        const drivers = container.Registry.get(OrmDriver) as Array<Constructor<OrmDriver>>;
        const connections = this.Configuration.get<IDriverOptions[]>("db.connections",[]);

        connections.forEach(c => {
            this.Log.info("Found ORM connection", _.pick(c, cfgProps));
        });

        for (const c of connections) {

            const driver = drivers.find(d => (d as any).DbDriver === c.Driver);
            if (!driver) {
                this.Log.warn(`No Orm driver was found for DB ${c.Driver}, connection: ${c.Name}`, _.pick(c, cfgProps));
                continue;
            }

            this.Connections.set(c.Name, new driver(c));
        }
 
        await Promise.all(Array.from(this.Connections.values()).map((d: OrmDriver) => d.connect()))
    }
}
