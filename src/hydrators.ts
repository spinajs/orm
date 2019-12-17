import { IModelDescrtiptor } from './interfaces';
import { MODEL_DESCTRIPTION_SYMBOL } from './decorators';
import { Injectable } from "@spinajs/di";

export abstract class ModelHydrator {
    public abstract hydrate(target: any, values: any): void;
}

@Injectable(ModelHydrator)
export class PropertyHydrator extends ModelHydrator {

    public hydrate(target: any, values: any): void {

        const descriptor = target.constructor[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor;
        if (!descriptor) {
            throw new Error(`cannot hydrate model ${target.constructor.name}, no model descriptor found`);
        }

        // filter out model joined properties
        // we handle it in later
        const keys = Object.keys(values).filter(k => /\$\$(.*)\$\$/.test(k) === false && descriptor.Columns.find(c => c.Name === k));
        keys.forEach(k => {
            target[k] = values[k];
        });
    }
}

@Injectable(ModelHydrator)
export class JoinHydrator extends ModelHydrator {
    public hydrate(_target: any, _values: any): void {

    }
}