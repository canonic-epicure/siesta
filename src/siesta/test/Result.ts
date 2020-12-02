import { Base } from "../../class/Base.js"
import { ClassUnion, Mixin } from "../../class/Mixin.js"
import { LogLevel } from "../../logger/Logger.js"
import { registerSerializableClass, Serializable } from "../../serializable/Serializable.js"
import { TestDescriptor } from "./Descriptor.js"
import { LUID, luid } from "./LUID.js"

//---------------------------------------------------------------------------------------------------------------------
export class Result extends Mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

    class Result extends base {
        localId     : number            = luid()
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
export class LogMessage extends Mixin(
    [ Serializable, Result ],
    (base : ClassUnion<typeof Serializable, typeof Result>) =>

    class LogMessage extends base {
        level       : LogLevel      = LogLevel.log

        message     : string        = ''
    }
) {}

registerSerializableClass('LogMessage', LogMessage)

//---------------------------------------------------------------------------------------------------------------------
export class Exception extends Mixin(
    [ Serializable, Result ],
    (base : ClassUnion<typeof Serializable, typeof Result>) =>

    class Exception extends base {
        exception       : Error         = undefined
    }
) {}

registerSerializableClass('Exception', Exception)

//---------------------------------------------------------------------------------------------------------------------
export class Assertion extends Mixin(
    [ Serializable, Result ],
    (base : ClassUnion<typeof Serializable, typeof Result>) =>

    class Assertion extends base {
        name            : string            = ''

        passed          : boolean           = true

        description     : string            = ''

        annotation      : string            = ''
    }
) {}

registerSerializableClass('Assertion', Assertion)

//---------------------------------------------------------------------------------------------------------------------
export class AssertionAsync extends Mixin(
    [ Serializable, Result ],
    (base : ClassUnion<typeof Serializable, typeof Result>) =>

    class AssertionAsync extends base {
        ongoing     : Promise<any>                          = undefined

        state       : 'pending' | 'resolved' | 'rejected'   = 'pending'


        toJSON (key : string) : Partial<this> {
            const jsonObj       = super.toJSON(key)

            delete jsonObj.ongoing

            return jsonObj
        }
    }
) {}

registerSerializableClass('AssertionAsync', AssertionAsync)

//---------------------------------------------------------------------------------------------------------------------
export type TestNodeState   = 'created' | 'running' | 'completed'

// serializable leaf nodes
export type TestResultLeaf  = Exception | LogMessage | Assertion | AssertionAsync
// non-serializable tree node - the serializable part is `descriptor`
export type TestResultTree  = TestNodeResult

export type TestResult      = TestResultLeaf | TestResultTree


export class TestNodeResult extends Mixin(
    [ Result ],
    (base : ClassUnion<typeof Result>) => {

    class TestNodeResult extends base {
        // TODO should probably have separate flag for assertions??
        // (I guess still valid to throw exceptions even if can not add assertions??)
        frozen          : boolean           = false

        state           : TestNodeState     = 'created'

        descriptor      : TestDescriptor    = undefined

        parentNode      : TestNodeResult    = undefined

        resultLog       : TestResult[]      = []

        resultMap       : Map<LUID, number> = new Map()


        $depth           : number    = undefined

        get depth () : number {
            if (this.$depth !== undefined) return this.$depth

            let depth                   = 0
            let node : TestNodeResult   = this

            while (node.parentNode) { node = node.parentNode; depth++ }

            return this.$depth = depth
        }


        isRoot () : boolean {
            return !this.parentNode
        }


        $root           : TestNodeResult    = undefined

        get root () : TestNodeResult {
            if (this.$root !== undefined) return this.$root

            let root : TestNodeResult       = this

            while (root.parentNode) root    = root.parentNode

            return this.$root = root
        }


        addResult (result : TestResult) {
            if (this.frozen) throw new Error("Adding result after test finalization")

            if (result instanceof TestNodeResult) this.$childNodes = undefined

            this.resultLog.push(result)
            this.resultMap.set(result.localId, this.resultLog.length - 1)
        }


        updateResult (result : TestResult) {
            if (this.frozen) throw new Error("Updating result after test finalization")

            if (!this.resultMap.has(result.localId)) throw new Error("Result to update does not exists")

            this.resultLog[ this.resultMap.get(result.localId) ] = result
        }


        pass (description : string = '', annotation : string = '') {
            this.addResult(Assertion.new({
                name            : 'pass',
                passed          : true,
                description,
                annotation
            }))
        }


        fail (description : string = '', annotation : string = '') {
            this.addResult(Assertion.new({
                name            : 'fail',
                passed          : false,
                description,
                annotation
            }))
        }


        // toJSON () {
        //     const obj : any     = Object.assign({}, this)
        //
        //     obj.parentNode      = this.parentNode ? this.parentNode.localId : undefined
        //
        //     return obj
        // }


        $passed   : boolean       = undefined

        get passed () : boolean {
            if (this.$passed !== undefined) return this.$passed

            let passed : boolean    = true

            this.resultLog.forEach(result => {
                if (result instanceof Exception) passed = false

                if ((result instanceof Assertion) && !result.passed) passed = false

                if ((result instanceof TestNodeResult) && !result.passed) passed = false
            })

            return this.$passed     = passed
        }


        $childNodes   : TestNodeResult[]       = undefined

        get childNodes () : TestNodeResult[] {
            if (this.$childNodes !== undefined) return this.$childNodes

            return this.$childNodes = (this.resultLog as TestNodeResult[]).filter(result => {
                return result instanceof TestNodeResult
            })
        }
    }

    return TestNodeResult
}) {}
