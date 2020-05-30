import { Connection, Primary, Model, BelongsTo } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";
import { RelationModel2 } from "./RelationModel2";

@Connection("sqlite")
@Model("TestTable3")
// @ts-ignore
export class RelationModel1 extends ModelBase<Model3>
{
    @Primary()
    public Id: number;

    @BelongsTo("OwnerId", "Id")
    public Owner : RelationModel2;
}
