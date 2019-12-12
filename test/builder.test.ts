import { DI } from "@spinajs/di";
// import * as chai from 'chai';
import * as _ from "lodash";
import 'mocha';
import * as sinon from "sinon";
// import { OrmDriver, SelectQueryCompiler } from "./../src";
// import { SelectQueryBuilder } from './../src/builders';

// const expect = chai.expect;


 
describe("Models test", () => {
 
    afterEach(async ()=>{
        DI.clear();
        sinon.restore();
    });
    
    it("Inject compiler", async () => {
        // const queryCompiler = sinon.createStubInstance(SelectQueryCompiler);
        // const ormDriver = sinon.createStubInstance(OrmDriver);


        // DI.register(()=>{
        //     queryCompiler.compile = sinon.stub<[], any>().resolves({
        //         bindings: [],
        //         expression: "SELECT * FROM foo"
        //     });

        //     return queryCompiler;
        // }).as(SelectQueryCompiler);

        // DI.register(()=>{
        //     ormDriver.execute = sinon.stub<[string | object], any>().resolves(true);
        //     return ormDriver;
        // }).as(OrmDriver);
        

        // const builder = DI.resolve<SelectQueryBuilder>(SelectQueryBuilder);
        // builder.where("id", 1).firstOrFail();

        // const result =  await builder.toDB();

        // expect(result).to.be.true;
        // expect(ormDriver.execute.calledOnce).to.be.true;
    })

});