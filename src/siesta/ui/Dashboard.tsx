/** @jsx ChronoGraphJSX.createElement */

import { ChronoGraphJSX } from "../../chronograph-jsx/ChronoGraphJSX.js"
import { Component } from "../../chronograph-jsx/Component.js"
import { ComponentElement } from "../../chronograph-jsx/ElementReactivity.js"
import { ClassUnion, Mixin } from "../../class/Mixin.js"
import { TextJSX } from "../../jsx/TextJSX.js"
import { awaitDomReady } from "../../util/Helpers.js"
import { Launcher } from "../launcher/Launcher.js"
import { ProjectPlanComponent, TestDescriptorComponent } from "./ProjectPlanComponent.js"


ChronoGraphJSX

//---------------------------------------------------------------------------------------------------------------------
export class Dashboard extends Mixin(
    [ Component ],
    (base : ClassUnion<typeof Component>) =>

    class Dashboard extends base {
        launcher            : Launcher                      = undefined


        async start () {
            await awaitDomReady()

            document.body.appendChild(this.el)
        }


        render () : Element {
            return <div ondblclick={ e => this.onDoubleClick(e) } class="is-flex is-align-items-stretch" style="height : 100%;">
                <ProjectPlanComponent style="width: 300px" projectData={ this.launcher.projectData }></ProjectPlanComponent>
                <div style="flex : 1">Test details</div>
            </div>
        }


        onDoubleClick (e : MouseEvent) {
            const testPlanItem : ComponentElement<TestDescriptorComponent> = (e.target as Element).closest('.project-plan-test')

            if (testPlanItem) {
                this.launcher.launch([ testPlanItem.comp.testDescriptor ])
            }
        }
    }
) {}
