import { IModelDescrtiptor } from "./interfaces";

export const MODEL_DESCTRIPTION_SYMBOL = Symbol.for("MODEL_DESCRIPTOR");

/**
 * Helper func to create model metadata
 * 
 * @param callback 
 */
function Model(callback: (model: IModelDescrtiptor, target: any, propertyKey: symbol | string, indexOrDescriptor: number | PropertyDescriptor) => void) : any {
    return (target: any, propertyKey: string | symbol, indexOrDescriptor: number | PropertyDescriptor) => {

        let metadata: IModelDescrtiptor = target[MODEL_DESCTRIPTION_SYMBOL];
        if (!metadata) {
            metadata = {
                Columns: [],
                Connection: null,
                ConnectionName: "",
                PrimaryKey: "",
                SoftDelete: null,
                TableName: "",
                Timestamps: null,
            };
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
    return Model((model: IModelDescrtiptor) => {
        model.ConnectionName = name;
    });
}

/**
 * @TableName model decorator, assigns table from database to model
 * 
 * @param name table name in database that is referred by this model
 */
export function TableName(name: string) {
    return Model((model: IModelDescrtiptor) => {
        model.TableName = name;
    });
}


/**
 * Set update & create timestamps feature to model. Proper columns must be avaible in database table.
 * It allow to track creation times & changes to model
 * 
 * @param createdColumn  created at column name in database. If not set defaults to `created_at`
 * @param updatedColumn  updated at column name in database. If not set defaults to `updated_at`
 */
export function Timestamps(createdColumn?: string, updatedColumn?: string) {
    return Model((model: IModelDescrtiptor) => {
        
        model.Timestamps  = {
            CreatedAt: (createdColumn) ? createdColumn : "created_at",
            UpdatedAt: (updatedColumn) ? updatedColumn : "updated_at"
        };
    });
}

/**
 * Sets soft delete feature to model. Soft delete dont delete model, but sets deletion date and hides from 
 * select result by default.
 * 
 * @param deletedColumn deleted at column name in databse. If not set defaults to `deleted_at`
 */
export function SoftDelete(deletedColumn?: string) {
    return Model((model: IModelDescrtiptor) => {
        model.SoftDelete = {
            DeletedAt: (deletedColumn) ? deletedColumn : "deleted_at",
        };
    });
}

/**
 * Explicit set of primary key name for this model. Use it for eg. if you want to override key name fetch from database or
 * created model on table view.
 * 
 * @param keyName primary key name
 */
export function PrimaryKey(keyName: string) {
    return Model((model: IModelDescrtiptor) => {
        model.PrimaryKey = keyName;
    });
}

 
