import { UuidConverter } from './converters';
import {
  IModelDescrtiptor,
  IMigrationDescriptor,
  RelationType,
  IRelationDescriptor,
  IDiscriminationEntry,
  DatetimeValueConverter,
  ValueConverter,
  SetValueConverter,
} from './interfaces';
import 'reflect-metadata';
import { ModelBase, extractModelDescriptor } from './model';
import { InvalidOperation, InvalidArgument } from '@spinajs/exceptions';

export const MODEL_DESCTRIPTION_SYMBOL = Symbol.for('MODEL_DESCRIPTOR');
export const MIGRATION_DESCRIPTION_SYMBOL = Symbol.for('MIGRATION_DESCRIPTOR');

/**
 * Helper func to create model metadata
 *
 * @param callback
 */
export function extractDecoratorDescriptor(
  callback: (
    model: IModelDescrtiptor,
    target: any,
    propertyKey: symbol | string,
    indexOrDescriptor: number | PropertyDescriptor,
  ) => void,
  base = false,
): any {
  return (target: any, propertyKey: string | symbol, indexOrDescriptor: number | PropertyDescriptor) => {
    let metadata: IModelDescrtiptor = null;
    if (!base) {
      metadata = target.constructor[MODEL_DESCTRIPTION_SYMBOL];
    } else {
      metadata = target[MODEL_DESCTRIPTION_SYMBOL];
    }

    if (!metadata) {
      metadata = {
        Driver: null,
        Converters: new Map<string, Constructor<ValueConverter>>(),
        Columns: [],
        Connection: null,
        PrimaryKey: '',
        SoftDelete: {
          DeletedAt: '',
        },
        Archived: {
          ArchivedAt: '',
        },
        TableName: '',
        Timestamps: {
          CreatedAt: '',
          UpdatedAt: '',
        },
        Relations: new Map<string, IRelationDescriptor>(),
        Name: target.constructor.name,
        JunctionModelProperties: [],
        DiscriminationMap: {
          Field: '',
          Models: null,
        },
      };

      if (!base) {
        target.constructor[MODEL_DESCTRIPTION_SYMBOL] = metadata;
      } else {
        target[MODEL_DESCTRIPTION_SYMBOL] = metadata;
      }
    }

    if (callback) {
      callback(metadata, target, propertyKey, indexOrDescriptor);
    }
  };
}

/**
 * Sets migration option
 *
 * @param connection connection name, must exists in configuration file
 */
export function Migration(connection: string) {
  return (target: any) => {
    let metadata = target[MIGRATION_DESCRIPTION_SYMBOL] as IMigrationDescriptor;

    if (!metadata) {
      metadata = {
        Connection: '',
      };
      target[MIGRATION_DESCRIPTION_SYMBOL] = metadata;
    }

    metadata.Connection = connection;
  };
}

/**
 * @Connection model decorator, assigns connection to model
 *
 * @param name connection name, must be avaible in db config
 */
export function Connection(name: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor) => {
    model.Connection = name;
  }, true);
}

/**
 * @TableName model decorator, assigns table from database to model
 *
 * @param name table name in database that is referred by this model
 */
export function Model(tableName: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor) => {
    model.TableName = tableName;
  }, true);
}

/**
 * Set create timestamps feature to model. Proper columns must be avaible in database table.
 * It allow to track creation times & changes to model
 */
export function CreatedAt() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    if (type.name !== 'Date') {
      throw Error('Proprety CreatedAt must be Date type');
    }

    model.Timestamps.CreatedAt = propertyKey;

    // add converter for this field
    model.Converters.set(propertyKey, DatetimeValueConverter);
  });
}

/**
 * Set update timestamps feature to model. Proper columns must be avaible in database table.
 * It allow to track creation times & changes to model
 */
export function UpdatedAt() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    if (type.name !== 'Date') {
      throw Error('Proprety UpdatedAt must be Date type');
    }

    model.Timestamps.UpdatedAt = propertyKey;

    // add converter for this field
    model.Converters.set(propertyKey, DatetimeValueConverter);
  });
}

/**
 * Sets soft delete feature to model. Soft delete dont delete model, but sets deletion date and hides from
 * select result by default.
 */
export function SoftDelete() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    if (type.name !== 'Date') {
      throw Error('Proprety DeletedAt must be Date type');
    }

    model.SoftDelete.DeletedAt = propertyKey;

    // add converter for this field
    model.Converters.set(propertyKey, DatetimeValueConverter);
  });
}

/**
 * Enable archive mode for model. If enabled all changes creates new instance in DB and old have set archived field
 * and gets attached to new model. It enabled to track changes to model in DB and also preserve data in relations.
 *
 */
export function Archived() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    if (type.name !== 'Date') {
      throw Error('Proprety DeletedAt must be Date type');
    }

    model.Archived.ArchivedAt = propertyKey;

    // add converter for this field
    model.Converters.set(propertyKey, DatetimeValueConverter);
  });
}

/**
 * Makrs field as primary key
 */
export function Primary() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, _target: any, propertyKey: string) => {
    model.PrimaryKey = propertyKey;
  });
}

/**
 * Marks columns as UUID. Column will be generated ad creation
 */
export function Ignore() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, _target: any, propertyKey: string) => {
    const columnDesc = model.Columns.find(c => c.Name === propertyKey);
    if (!columnDesc) {
      // we dont want to fill all props, they will be loaded from db and mergeg with this
      model.Columns.push({ Name: propertyKey, Ignore: true } as any);
    } else {
      columnDesc.Ignore = true;
    }
  }, true);
}


/**
 * Marks columns as UUID. Column will be generated ad creation
 */
export function Uuid() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, _target: any, propertyKey: string) => {
    const columnDesc = model.Columns.find(c => c.Name === propertyKey);
    if (!columnDesc) {
      // we dont want to fill all props, they will be loaded from db and mergeg with this
      model.Columns.push({ Name: propertyKey, Uuid: true } as any);
    } else {
      columnDesc.Uuid = true;
    }

    model.Converters.set(propertyKey, UuidConverter);
  }, true);
}

export function JunctionTable() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    model.JunctionModelProperties.push({
      Name: propertyKey,
      Model: Reflect.getMetadata('design:type', target, propertyKey),
    });
  });
}

/**
 *
 * Marks model to have discrimination map.
 *
 * @param fieldName db field name to look for
 * @param discriminationMap field - model mapping
 */
export function DiscriminationMap(fieldName: string, discriminationMap: IDiscriminationEntry[]) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, _target: any, _propertyKey: string) => {
    model.DiscriminationMap.Field = fieldName;
    model.DiscriminationMap.Models = new Map<string, Constructor<ModelBase<any>>>();

    discriminationMap.forEach(d => {
      model.DiscriminationMap.Models.set(d.Key, d.Value);
    });
  }, true);
}

/**
 * Marks relation as recursive. When relation is populated it loads all to the top
 *
 */
export function Recursive() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, _target: any, propertyKey: string) => {
    if (!model.Relations.has(propertyKey)) {
      throw new InvalidOperation(
        `cannot set recursive on not existing relation ( relation ${propertyKey} on model ${model.Name} )`,
      );
    }

    const relation = model.Relations.get(propertyKey);

    if (relation.Type !== RelationType.One) {
      throw new InvalidOperation(
        `cannot set recursive on non one-to-one relation ( relation ${propertyKey} on model ${model.Name} )`,
      );
    }

    relation.Recursive = true;
  });
}

export interface IForwardReference<T = any> {
  forwardRef: T;
}

export const forwardRef = (fn: () => any): IForwardReference => ({
  forwardRef: fn,
});

/**
 * Creates one to one relation with target model.
 *
 * @param foreignKey - foreign key name in db, defaults to lowercase property name with _id suffix eg. owner_id
 * @param primaryKey - primary key in related model, defaults to primary key taken from db
 */
export function BelongsTo(foreignKey?: string, primaryKey?: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    model.Relations.set(propertyKey, {
      Name: propertyKey,
      Type: RelationType.One,
      SourceModel: target.constructor,
      TargetModel: Reflect.getMetadata('design:type', target, propertyKey),
      ForeignKey: foreignKey ?? `${propertyKey.toLowerCase()}_id`,
      PrimaryKey: primaryKey ?? model.PrimaryKey,
      Recursive: false,
    });
  });
}


/**
 * Creates one to one relation with target model.
 *
 * @param foreignKey - foreign key name in db, defaults to lowercase property name with _id suffix eg. owner_id
 * @param primaryKey - primary key in related model, defaults to primary key taken from db
 */
export function ForwardBelongsTo(forwardRef: IForwardReference, foreignKey?: string, primaryKey?: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    model.Relations.set(propertyKey, {
      Name: propertyKey,
      Type: RelationType.One,
      SourceModel: target.constructor,
      TargetModel: forwardRef.forwardRef,
      ForeignKey: foreignKey ?? `${propertyKey.toLowerCase()}_id`,
      PrimaryKey: primaryKey ?? model.PrimaryKey,
      Recursive: false,
    });
  });
}


/**
 * Creates one to many relation with target model.
 *
 * @param targetModel - due to limitations of metadata reflection api in typescript target model mus be set explicitly
 * @param foreignKey - foreign key name in db, defaults to lowercase property name with _id suffix eg. owner_id
 * @param primaryKey
 *
 */
export function HasMany(targetModel: Constructor<ModelBase<any>>, foreignKey?: string, primaryKey?: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    model.Relations.set(propertyKey, {
      Name: propertyKey,
      Type: RelationType.Many,
      SourceModel: target.constructor,
      TargetModel: targetModel,
      ForeignKey: foreignKey ?? `${model.Name.toLowerCase()}_id`,
      PrimaryKey: primaryKey ?? model.PrimaryKey,
      Recursive: false,
    });
  });
}

/**
 * Creates many to many relation with separate join table
 *
 * @param junctionModel model for junction table
 * @param targetModel  model for related data
 * @param targetModelPKey target model primary key name
 * @param sourceModelPKey source model primary key name
 * @param junctionModelTargetPk junction table target primary key name ( foreign key for target model )
 * @param junctionModelSourcePk junction table source primary key name ( foreign key for source model )
 */
export function HasManyToMany(
  junctionModel: Constructor<ModelBase<any>>,
  targetModel: Constructor<ModelBase<any>>,
  targetModelPKey?: string,
  sourceModelPKey?: string,
  junctionModelTargetPk?: string,
  junctionModelSourcePk?: string,
) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    const targetModelDescriptor = extractModelDescriptor(targetModel);

    model.Relations.set(propertyKey, {
      Name: propertyKey,
      Recursive: false,
      Type: RelationType.ManyToMany,
      SourceModel: target.constructor,
      TargetModel: targetModel,
      ForeignKey: targetModelPKey ?? targetModelDescriptor.PrimaryKey,
      PrimaryKey: sourceModelPKey ?? model.PrimaryKey,
      JunctionModel: junctionModel,
      JunctionModelTargetModelFKey_Name: junctionModelTargetPk ?? `${targetModelDescriptor.Name.toLowerCase()}_id`,
      JunctionModelSourceModelFKey_Name: junctionModelSourcePk ?? `${model.Name.toLowerCase()}_id`,
    });
  });
}

/**
 * Mark field as datetime type. It will ensure that conversion to & from DB is valid, eg. sqlite DB
 * saves datetime as TEXT and ISO8601 strings
 */
export function DateTime() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    if (type.name !== 'Date') {
      throw Error(`Proprety  ${propertyKey} must be Date type`);
    }

    if (model.Converters.has(propertyKey)) {
      throw new InvalidArgument(`property ${propertyKey} already have data converter attached`);
    }

    model.Converters.set(propertyKey, DatetimeValueConverter);
  });
}

/**
 * Mark field as SET type. It will ensure that conversion to & from DB is valid, eg. to emulate field type SET in sqlite
 */
export function Set() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    if (type.name !== 'Array') {
      throw Error(`Proprety  ${propertyKey} must be an array type`);
    }

    if (model.Converters.has(propertyKey)) {
      throw new InvalidArgument(`property ${propertyKey} already have data converter attached`);
    }

    model.Converters.set(propertyKey, SetValueConverter);
  });
}
