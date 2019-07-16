// import { ClassInfo, FromFiles, ModuleBase } from "@spinajs/core";
import { OrmDriver } from "./interfaces";
// import { ModelBase } from "./model";


export class Orm{

    // @FromFiles("/**/*.{ts,js}", "system.dirs.models")
    // public Models: Promise<Array<ClassInfo<ModelBase>>>;

    public Connections: Map<string, OrmDriver>;
}
