import { Connection, Primary, Model, BelongsTo, HasMany } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";
import { Model1 } from "./Model1";


@Connection("sqlite")
@Model("TestTableRelation2")
// @ts-ignore
export class RelationModel2 extends ModelBase<RelationModel2>
{
    @Primary()
    public Id: number;
    
    @BelongsTo("OwnerId", "Id")
    public Owner : Model1;

    public Property2: string;

    @HasMany(Model1, "RelId2")
    public Many : Model1[];
}
