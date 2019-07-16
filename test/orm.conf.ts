import { Configuration } from "@spinajs/configuration";
import * as _ from "lodash";
import { dir } from "./misc";

export class OrmConf extends Configuration {

    private conf = {
        system: {
            dirs: {
                models: [dir("./mocks/models")],
            }
        },
 
    }
 
    public get(path: string[], defaultValue?: any): any {
        return _.get(this.conf, path, defaultValue);
    }
}