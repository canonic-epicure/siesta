/** @jsx ChronoGraphJSX.createElement */

import { Box } from "@bryntum/chronograph/src/chrono2/data/Box.js"
import { field } from "@bryntum/chronograph/src/replica2/Entity.js"
import { ChronoGraphJSX, ElementSource } from "../../chronograph-jsx/ChronoGraphJSX.js"
import { Component } from "../../chronograph-jsx/Component.js"
import { ComponentElement } from "../../chronograph-jsx/ElementReactivity.js"
import { ClassUnion, Mixin } from "../../class/Mixin.js"
import { TextJSX } from "../../jsx/TextJSX.js"
import { awaitDomReady } from "../../util/Helpers.js"
import { Launcher } from "../launcher/Launcher.js"
import { TestDescriptor } from "../test/TestDescriptor.js"
import { Splitter } from "./components/Splitter.js"
import { ProjectPlanComponent, TestDescriptorComponent } from "./ProjectPlanComponent.js"
import { TestNodeResultComponent } from "./test_result/TestResult.js"

ChronoGraphJSX

//---------------------------------------------------------------------------------------------------------------------
export class Dashboard extends Mixin(
    [ Component ],
    (base : ClassUnion<typeof Component>) =>

    class Dashboard extends base {
        launcher            : Launcher                      = undefined

        @field()
        currentTest         : TestDescriptor                = undefined


        async start () {
            await awaitDomReady()

            document.body.appendChild(this.el)
        }


        render () : Element {
            const dispatcher        = this.launcher.dispatcher

            return <div
                onmousedown = { e => this.onMouseDown(e) }
                onclick     = { e => this.onClick(e) }
                ondblclick  = { e => this.onDoubleClick(e) }
                class       = 'is-flex is-align-items-stretch' style='height: 100%;'
            >
                <ProjectPlanComponent
                    dispatcher      = { this.launcher.dispatcher }
                    selectedTestBox = { this.$.currentTest as Box<TestDescriptor> }
                    style           = "min-width: 100px; width: 300px"
                    projectData     = { this.launcher.projectData }
                >
                    <div class='tbar is-flex'>
                        <input class="input" type="text" placeholder="Include glob"/>
                    </div>
                    <div class='tbar is-flex'>
                        <span class="icon icon-play-checked is-large" onclick={ () => this.runChecked() }>
                            <i class="fas fa-lg fa-play"></i>
                            <span class="icon is-small"><i class="fas fs-sm fa-check"></i></span>
                        </span>
                        <span class="icon icon-play-all is-large" onclick={ () => this.runAll() }>
                            <i class="fas fa-lg fa-play"></i>
                            <span class="icon is-large"><i class="fas fa-lg fa-play"></i></span>
                        </span>
                    </div>
                </ProjectPlanComponent>

                <Splitter mode="horizontal" style="width: 8px"></Splitter>

                <div class="is-flex is-flex-direction-column" style="flex: 1">
                    { () => {
                        if (!this.currentTest) return null

                        return <div class='tbar is-flex'>
                            <span class="icon is-large" class:is-disabled={ () => !this.currentTest } onclick={ () => this.runTest() }><i class="fas fa-lg fa-play"></i></span>

                            <span class="icon icon-play-checked is-large" onclick={ () => this.runTestChecked() }>
                                <i class="fas fa-lg fa-play"></i>
                                <span class="icon is-small"><i class="fas fs-sm fa-check"></i></span>
                            </span>
                        </div>
                    }}
                    <div style="flex: 1; overflow-y: auto">
                        {
                            () => {
                                if (!this.currentTest) return this.noSelectionContent()

                                const launchInfo            = dispatcher.getTestLaunchInfo(this.currentTest)
                                const mostRecentResult      = launchInfo.mostRecentResult

                                return mostRecentResult
                                    ?
                                        <TestNodeResultComponent
                                            testNode={ mostRecentResult }
                                            dispatcher={ dispatcher }
                                            launchInfo={ launchInfo }
                                        ></TestNodeResultComponent>
                                    :
                                        this.noResultsContent()
                            }
                        }
                    </div>
                </div>
            </div>
        }


        noSelectionContent () : ElementSource {
            return <div class="s-dashboard-no-selection is-flex is-justify-content-center is-align-items-center" style="height: 100%">
                <div>
                    <div>No test selected</div>
                    <div>Click a test to select it</div>
                    <div>Double click a test to launch it</div>
                    <div>Double click a folder to launch all tests in it</div>
                </div>
            </div>
        }


        noResultsContent () : ElementSource {
            return <div class="s-dashboard-no-results is-flex is-justify-content-center is-align-items-center" style="height: 100%">
                <div>
                    <div>No results yet for <span class='current_test_filename'>{ this.currentTest.filename }</span></div>
                    <div>Double click a test to launch it</div>
                    <div>Double click a folder to launch all tests in it</div>
                </div>
            </div>
        }


        getTestDescriptorComponentFromMouseEvent (e : MouseEvent) : TestDescriptor {
            const testPlanItem : ComponentElement<TestDescriptorComponent> = (e.target as Element).closest('.project-plan-test, .project-plan-folder')

            return testPlanItem ? testPlanItem.comp.testDescriptor : undefined
        }


        onMouseDown (e : MouseEvent) {
            const desc      = this.getTestDescriptorComponentFromMouseEvent(e)

            // prevent the text selection on double click only (still works for mouse drag)
            if (desc && e.detail > 1) e.preventDefault()
        }


        onClick (e : MouseEvent) {
            const desc      = this.getTestDescriptorComponentFromMouseEvent(e)

            if (desc && desc.isLeaf()) {
                this.currentTest    = desc
            }
        }


        onDoubleClick (e : MouseEvent) {
            const desc      = this.getTestDescriptorComponentFromMouseEvent(e)

            if (desc) {
                this.launcher.launchContinuously(desc.leavesAxis())
            }
        }


        runChecked () {
            const dispatcher        = this.launcher.dispatcher

            const toLaunch          = Array.from(
                dispatcher.projectPlanLaunchInfo.descriptor
                    .leavesAxis()
                    .map(desc => dispatcher.getTestLaunchInfo(desc))
                    .filter(info => info.checked)
                    .map(info => info.descriptor)
            )

            this.launcher.launchContinuously(toLaunch)
        }


        runAll () {
            const dispatcher        = this.launcher.dispatcher

            this.launcher.launchContinuously(dispatcher.projectPlanLaunchInfo.descriptor.leavesAxis())
        }


        runTest () {
            this.launcher.launchContinuously([ this.currentTest ])
        }


        runTestChecked () {

        }
    }
) {}
