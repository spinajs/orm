import { Connection, PrimaryKey, SoftDelete, Model, Timestamps } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";

@Connection("SampleConnection2")
@Model("Table2")
@Timestamps("created","updated")
@SoftDelete("deleted")
@PrimaryKey("pkey")
export class Model2 extends ModelBase
{

}