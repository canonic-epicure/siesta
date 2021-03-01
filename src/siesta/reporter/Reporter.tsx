import { Base } from "../../class/Base.js"
import { ClassUnion, Mixin } from "../../class/Mixin.js"
import { Colorer } from "../../jsx/Colorer.js"
import { TextJSX } from "../../jsx/TextJSX.js"
import { Tree } from "../../jsx/Tree.js"
import { XmlElement } from "../../jsx/XmlElement.js"
import { LogLevel } from "../../logger/Logger.js"
import { relative } from "../../util/Path.js"
import { Launch } from "../launcher/Launch.js"
import { ProjectDescriptor } from "../project/ProjectOptions.js"
import { Assertion, AssertionAsyncResolution, Exception, LogMessage, Result, SourcePoint, TestNodeResult, TestResult } from "../test/TestResult.js"
import { Printer } from "./Printer.js"
import { randomSpinner, Spinner } from "./Spinner.js"


//---------------------------------------------------------------------------------------------------------------------
export class ReporterTheme extends Base {
    reporter    : Reporter              = undefined

    get progressBarTotalLength () : number {
        return Math.min(this.reporter.getMaxLen() - this.spinner().length - 2, 50)
    }


    get c () : Colorer {
        return this.reporter.c
    }

    get projectDescriptor () : ProjectDescriptor {
        return this.reporter.launch.projectDescriptor
    }

    get launch () : Launch {
        return this.reporter.launch
    }


    testFilePass (testNode : TestNodeResult) : XmlElement {
        return <span class='test_file_pass'> PASS </span>
    }

    testFileFail (testNode : TestNodeResult) : XmlElement {
        return <span class='test_file_fail'> FAIL </span>
    }

    subTestPass (testNode : TestNodeResult) : XmlElement {
        return <span class='sub_test_pass'>✔</span>
    }

    subTestFail (testNode : TestNodeResult) : XmlElement {
        return <span class='sub_test_fail'>✘</span>
    }


    testNodeState (testNode : TestNodeResult) : XmlElement {
        if (testNode.isRoot) {
            return testNode.passed ? this.testFilePass(testNode) : this.testFileFail(testNode)
        } else {
            return testNode.passed ? this.subTestPass(testNode) : this.subTestFail(testNode)
        }
    }


    testFileRunning (testNode : TestNodeResult) : XmlElement {
        return <div class="test_file_runs"> RUNS </div>
    }


    testNodeUrl (testNode : TestNodeResult) : XmlElement {
        const rel       = relative(this.projectDescriptor.projectPlan.url, testNode.descriptor.url)
        const match     = /(.*\/)?([^\/]+)/.exec(rel)

        return <span>
            <span class="test_file_url_dirname">{ match[ 1 ] || '' }</span><span class="test_file_url_filename">{ match[ 2 ] }</span>
        </span>
    }


    assertionTemplate (assertion : Assertion, testNode : TestNodeResult, sources : string[]) : XmlElement {
        const cls   = testNode.isTodo ?
            assertion.passed ? 'assertion_icon_pass_todo' : 'assertion_icon_pass'
        :
            assertion.passed ? 'assertion_icon_pass' : 'assertion_icon_fail'

        const passed                = assertion.passed || testNode.isTodo
        const canShowSourceContext  = sources && assertion.sourcePoint && this.reporter.sourceContext > 0

        return <div class="assertion">
            <span class={`assertion_icon ${ cls }`}>{ assertion.passed ? '✔' : '✘' }</span>{ ' ' }
            <span class="assertion_name">{ assertion.name }</span>
            <span class="assertion_description">{ assertion.description ? ' ' + assertion.description : '' }</span>
            { assertion.sourcePoint ? [ ' at line ', <span class="assertion_source_line">{ assertion.sourcePoint.line }</span> ] : false }
            { passed || !canShowSourceContext ? false : this.sourcePointTemplate(assertion.sourcePoint, sources) }
            { passed ? false : assertion.annotation }
        </div>
    }



    lineNumberTemplate (isHighlighted : boolean, line : string) : XmlElement {
        return <span>
            <span class="fail_color">{ isHighlighted ? '➤' : ' ' }</span>
            <span class={ isHighlighted ? 'accented' : 'gray' }> { line } | </span>
        </span>
    }


    sourcePointTemplate ({ line, char } : SourcePoint, sources : string[]) : XmlElement {
        const template              = <div class="source_point"><div></div></div>

        const firstToShow           = Math.max(1, Math.round(line - this.reporter.sourceContext / 2))
        const lastToShow            = Math.min(sources.length, Math.round(line + this.reporter.sourceContext / 2))

        const lastToShowLen         = String(lastToShow).length

        for (let i = firstToShow; i < lastToShow; i++) {
            const isHighlighted     = i === line
            const lineStr           = String(i)
            const lenDelta          = lastToShowLen - lineStr.length

            template.appendChild(<div>
                { this.lineNumberTemplate(isHighlighted, ' '.repeat(lenDelta) + lineStr) }
                <span class={ isHighlighted ? "accented" : "gray" }>{ sources[ i - 1 ] }</span>
            </div>)

            if (isHighlighted) template.appendChild(<div>
                <span class="gray"> { ' '.repeat(lastToShowLen + 1) } | </span>
                <span class="fail_color">{ ' '.repeat(char - 1) + '^' }</span>
            </div>)
        }

        template.appendChild(<div></div>)

        return template
    }


    logMessageTemplate (message : LogMessage) : XmlElement {
        return <div class="log_message">
            <span class='log_message_icon'>ⓘ</span>
            { ' ' }
            <span class={ `log_message_${ LogLevel[ message.level ].toLowerCase() }` }> { LogLevel[ message.level ].toUpperCase() } </span>
            { ' ' }
            { message.message }
        </div>
    }


    exceptionTemplate (exception : Exception) : XmlElement {
        return <div class="exception">
            <div class='exception_icon'> EXCEPTION </div>
            <div class='indented'>{ exception.stack || exception }</div>
        </div>
    }


    testSuiteHeader () : XmlElement {
        return <div>
            Launching { this.launch.type === 'project' ? 'test suite project' : 'test file'}: <span class="project_title">{ this.projectDescriptor.projectPlan.title }</span>
            <div></div>
        </div>
    }


    testSuiteFooter () : XmlElement {
        let text : XmlElement       = <div></div>

        if (this.reporter.resultsRunning.size > 0 && this.reporter.resultsCompleted.size > 0) text.appendChild(<div></div>)

        this.reporter.resultsRunning.forEach(testNodeResult => {
            text.appendChild(
                this.testFileRunning(testNodeResult),
                ' ',
                this.testNodeUrl(testNodeResult)
            )
        })

        text.appendChild(<div></div>)

        text.appendChild(<div class="summary">
            { 'Test suite : ' }
            <span class="summary_tests_passed">{ this.reporter.filesPassed } passed, </span>
            <span class={ this.reporter.filesFailed > 0 ? "summary_tests_failed" : '' }>{ this.reporter.filesFailed } failed, </span>
            <span class="summary_tests_total">{ this.launch.projectPlanItemsToLaunch.length } total</span>
            <div>
                { 'Time       : ' }
                { humanReadableDuration(Date.now() - this.reporter.startTime.getTime()) }
            </div>
        </div>)

        return text
    }


    progressBar () : XmlElement {
        const completedChars = Math.round(this.reporter.resultsCompleted.size / this.launch.projectPlanItemsToLaunch.length * this.progressBarTotalLength)

        return <span>
            <span class={ this.reporter.filesFailed > 0 ? 'progress_bar_completed_failed' : 'progress_bar_completed_passed' }>{ ' '.repeat(completedChars) }</span>
            <span class="progress_bar_pending">{ '░'.repeat(this.progressBarTotalLength - completedChars) }</span>
        </span>
    }


    spinner () : string {
        return this.reporter.spinner.frame
    }
}

//---------------------------------------------------------------------------------------------------------------------
export type ReporterDetailing   = 'file' | 'subtest' | 'assertion'


//---------------------------------------------------------------------------------------------------------------------
export class Reporter extends Mixin(
    [ Printer, Base ],
    (base : ClassUnion<typeof Printer, typeof Base>) => {

    class Reporter extends base {
        launch              : Launch                    = undefined

        get detail () : ReporterDetailing {
            return this.launch.launcher.detail
        }
        get sourceContext () : number {
            return this.launch.launcher.sourceContext
        }

        filesPassed         : number                    = 0
        filesFailed         : number                    = 0

        resultsCompleted    : Set<TestNodeResult>       = new Set()
        resultsRunning      : Set<TestNodeResult>       = new Set()

        resultsFinished     : Set<{ testNode : TestNodeResult, sources : string[] }>      = new Set()

        t                   : ReporterTheme             = ReporterTheme.new({ reporter : this })

        spinner             : Spinner                   = randomSpinner()

        startTime           : Date                      = undefined
        endTime             : Date                      = undefined


        // failed assertions are always included (along with all their parent sub-tests)
        // otherwise, include everything at the specified `detail` level
        needToShowResult (result : TestResult, isTodo : boolean) : boolean {
            if (result instanceof Assertion) {
                return this.detail === 'assertion' ? true : isTodo ? false : !result.passed
            }
            else if (result instanceof TestNodeResult) {
                if (this.detail === 'assertion') return true

                return this.detail === 'subtest' ? true : isTodo ? false : !result.passed
            } else {
                return true
            }
        }


        testNodeTemplateXml (testNode : TestNodeResult, isTopLevelLastNode : boolean | undefined = undefined, sources : string[]) : XmlElement {
            let node : XmlElement       = <Tree isTopLevelLastNode={ isTopLevelLastNode }></Tree>

            if (testNode.isRoot) {
                node.appendChild(this.t.testNodeState(testNode), ' ', this.t.testNodeUrl(testNode))
            } else {
                node.appendChild(
                    this.t.testNodeState(testNode),
                    ' ',
                    testNode.isTodo ? <span class="accented">[todo] </span> : '',
                    <span class={ this.detail === 'assertion' ? 'underline' : '' }>{ testNode.descriptor.title }</span>,
                )
            }

            const nodesToShow : TestResult[]  = testNode.resultLog.filter(result => this.needToShowResult(result, testNode.isTodo))

            nodesToShow.forEach((result, index) => {
                const isLast            = index === nodesToShow.length - 1

                node.appendChild(<leaf>{
                    (result instanceof Assertion)
                        ?
                            this.t.assertionTemplate(result, testNode, sources)
                        :
                            (result instanceof TestNodeResult)
                                ?
                                    this.testNodeTemplateXml(result, undefined, sources)
                                :
                                (result instanceof LogMessage)
                                    ?
                                        this.t.logMessageTemplate(result)
                                    :
                                        (result instanceof Exception)
                                            ?
                                                this.t.exceptionTemplate(result)
                                            :
                                                <span>Unknown element</span>
                }</leaf>)
            })

            return node
        }


        onSubTestStart (testNode : TestNodeResult) {
            if (testNode.isRoot) this.resultsRunning.add(testNode)
        }

        async onSubTestFinish (testNode : TestNodeResult) {
            if (testNode.isRoot) {
                if (!this.resultsRunning.has(testNode)) throw new Error("Test completed before starting")

                this.resultsRunning.delete(testNode)

                if (testNode.passed) {
                    this.resultsFinished.add({ testNode, sources : undefined })
                } else {
                    const sources       = await this.fetchSources(testNode.descriptor.url)

                    this.resultsFinished.add({ testNode, sources })
                }

                this.printFinished()
            }
        }


        printFinished () : boolean {
            this.resultsFinished.forEach(({ testNode, sources }) => {
                this[ testNode.passed ? 'filesPassed' : 'filesFailed' ]++

                this.resultsCompleted.add(testNode)

                this.write(this.testNodeTemplateXml(testNode, this.isCompleted(), sources))
            })

            this.resultsFinished.clear()

            if (this.isCompleted()) {
                this.write(this.t.testSuiteFooter())
                return true
            } else {
                return false
            }
        }


        isCompleted () : boolean {
            return this.resultsCompleted.size === this.launch.projectPlanItemsToLaunch.length
        }


        onResult (testNode : TestNodeResult, assertion : Result) {
        }


        onAssertionFinish (testNode : TestNodeResult, assertion : AssertionAsyncResolution) {
        }


        async fetchSources (url : string) : Promise<string[]> {
            throw new Error("Abstract method")
        }


        onTestSuiteStart () {
            this.startTime      = new Date()

            this.write(this.t.testSuiteHeader())
        }


        onTestSuiteFinish () {
            this.endTime        = new Date()
        }
    }

    return Reporter
}) {}


//---------------------------------------------------------------------------------------------------------------------
export const humanReadableDuration = (milliSeconds : number) : string => {
    if (milliSeconds >= 1000) {
        const seconds       = Math.floor(milliSeconds / 1000)

        if (seconds >= 60) {
            const minutes   = Math.floor(seconds / 60)

            if (minutes >= 60) {
                const hours     = Math.floor(minutes / 60)

                return `${ hours }h ${ minutes % 60 }m`
            } else {
                return `${ minutes }m ${ seconds % 60 }s`
            }
        } else {
            return `${ seconds }s`
        }
    } else {
        return `${ milliSeconds }ms`
    }
}
