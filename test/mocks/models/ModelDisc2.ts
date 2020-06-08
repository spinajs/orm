import { Connection, Primary, Model } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";


@Connection("sqlite")
@Model("Discrimination")
// @ts-ignore
export class ModelDisc2 extends ModelBase<ModelDisc2>
{
    @Primary()
    public Id: number;
}
