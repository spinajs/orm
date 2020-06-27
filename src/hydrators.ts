import { ModelBase } from './model';

export abstract class ModelHydrator {
  public abstract hydrate(target: any, values: any): void;
}

export class OneToOneRelationHydrator extends ModelHydrator {
  public hydrate<T>(target: ModelBase<T>, values: any): void {
    const descriptor = target.ModelDescriptor;
    if (!descriptor) {
      throw new Error(`cannot hydrate model ${target.constructor.name}, no model descriptor found`);
    }

    for (const [key, val] of descriptor.Relations) {
      if (values[key] != null) {
        const entity = target as any;
        entity[key] = new val.TargetModel();
        entity[key].hydrate(values[key]);

        delete (target as any)[val.ForeignKey];
      }
    }
  }
}

export class DbPropertyHydrator extends ModelHydrator {
  public hydrate<T>(target: ModelBase<T>, values: any): void {
    const descriptor = target.ModelDescriptor;
    if (!descriptor) {
      throw new Error(`cannot hydrate model ${target.constructor.name}, no model descriptor found`);
    }

    // filter out model joined properties
    // we handle it in later
    const keys = Object.keys(values).filter(k => descriptor.Columns?.find(c => c.Name === k));
    keys.forEach(k => {
      const column = descriptor.Columns?.find(c => c.Name === k);
      (target as any)[k] = column.Converter ? column.Converter.fromDB(values[k]) : values[k];
    });
  }
}

export class NonDbPropertyHydrator extends ModelHydrator {
  public hydrate<T>(target: ModelBase<T>, values: any): void {
    const descriptor = target.ModelDescriptor;
    if (!descriptor) {
      throw new Error(`cannot hydrate model ${target.constructor.name}, no model descriptor found`);
    }

    // get only properties that are not in DB
    const keys = Object.keys(values).filter(k => descriptor.Columns?.find(c => c.Name === k) === undefined);
    keys.forEach(k => {
      (target as any)[k] = values[k];
    });
  }
}

export class JunctionModelPropertyHydrator extends ModelHydrator {
  public hydrate<T>(target: ModelBase<T>, values: any): void {
    const descriptor = target.ModelDescriptor;
    if (!descriptor) {
      throw new Error(`cannot hydrate model ${target.constructor.name}, no model descriptor found`);
    }

    for (const jt of descriptor.JunctionModelProperties) {
      const entity = new jt.Model();
      entity.hydrate(values.JunctionModel);

      (target as any)[jt.Name] = entity;
    }
  }
}
