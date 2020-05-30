import { InvalidOperation } from '@spinajs/exceptions';
import { IRelationDescriptor, IModelDescrtiptor } from './interfaces';
import { NewInstance } from '@spinajs/di';
import { SelectQueryBuilder, QueryBuilder } from './builders';
import { extractModelDescriptor, ModelBase } from './model';
import { Orm } from './orm';

export interface IOrmRelation {
    execute(callback: (qb: QueryBuilder) => void): void;
}

export abstract class OrmRelation implements IOrmRelation {

    get Alias() {
        return this.parentRelation !== undefined ? `$${this.parentRelation}$${this._description.Name}$` : `$${this._description.Name}$`;
    }

    constructor(protected _orm: Orm, protected _query: SelectQueryBuilder<any>, protected _description: IRelationDescriptor, protected parentRelation?: OrmRelation) {

    }

    public abstract execute(callback: (qb: QueryBuilder) => void): void;
}



@NewInstance()
export class BelongsToRelation extends OrmRelation {

    protected _targetModel: Constructor<ModelBase<any>>;
    protected _targetModelDescriptor: IModelDescrtiptor;

    constructor(_orm: Orm, _query: SelectQueryBuilder<any>, _description: IRelationDescriptor) {
        super(_orm, _query, _description);

        this._targetModel = this._orm.Models.find(m => m.name === this._description.TargetModel.name)?.type ?? undefined;

        if (this._targetModel === undefined) {
            throw new InvalidOperation(`model ${this._description.TargetModel} not exists in orm module`);
        }

        this._targetModelDescriptor = extractModelDescriptor(this._targetModel);
    }

    public execute(callback: (relationOwner: QueryBuilder, relation: OrmRelation) => void) {
        this._query.columns(this._targetModelDescriptor.Columns.map((c) => {
            return `${this.Alias}.${c.Name}`;
        }));

        this._query.leftJoin(this._targetModelDescriptor.TableName, this._description.ForeignKey, this._description.PrimaryKey);

        if (callback) {
            callback(this._query, this);
        }
    }
 
}

@NewInstance()
export class OneToManyRelation {

}

@NewInstance()
export class ManyToManyRelation {

}