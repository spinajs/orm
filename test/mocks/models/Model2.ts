import { Connection, PrimaryKey, SoftDelete, TableName, Timestamps } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";

@Connection("SampleConnection2")
@TableName("Table2")
@Timestamps("created","updated")
@SoftDelete("deleted")
@PrimaryKey("pkey")
export class Model2 extends ModelBase
{

}