import { Base } from "../../class/Base.js"
import { ClassUnion, Mixin } from "../../class/Mixin.js"
import { Hook } from "../../hook/Hook.js"
import { CI } from "../../iterator/Iterator.js"
import { Logger } from "../../logger/Logger.js"
import { ContextProvider } from "../context/context_provider/ContextProvider.js"
import { ProjectSerializableData } from "../project/ProjectDescriptor.js"
import { Reporter } from "../reporter/Reporter.js"
import { TestLauncherParent } from "../test/port/TestLauncher.js"
import { Test } from "../test/Test.js"
import { TestDescriptor } from "../test/TestDescriptor.js"
import { ExitCodes, Launcher } from "./Launcher.js"

//---------------------------------------------------------------------------------------------------------------------
export class Queue extends Base {
    maxWorkers                  : number                = 5

    slots                       : Promise<unknown>[]    = []

    freeSlots                   : number[]              = []

    onFreeSlotAvailableHook     : Hook<[ this ]>        = new Hook()

    onSlotSettledHook           : Hook<[ this, unknown, PromiseSettledResult<unknown> ]>        = new Hook()

    onCompletedHook             : Hook<[ this ]>        = new Hook()


    initialize (props? : Partial<Queue>) {
        super.initialize(props)

        for (let i = 0; i < this.maxWorkers; i++) {
            this.slots.push(null)
            this.freeSlots.push(i)
        }
    }


    get isEmpty () : boolean {
        return this.freeSlots.length === this.maxWorkers
    }


    pullSingle () {
        if (this.freeSlots.length > 0) this.onFreeSlotAvailableHook.trigger(this)

        if (this.isEmpty) this.onCompletedHook.trigger(this)
    }


    pull () {
        while (this.freeSlots.length) {
            const before        = this.freeSlots.length

            this.onFreeSlotAvailableHook.trigger(this)

            if (this.isEmpty) {
                this.onCompletedHook.trigger(this)
                break
            }

            if (before === this.freeSlots.length) break
        }
    }


    async push (task : unknown, promise : Promise<unknown>) {
        if (this.freeSlots.length === 0) throw new Error("All slots are busy")

        const freeSlot          = this.freeSlots.pop()

        let value, reason

        let thrown : boolean    = false

        try {
            value   = await promise
        } catch (e) {
            reason  = e
            thrown  = true
        }

        this.freeSlots.push(freeSlot)

        if (thrown)
            this.onSlotSettledHook.trigger(this, task, { status : 'rejected', reason })
        else
            this.onSlotSettledHook.trigger(this, task, { status : 'fulfilled', value })
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Launch extends Mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

    class Launch extends base {
        launcher                    : Launcher                  = undefined
        projectData                 : ProjectSerializableData   = undefined

        projectPlanItemsToLaunch    : TestDescriptor[]          = []

        reporter                    : Reporter                  = undefined

        contextProviders            : ContextProvider[]         = []

        maxWorkers                  : number                    = 5

        exitCode                    : ExitCodes                 = undefined


        get logger () : Logger {
            return this.launcher.logger
        }

        set logger (value : Logger) {
        }


        async start () {
            await this.setup()

            await this.launch()
        }


        async setup () {
            this.reporter       = this.launcher.reporterClass.new({ colorerClass : this.launcher.colorerClass, launch : this })
        }


        async launch () {
            this.reporter.onTestSuiteStart()

            const projectPlanItems      = this.projectPlanItemsToLaunch.slice()

            if (projectPlanItems.length > 0) {
                const queue                 = Queue.new({ maxWorkers : this.maxWorkers })
                const completed             = new Promise<any>(resolve => queue.onCompletedHook.on(resolve))

                queue.onFreeSlotAvailableHook.on(() => {
                    if (projectPlanItems.length) {
                        const descriptor        = projectPlanItems.shift()

                        queue.push(descriptor, this.launchProjectPlanItem(descriptor))
                    }
                })

                queue.onSlotSettledHook.on((queue, descriptor : TestDescriptor, result) => {
                    if (result.status === 'rejected') this.reportLaunchFailure(descriptor, result.reason)

                    queue.pull()
                })

                queue.pull()

                await completed
            } else {
                this.logger.error('No tests to run')
            }

            this.reporter.onTestSuiteFinish()

            this.computeExitCode()
        }


        computeExitCode () {
            const allFinalizedProperly  = this.reporter.resultsCompleted.size === this.projectPlanItemsToLaunch.length
            const allPassed             = CI(this.reporter.resultsCompleted).every(testNode => testNode.passed)

            if (this.projectPlanItemsToLaunch.length === 0) {
                this.exitCode       = ExitCodes.DRY_RUN
            }
            else if (allFinalizedProperly && allPassed) {
                this.exitCode       = ExitCodes.PASSED
            }
            else if (allFinalizedProperly) {
                this.exitCode       = ExitCodes.FAILED
            }
            else {
                this.exitCode       = ExitCodes.UNHANDLED_EXCEPTION
            }
        }


        reportLaunchFailure (descriptor : TestDescriptor, exception : any) {
            this.logger.error(`Exception when running ${ descriptor.flatten.url }\n`, exception?.stack || exception)
        }


        async launchProjectPlanItem (item : TestDescriptor) {
            const normalized        = item.flatten

            this.logger.debug("Launching project item: ", normalized.url)

            const context           = await this.contextProviders[ 0 ].createContext()

            const testLauncher      = TestLauncherParent.new({ logger : this.logger, reporter : this.reporter })

            //---------------------
            try {
                await context.setupChannel(testLauncher, 'src/siesta/test/port/TestLauncher.js', 'TestLauncherChild')
                await testLauncher.launchTest(normalized)
            } finally {
                await testLauncher.disconnect()
                await context.destroy()
            }
        }


        async launchStandaloneSameContextTest (topTest : Test) {
            this.logger.debug("Launching standalone test: ", topTest.descriptor.url)

            const context           = await this.contextProviders[ 0 ].createContext()

            const testLauncher      = TestLauncherParent.new({ logger : this.logger, reporter : this.reporter })

            await context.setupChannel(testLauncher, 'src/siesta/test/port/TestLauncher.js', 'TestLauncherChild')

            //---------------------
            topTest.reporter        = await testLauncher.getSameContextChildLauncher()

            this.reporter.onTestSuiteStart()

            await topTest.start()

            this.reporter.onTestSuiteFinish()

            this.computeExitCode()
        }
    }
) {}
