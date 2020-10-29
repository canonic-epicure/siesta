import { Base } from "../../class/Base.js"
import { AnyConstructor, ClassUnion, Mixin } from "../../class/Mixin.js"
import { TreeNode } from "../../tree/TreeNode.js"
import { Agent } from "../agent/Agent.js"
import { Assertion } from "./Result.js"

//---------------------------------------------------------------------------------------------------------------------
export type TestCode = <T extends Test>(t : T) => any

export type TestDescriptor<T extends typeof Test> = string | {
    name?           : string

    testClass?      : T

    env?            : 'generic' | 'browser' | 'nodejs'

    tags?           : string[]
}

//---------------------------------------------------------------------------------------------------------------------
export class TestNode extends Mixin(
    [ TreeNode, Base ],
    (base : AnyConstructor<TreeNode & Base, typeof TreeNode & typeof Base>) =>

    class TestNode extends base {
        assertions      : Assertion[]       = []

        isTodo          : boolean           = false

        code            : TestCode          = undefined

        ongoing         : Promise<any>      = undefined


        addAssertion (assertion : Assertion) {
            this.assertions.push(assertion)
        }


        pass (description : string = '', annotation : string = '') {
            this.addAssertion(Assertion.new({
                passed  : true,
                description,
                annotation
            }))
        }


        fail (description : string = '', annotation : string = '') {
            this.addAssertion(Assertion.new({
                passed  : false,
                description,
                annotation
            }))
        }


        ok<V> (value : V, description : string = '') {

        }


        is<V> (value1 : V, value2 : V, description : string = '') {

        }


        it<T extends typeof Test> (name : TestDescriptor<T>, code : TestCode) : any {

        }


        describe<T extends typeof Test> (name : TestDescriptor<T>, code : TestCode) : any {
            return this.it(name, code)
        }


        async start () {

        }


        async launch () {

        }
    }
) {}


export class Test extends Mixin(
    [ TestNode ],
    (base : AnyConstructor<TestNode, ClassUnion<typeof TestNode>>) =>

    class Test extends base {

        agent           : Agent             = undefined


        async setup () {

        }


        async tearDown () {

        }
    }
){}
