import { IModelDescrtiptor } from "./interfaces";
import "reflect-metadata";

export const MODEL_DESCTRIPTION_SYMBOL = Symbol.for("MODEL_DESCRIPTOR");

/**
 * Helper func to create model metadata
 * 
 * @param callback 
 */
function _model(callback: (model: IModelDescrtiptor, target: any, propertyKey: symbol | string, indexOrDescriptor: number | PropertyDescriptor) => void, base = false): any {
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
                PrimaryKey: "",
                SoftDelete: {
                    DeletedAt: ""
                },
                Archived: {
                    ArchivedAt: ""
                },
                TableName: "",
                Timestamps: {
                    CreatedAt: "",
                    UpdatedAt: ""
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
    }
}

/**
 * @Connection model decorator, assigns connection to model
 * 
 * @param name connection name, must be avaible in db config
 */
export function Connection(name: string) {
    return _model((model: IModelDescrtiptor) => {
        model.Connection = name;
    }, true);
}

/**
 * @TableName model decorator, assigns table from database to model
 * 
 * @param name table name in database that is referred by this model
 */
export function Model(tableName: string) {
    return _model((model: IModelDescrtiptor) => {
        model.TableName = tableName;
    }, true);
}


/**
 * Set create timestamps feature to model. Proper columns must be avaible in database table.
 * It allow to track creation times & changes to model
 */
export function CreatedAt() {
    return _model((model: IModelDescrtiptor, target: any, propertyKey: string) => {

        const type = Reflect.getMetadata('design:type', target, propertyKey);
        if (type.name !== "Date") {
            throw Error("Proprety CreatedAt must be Date type");
        }

        model.Timestamps.CreatedAt = propertyKey;
    });
}

/**
 * Set update timestamps feature to model. Proper columns must be avaible in database table.
 * It allow to track creation times & changes to model
 */
export function UpdatedAt() {
    return _model((model: IModelDescrtiptor, target: any, propertyKey: string) => {

        const type = Reflect.getMetadata('design:type', target, propertyKey);
        if (type.name !== "Date") {
            throw Error("Proprety UpdatedAt must be Date type");
        }

        model.Timestamps.UpdatedAt = propertyKey;
    });
}

/**
 * Sets soft delete feature to model. Soft delete dont delete model, but sets deletion date and hides from 
 * select result by default.
 */
export function SoftDelete() {
    return _model((model: IModelDescrtiptor, target: any, propertyKey: string) => {

        const type = Reflect.getMetadata('design:type', target, propertyKey);
        if (type.name !== "Date") {
            throw Error("Proprety DeletedAt must be Date type");
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
    return _model((model: IModelDescrtiptor, target: any, propertyKey: string) => {

        const type = Reflect.getMetadata('design:type', target, propertyKey);
        if (type.name !== "Date") {
            throw Error("Proprety DeletedAt must be Date type");
        }

        model.Archived.ArchivedAt = propertyKey;
    });
}

export function Primary() {
    return _model((model: IModelDescrtiptor, _target: any, propertyKey: string) => {
        model.PrimaryKey = propertyKey;
    });
}
