import { MODEL_DESCTRIPTION_SYMBOL } from "./decorators";
import { IModelDescrtiptor } from "./interfaces";

export abstract class ModelBase {

    public CreatedAt?: Date;
    public UpdatedAt?: Date;
    public DeletedAt?: Date;

    public get PrimaryKeyName(){
        return ((this.constructor as any)[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor).PrimaryKey;
    }
}