import { Base } from "../../class/Base.js"
import { ClassUnion, Mixin } from "../../class/Mixin.js"
import { LogLevel } from "../../logger/Logger.js"
import { saneSplit } from "../../util/Helpers.js"
import { relative } from "../../util/Path.js"
import { Launch } from "../project/Launch.js"
import { Project } from "../project/Project.js"
import { Assertion, AssertionAsync, LogMessage, Result, TestNodeResult, TestResult } from "../test/Result.js"
import { Colorer } from "./Colorer.js"

// //---------------------------------------------------------------------------------------------------------------------
// export type Color   = string
//
// //---------------------------------------------------------------------------------------------------------------------
// export class Style extends Base {
//     fgColor         : Color         = ''
//     bgColor         : Color         = ''
// }
//
// //---------------------------------------------------------------------------------------------------------------------
// export class IncreaseIndent extends Base {
//     by              : number        = 0
// }
//
// //---------------------------------------------------------------------------------------------------------------------
// export class SetIndent extends Base {
//     to              : number        = 0
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class CancelPreviousIndent extends Base {
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export type ReportingCommand    = string | Style | IncreaseIndent | SetIndent | CancelPreviousIndent
//
//
// export class ReportingSequence extends Base {
//     commands        : ReportingCommand[]        = []
// }

//---------------------------------------------------------------------------------------------------------------------
export class TextBlock extends Base {
    text            : string[][]        = [ [] ]


    addSameLineText (str : string) {
        this.text[ this.text.length - 1 ].push(str)
    }


    addNewLine () {
        this.text.push([])
    }


    push (...strings : string[]) {
        strings.forEach(string => saneSplit(string, '\n').forEach((str, index, array) => {
            this.addSameLineText(str)

            if (index !== array.length - 1) this.addNewLine()
        }))
    }


    pullFrom (another : TextBlock) {
        this.text.push(...another.text)
    }


    toString () : string {
        return this.text.map(parts => parts.join('')).join('\n')
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class ReporterTheme extends Base {
    reporter    : Reporter      = undefined

    get c () : Colorer {
        return this.reporter.c
    }

    get project () : Project {
        return this.reporter.launch.project
    }


    testFilePass (testNode : TestNodeResult) : string {
        return this.c.green.inverse.text(' PASS ')
    }

    testFileFail (testNode : TestNodeResult) : string {
        return this.c.red.inverse.text(' FAIL ')
    }

    subTestPass (testNode : TestNodeResult) : string {
        return this.c.green.text('✔')
    }

    subTestFail (testNode : TestNodeResult) : string {
        return this.c.red.text('✘')
    }

    assertionPass (assertion : Assertion) : string {
        return this.c.green.text('✔')
    }

    assertionFail (assertion : Assertion) : string {
        return this.c.red.text('✘')
    }

    logMessage (message : LogMessage) : string {
        return this.c.yellow.text('⚠')
    }


    testNodeState (testNode : TestNodeResult) : string {
        if (testNode.state === 'completed') {
            if (testNode.isRoot) {
                return testNode.passed ? this.testFilePass(testNode) : this.testFileFail(testNode)
            } else {
                return testNode.passed ? this.subTestPass(testNode) : this.subTestFail(testNode)
            }
        } else {
            return this.c.bgYellowBright.black.text(' RUNS ')
        }
    }


    testNodeUrl (testNode : TestNodeResult) : string {
        const rel       = relative(this.project.baseUrl, testNode.descriptor.url)
        const match     = /(.*?\/)?([^/]+)/.exec(rel)

        return this.c.gray.text(match[ 1 ] || '') + this.c.whiteBright.text(match[ 2 ])
    }


    assertionTemplate (assertion : Assertion) : TextBlock {
        let text : TextBlock     = TextBlock.new()

        text.push(
            assertion.passed ? this.assertionPass(assertion) : this.assertionFail(assertion),
            ' ',
            this.c.whiteBright.text(`[${ assertion.name }]`),
            ' ',
            assertion.description
        )

        return text
    }


    logMessageMethod (message : LogMessage) : string {
        switch (message.level) {
            case LogLevel.error :
                return this.c.red.inverse.text(` ${ LogLevel[ message.level ].toUpperCase() } `)
            case LogLevel.warn :
                return this.c.redBright.inverse.text(` ${ LogLevel[ message.level ].toUpperCase() } `)

            default :
                return this.c.inverse.text(` ${ LogLevel[ message.level ].toUpperCase() } `)
        }
    }


    logMessageTemplate (message : LogMessage) : TextBlock {
        let text : TextBlock     = TextBlock.new()

        text.push(
            this.logMessage(message),
            ' ',
            this.c.whiteBright.text(this.logMessageMethod(message)),
            ' ',
            message.message
        )

        return text
    }


    treeLine (str : string) : string {
        return this.c.gray.text(str)
    }


    testSuiteHeader () : string {
        return `Launching test suite: ${ this.c.underline.text(this.project.title) }\n`
    }
}


//---------------------------------------------------------------------------------------------------------------------
export type ReporterDetailing   = 'file' | 'subtest' | 'assertion'

// export type ReporterStreaming   = 'live' | 'after_completion'

//---------------------------------------------------------------------------------------------------------------------
export class Reporter extends Mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

    class Reporter extends base {
        launch              : Launch                    = undefined

        detailing           : ReporterDetailing         = 'assertion'
        includePassed       : boolean                   = true

        // streaming           : ReporterStreaming         = 'after_completion'

        resultsCompleted    : Set<TestNodeResult>       = new Set()
        resultsRunning      : Set<TestNodeResult>       = new Set()

        // activeTestNode      : TestNodeResult            = undefined

        // indentLevelsStack   : number[]                  = [ 0 ]

        c                   : Colorer                   = undefined
        t                   : ReporterTheme             = ReporterTheme.new({ reporter : this })


        needToShowResult (result : TestResult) : boolean {
            if (
                this.detailing === 'assertion' && (result instanceof Assertion || result instanceof TestNodeResult)
                ||
                this.detailing === 'subtest' && (result instanceof TestNodeResult)
            ) {
                return this.includePassed || !result.passed
            } else {
                return true
            }
        }


        testNodeTemplate (testNode : TestNodeResult, isLastNode : boolean = false) : TextBlock {
            let text : TextBlock     = TextBlock.new()

            if (testNode.parentNode) {
                text.push(`${ this.t.testNodeState(testNode) } ${this.c[ this.detailing === 'assertion' ? 'underline' : 'noop' ].text(testNode.descriptor.title)}`)
            } else {
                text.push(`${ this.t.testNodeState(testNode) } ${this.t.testNodeUrl(testNode)}`)
            }

            if (this.detailing === 'assertion' || this.detailing === 'subtest') {
                const nodesToShow : TestResult[]  = testNode.resultLog.filter(result => this.needToShowResult(result))

                nodesToShow.forEach((result, index) => {
                    const isLast            = index === nodesToShow.length - 1

                    const childTextBlock    = (result instanceof TestNodeResult)
                        ?
                            this.testNodeTemplate(result, isLast)
                        :
                            (result instanceof Assertion)
                                ?
                                    this.t.assertionTemplate(result)
                                :
                                (result instanceof LogMessage)
                                    ?
                                        this.t.logMessageTemplate(result)
                                    :
                                        TextBlock.new()

                    childTextBlock.text.forEach((strings, index) => {
                        if (index === 0) {
                            strings.unshift(isLast && isLastNode ? this.t.treeLine('└─') : this.t.treeLine('├─'))
                        } else {
                            strings.unshift(isLast && isLastNode ? '  ' : this.t.treeLine('│ '))
                        }
                    })

                    text.pullFrom(childTextBlock)
                })
            }

            return text
        }


        onSubTestStart (testNode : TestNodeResult) {
            if (testNode.isRoot) this.resultsRunning.add(testNode)
        }

        onSubTestFinish (testNode : TestNodeResult) {
            if (testNode.isRoot) {
                if (!this.resultsRunning.has(testNode)) throw new Error("Test completed before starting")

                this.resultsRunning.delete(testNode)

                this.resultsCompleted.add(testNode)

                this.c.write(this.testNodeTemplate(testNode, this.resultsCompleted.size === this.launch.projectPlanItemsToLaunch.length).toString())
            }
        }

        onResult (testNode : TestNodeResult, assertion : Result) {
        }


        onAssertionFinish (testNode : TestNodeResult, assertion : AssertionAsync) {
        }


        onTestSuiteStart () {
            this.c.write(this.t.testSuiteHeader())
        }


        onTestSuiteFinish () {

        }
    }
) {}
