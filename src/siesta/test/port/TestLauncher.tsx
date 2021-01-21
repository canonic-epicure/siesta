import { Channel } from "../../../channel/Channel.js"
import { Base } from "../../../class/Base.js"
import { ClassUnion, Mixin } from "../../../class/Mixin.js"
import { local, remote } from "../../../port/Port.js"
import { PortEvaluateChild, PortEvaluateParent } from "../../../port/PortEvaluate.js"
import { PortHandshakeChild, PortHandshakeParent } from "../../../port/PortHandshake.js"
import { SiestaJSX } from "../../jsx/Factory.js"
import { TestDescriptor } from "../TestDescriptor.js"
import { globalTestEnv, Test } from "../Test.js"
import { TestReporterChild, TestReporterParent } from "./TestReporter.js"

//---------------------------------------------------------------------------------------------------------------------
// make sure we actually import these class symbols (and not just types),
// so that their `registerSerializableClass()` calls are made

TestDescriptor

//---------------------------------------------------------------------------------------------------------------------
interface TestLauncher {
    launchTest (testDescriptor : TestDescriptor) : Promise<any>
}

//---------------------------------------------------------------------------------------------------------------------
export class TestLauncherParent extends Mixin(
    [ TestReporterParent, PortEvaluateParent, PortHandshakeParent ],
    (base : ClassUnion<typeof TestReporterParent, typeof PortEvaluateParent, typeof PortHandshakeParent>) => {

        class TestLauncherParent extends base implements TestLauncher {
            @remote()
            launchTest : (testDescriptor : TestDescriptor) => Promise<any>
        }

        return TestLauncherParent
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
export class TestLauncherChild extends Mixin(
    [ TestReporterChild, PortEvaluateChild, PortHandshakeChild ],
    (base : ClassUnion<typeof TestReporterChild, typeof PortEvaluateChild, typeof PortHandshakeChild>) => {

        class TestLauncherChild extends base implements TestLauncher {

            @local()
            async launchTest (testDescriptor : TestDescriptor) {
                if (globalTestEnv.topTest) throw new Error("Test context is already running a test")

                globalTestEnv.topTestDescriptor = testDescriptor
                globalTestEnv.launcher          = this

                let topTest : Test

                try {
                    await import(testDescriptor.url)
                } catch (e) {
                    // there might be no `topTest` if test file does not contain any calls
                    // to static `it` method of any test class
                    topTest = globalTestEnv.topTest || Test.new({
                        descriptor      : testDescriptor,
                        reporter        : this
                    })

                    topTest.failOnExceptionDuringImport(e)

                    globalTestEnv.clear()

                    return
                }

                // there might be no `topTest` if test file does not contain any calls
                // to static `it` method of any test class
                topTest = globalTestEnv.topTest || Test.new({
                    descriptor      : testDescriptor,
                    reporter        : this
                })

                await topTest.start()

                globalTestEnv.clear()
            }
        }

        return TestLauncherChild
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
export class ChannelTestLauncher extends Mixin(
    [ Channel, Base ],
    (base : ClassUnion<typeof Channel, typeof Base>) => {

        class ChannelTestLauncher extends base {
            parentPort              : TestLauncherParent                = undefined
            parentPortClass         : typeof TestLauncherParent         = TestLauncherParent

            childPortClassUrl       : string                            = import.meta.url
            childPortClassSymbol    : string                            = 'TestLauncherChild'
        }

        return ChannelTestLauncher
    }
) {}
