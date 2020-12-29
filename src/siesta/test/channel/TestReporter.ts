import { Channel, local, remote } from "../../../channel/Channel.js"
import { ClassUnion, Mixin } from "../../../class/Mixin.js"
import { XmlElement } from "../../jsx/XmlElement.js"
import { Reporter } from "../../reporter/Reporter.js"
import { AssertionWaitFor } from "../assertion/Async.js"
import { TestDescriptor } from "../Descriptor.js"
import { LUID } from "../LUID.js"
import { Assertion, AssertionAsyncCreation, AssertionAsyncResolution, Exception, LogMessage, TestNodeResult, TestResultLeaf } from "../Result.js"

//---------------------------------------------------------------------------------------------------------------------
// make sure we actually import these class symbols (and not just types),
// so that their `@serializable()` decorator calls are made

Assertion
AssertionAsyncCreation
AssertionAsyncResolution
AssertionWaitFor
Exception
LogMessage
XmlElement

//---------------------------------------------------------------------------------------------------------------------
interface TestReporterChannel {
    onSubTestStart (testNodeId : LUID, parentTestNodeId : LUID, descriptor : TestDescriptor)

    onSubTestFinish (testNodeId : LUID)

    onResult (testNodeId : LUID, result : TestResultLeaf)

    onAssertionFinish (testNodeId : LUID, assertion : AssertionAsyncResolution)
}

//---------------------------------------------------------------------------------------------------------------------
export class TestReporterParent extends Mixin(
    [ Channel ],
    (base : ClassUnion<typeof Channel>) => {

        class TestReporterParent extends base implements TestReporterChannel {

            reporter                    : Reporter              = undefined

            topTestNodeResult           : TestNodeResult        = undefined

            currentTestNodeResult       : TestNodeResult        = undefined

            // @local()
            // onTopTestStart () : Promise<any> {
            //     return
            // }
            //
            // @local()
            // onTopTestFinish () : Promise<any> {
            //     return
            // }

            @local()
            onSubTestStart (testNodeId : LUID, parentTestNodeId : LUID, descriptor : TestDescriptor) {
                if (this.currentTestNodeResult) {
                    if (this.currentTestNodeResult.localId !== parentTestNodeId) {
                        throw new Error("Parent test node internal id mismatch")
                    }

                    const newNode       = TestNodeResult.new({
                        localId         : testNodeId,
                        descriptor      : descriptor,
                        state           : 'running',

                        parentNode      : this.currentTestNodeResult
                    })

                    this.currentTestNodeResult.addResult(newNode)

                    this.currentTestNodeResult  = newNode
                } else {
                    const newNode       = TestNodeResult.new({
                        localId         : testNodeId,
                        descriptor      : descriptor,
                        state           : 'running',
                    })

                    this.currentTestNodeResult  = this.topTestNodeResult = newNode
                }

                this.reporter.onSubTestStart(this.currentTestNodeResult)
            }

            @local()
            onSubTestFinish (testNodeId : LUID) {
                if (!this.currentTestNodeResult || this.currentTestNodeResult.localId !== testNodeId) {
                    throw new Error("No current test node or test node id mismatch")
                }

                this.currentTestNodeResult.frozen   = true
                this.currentTestNodeResult.state    = "completed"

                this.reporter.onSubTestFinish(this.currentTestNodeResult)

                this.currentTestNodeResult          = this.currentTestNodeResult.parentNode
            }


            @local()
            onResult (testNodeId : LUID, result : TestResultLeaf) {
                if (!this.currentTestNodeResult || this.currentTestNodeResult.localId !== testNodeId) {
                    throw new Error("Parent node id mismatch for test result")
                }

                this.currentTestNodeResult.addResult(result)

                this.reporter.onResult(this.currentTestNodeResult, result)
            }


            @local()
            onAssertionFinish (testNodeId : LUID, assertion : AssertionAsyncResolution) {
                if (!this.currentTestNodeResult || this.currentTestNodeResult.localId !== testNodeId) {
                    throw new Error("Parent node id mismatch for asynchronous test result finalization")
                }

                this.currentTestNodeResult.addAsyncResolution(assertion)

                this.reporter.onAssertionFinish(this.currentTestNodeResult, assertion)
            }
        }

        return TestReporterParent
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
export class TestReporterChild extends Mixin(
    [ Channel ],
    (base : ClassUnion<typeof Channel>) => {

        class TestReporterChild extends base implements TestReporterChannel {
            @remote()
            onSubTestStart : (testNodeId : LUID, parentTestNodeId : LUID, descriptor : TestDescriptor) => any

            @remote()
            onSubTestFinish : (testNodeId : LUID) => any

            @remote()
            onResult : (testNodeId : LUID, result : TestResultLeaf) => any

            @remote()
            onAssertionFinish : (testNodeId : LUID, assertion : AssertionAsyncResolution) => any
        }

        return TestReporterChild
    }
) {}


