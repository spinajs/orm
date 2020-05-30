import { IModelDescrtiptor, IMigrationDescriptor, RelationType, IRelationDescriptor } from './interfaces';
import 'reflect-metadata';
import { ModelBase } from './model';

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
        UniqueColumns: [],
        Relations: new Map<string, IRelationDescriptor>()
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

export function Unique() {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, _target: any, propertyKey: string) => {
    model.UniqueColumns.push(propertyKey);
  });
}

/**
 * Creates one to one relation with target model.
 * 
 * @param targetModel
 * @param foreignKey
 * @param primaryKey 
 */
export function BelongsTo(foreignKey: string, primaryKey?: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {

    model.Relations.set(propertyKey, {
      Name: propertyKey,
      Type: RelationType.One,
      SourceModel: target.constructor,
      TargetModel: Reflect.getMetadata('design:type', target, propertyKey),
      ForeignKey: foreignKey,
      PrimaryKey: primaryKey ?? model.PrimaryKey,
    });

  });
}


/**
 * Creates one to many relation with target model.
 * 
 * @param targetModel
 * @param foreignKey
 * @param primaryKey 
 * 
 */
export function HasMany(foreignKey: string, primaryKey?: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    model.Relations.set(propertyKey,{
      Name: propertyKey,
      Type: RelationType.Many,
      SourceModel: target.constructor,
      TargetModel: Reflect.getMetadata('design:type', target, propertyKey),
      ForeignKey: foreignKey,
      PrimaryKey: primaryKey ?? model.PrimaryKey,
    });
  });
}

/**
 * Creates many to many relation with separate join table
 * 
 * @param targetModel
 * @param foreignKey
 * @param primaryKey 
 * @param joinModelTargetPk 
 * @param joinModelSourcePk 
 */
export function HasManyToMany(joinModel: Constructor<ModelBase<any>>, foreignKey?: string, primaryKey?: string, joinModelTargetPk?: string, joinModelSourcePk?: string) {
  return extractDecoratorDescriptor((model: IModelDescrtiptor, target: any, propertyKey: string) => {
    model.Relations.set(propertyKey,{
      Name: propertyKey,
      Type: RelationType.ManyToMany,
      SourceModel: target.constructor,
      TargetModel: target.constructor.name,
      ForeignKey: foreignKey,
      PrimaryKey: primaryKey ?? model.PrimaryKey,
      JoinModel: joinModel,
      JoinModelTargetModelPKey_Name: joinModelTargetPk,
      JoinModelSourceModelPKey_Name: joinModelSourcePk
    });
  });
}