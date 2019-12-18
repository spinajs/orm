import { Injectable } from "@spinajs/di";
import { ModelBase } from './model';

export abstract class ModelHydrator {
    public abstract hydrate(target: any, values: any): void;
}

@Injectable(ModelHydrator)
export class PropertyHydrator extends ModelHydrator {

    public hydrate<T>(target: ModelBase<T>, values: any): void {

        const descriptor = target.ModelDescriptor;
        if (!descriptor) {
            throw new Error(`cannot hydrate model ${target.constructor.name}, no model descriptor found`);
        }

        // filter out model joined properties
        // we handle it in later
        const keys = Object.keys(values).filter(k => /\$\$(.*)\$\$/.test(k) === false && descriptor.Columns?.find(c => c.Name === k));
        keys.forEach(k => {
            const column = descriptor.Columns?.find(c => c.Name === k);
            (target as any)[k] = column ? column.Converter.fromDB(values[k]) : values[k];
        });
    }
}

@Injectable(ModelHydrator)
export class JoinHydrator extends ModelHydrator {
    // tslint:disable-next-line: no-empty
    public hydrate(_target: any, _values: any): void {
        // todo: implement with relations
    }
}