import { Base } from "../../class/Base.js"
import { AnyConstructor, ClassUnion, Mixin } from "../../class/Mixin.js"
import { TextJSX } from "../../jsx/TextJSX.js"
import { Rect } from "../../util/Rect.js"
import { isArray, isString } from "../../util/Typeguards.js"
import { clientXtoPageX, clientYtoPageY, getViewportActionPoint, getViewportRect } from "../../util_browser/Coordinates.js"
import { elementFromPoint, isElementAccessible, isElementConnected, isElementPointReachable, isElementPointVisible } from "../../util_browser/Dom.js"
import { isHTMLElement, isSVGElement } from "../../util_browser/Typeguards.js"
import { Test } from "../test/Test.js"
import { Assertion, SourcePoint } from "../test/TestResult.js"
import { PointerMovePrecision, Simulator } from "./Simulator.js"
import { SimulatorPlaywrightClient } from "./SimulatorPlaywright.js"
import { ActionableCheck, ActionTarget, ActionTargetOffset, equalPoints, MouseButton, Point, sumPoints } from "./Types.js"

//---------------------------------------------------------------------------------------------------------------------
export type MouseActionOptions      = {
    target              : ActionTarget
    offset              : ActionTargetOffset
    button              : MouseButton

    movePrecision       : PointerMovePrecision
    allowChild          : boolean

    timeout             : number

    callback            : Function
    scope               : any
}


//---------------------------------------------------------------------------------------------------------------------
export interface UserAgent {
    click (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) : Promise<any>

    rightClick (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) : Promise<any>

    doubleClick (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) : Promise<any>

    mouseDown (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) : Promise<any>

    mouseUp (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) : Promise<any>

    moveMouse (target : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) : Promise<any>

    moveMouseBy (delta : Point) : Promise<any>
}


//---------------------------------------------------------------------------------------------------------------------
export type WaitForTargetActionableResult = {
    success                 : boolean

    actionElement?          : Element
    actionPoint             : Point

    failedChecks            : ActionableCheck[]
}

export type WaitForTargetActionableOptions = {
    sourcePoint?            : SourcePoint
    actionName?             : string

    silent?                 : boolean
    timeout?                : number
    stabilityFrames?        : number
    syncCursor?             : boolean
}


//---------------------------------------------------------------------------------------------------------------------
// user agent for Siesta's on-page tests
export class UserAgentOnPage extends Mixin(
    [ Test ],
    (base : ClassUnion<typeof Test>) =>

    class UserAgentOnPage extends base implements UserAgent {

        window                  : Window                        = window

        simulator               : SimulatorPlaywrightClient     = undefined

        mouseMovePrecision      : PointerMovePrecision          = { kind : 'last_only', precision : 1 }

        onAmbiguousQuery        : 'use_first' | 'warn' | 'throw'   = 'warn'

        // coordinatesSystem   : 'page' | 'viewport'           = 'viewport'


        resolveActionTarget (target : ActionTarget) : Element {
            if (target instanceof Array) {
                return elementFromPoint(this.window.document, ...(target.length === 0 ? this.getCursorViewportPosition() : target), true).el
            }
            else {
                return this.normalizeElement(target)
            }
        }


        normalizeElement (el : string | Element, onAmbiguousQuery : 'use_first' | 'warn' | 'throw' = this.onAmbiguousQuery) : Element | undefined {
            if (isString(el)) {
                const resolved      = this.query(el)

                if (resolved.length > 1) {
                    if (onAmbiguousQuery === 'warn')
                        this.warn(`Query resolved to multiple elements: ${ el }`)
                    else if (onAmbiguousQuery === 'throw')
                        throw new Error(`Query resolved to multiple elements: ${ el }`)
                }

                return resolved[ 0 ]
            } else {
                return el
            }
        }


        normalizeElementDetailed (
            el : string | Element, onResolvedToMultiple : 'use_first' | 'warn' | 'throw' = this.onAmbiguousQuery
        )
            : { el : Element, multiple : boolean }
        {
            if (isString(el)) {
                const resolved      = this.query(el)

                return { el : resolved[ 0 ], multiple : resolved.length > 1 }
            } else {
                return { el, multiple : false }
            }
        }


        query (query : string) : Element[] {
            return Array.from(this.window.document.querySelectorAll(query))
        }


        $ (query : string) : Element {
            return this.query(query)[ 0 ]
        }


        $$ (query : string) : Element[] {
            return this.query(query)
        }


        normalizeMouseActionOptions (targetOrOptions : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) : MouseActionOptions {
            if (isString(targetOrOptions) || isArray(targetOrOptions) || isHTMLElement(targetOrOptions) || isSVGElement(targetOrOptions)) {
                return {
                    target              : targetOrOptions,
                    offset              : offset,
                    button              : 'left',

                    movePrecision       : this.mouseMovePrecision,
                    allowChild          : true,

                    timeout             : this.defaultTimeout,

                    callback            : undefined,
                    scope               : undefined
                }
            } else {
                return Object.assign({
                    target              : undefined,
                    offset              : undefined,
                    button              : 'left',

                    movePrecision       : this.mouseMovePrecision,
                    allowChild          : true,

                    timeout             : this.defaultTimeout,

                    callback            : undefined,
                    scope               : undefined
                } as MouseActionOptions, targetOrOptions)
            }
        }


        getCursorPagePosition () : Point {
            return [
                clientXtoPageX(this.simulator.currentPosition[ 0 ], this.window),
                clientYtoPageY(this.simulator.currentPosition[ 1 ], this.window)
            ]
        }


        getCursorViewportPosition () : Point {
            return this.simulator.currentPosition.slice() as Point
        }


        reportActionabilityCheckFailures (action : MouseActionOptions, checks : ActionableCheck[], options : WaitForTargetActionableOptions) {
            // TODO
            // 1) should list detailed failed checks (like for "reachable" for example, it should say
            //    with what other element the target is overlayed, etc
            // 2) in UI, should additionally dynamically display the failing checks while waiting for them

            this.addResult(Assertion.new({
                name        : 'waitForElementActionable',
                passed      : false,
                annotation  : <div>
                    <div>Waited too long for { options.actionName } target <span>{ action.target }</span> to become actionable</div>
                    <div>Failed checks: `{ checks.join(" ") }`</div>
                </div>
            }))
        }


        async waitForTargetActionable (action : MouseActionOptions, options? : WaitForTargetActionableOptions) : Promise<WaitForTargetActionableResult> {
            return await this.keepAlive(this.doWaitForTargetActionable(action, options))
        }


        async doWaitForTargetActionable (action : MouseActionOptions, options? : WaitForTargetActionableOptions) : Promise<WaitForTargetActionableResult> {
            const timeout               = options?.timeout ?? action.timeout ?? this.defaultTimeout
            const syncCursor            = options?.syncCursor ?? true
            const silent                = options?.silent ?? false
            const stabilityFrames       = options?.stabilityFrames ?? 2

            if (!silent && !options?.sourcePoint) throw new Error('Need `sourcePoint` option for non-silent usage of `waitForTargetActionable`')

            if (isArray(action.target)) {
                // if we are given a coordinate system point, check that it is
                const point             = action.target.length === 0 ? this.simulator.currentPosition.slice() as Point : action.target

                const isVisible         = getViewportRect(this.window).containsPoint(point)

                if (!isVisible) {
                    if (!silent) this.reportActionabilityCheckFailures(action, [ 'visible' ], options)

                    return { success : false, failedChecks : [ 'visible' ], actionPoint : point }
                }

                await this.simulator.simulateMouseMove(point, { precision : action.movePrecision })

                return { success : true, failedChecks : [], actionPoint : point }

            } else {
                const target            = action.target

                let el : Element        = undefined
                let prevRect : Rect     = undefined
                let counter : number    = 0
                let warned : boolean    = false

                let failedChecks : ActionableCheck[]    = []

                const win               = this.window

                const start             = Date.now()

                return new Promise((resolve, reject) => {

                    const step = async () => {
                        try {
                            await doStep()
                        } catch (e) {
                            reject(e)
                        }
                    }

                    const doStep = async () => {
                        const elapsed   = Date.now() - start

                        if (elapsed >= timeout) {
                            if (!silent) this.reportActionabilityCheckFailures(action, failedChecks, options)

                            resolve({ success : false, failedChecks, actionElement : el, actionPoint : undefined })

                            return
                        }

                        //-----------------
                        const res       = this.normalizeElementDetailed(target)

                        if (!silent && res.multiple) {
                            if (this.onAmbiguousQuery === 'throw')
                                throw new Error(`Query resolved to multiple elements: ${ target }`)
                            else if (this.onAmbiguousQuery === 'warn' && !warned) {
                                // warn about ambiguous target only once
                                warned      = true
                                this.warn(`Query resolved to multiple elements: ${ target }`)
                            }
                        }

                        //-----------------
                        const checks : ActionableCheck[]  = []

                        el              = res.el

                        if (!el) {
                            checks.push('present')
                            continueWaiting(true, checks)
                            return
                        }

                        if (!isElementConnected(el)) {
                            checks.push('connected')
                            continueWaiting(true, checks)
                            return
                        }

                        if (!isElementAccessible(el)) {
                            checks.push('accessible')
                            continueWaiting(true, checks)
                            return
                        }

                        // element is completely invisible - outside of the viewport
                        // we'll try to scroll it into view
                        if (!isElementPointVisible(el, action.offset, true)) {
                            checks.push('visible')
                            continueWaiting(true, checks)
                            return

                            //
                            // if (isInside) {
                            //     scrollElementPointIntoView(el, action.offset)
                            // } else {
                            //
                            // }
                        }

                        //-----------------
                        const rect      = Rect.fromElement(el)

                        if (!prevRect || !prevRect.isEqual(rect)) {
                            prevRect    = rect
                            counter     = 0

                            checks.push('stable')
                            continueWaiting(false, checks)
                            return
                        } else {
                            counter++

                            if (counter < stabilityFrames - 1) {
                                checks.push('stable')
                                continueWaiting(false, checks)
                                return
                            }
                        }

                        if (syncCursor) {
                            const point         = getViewportActionPoint(el, action.offset)
                            const current       = this.simulator.currentPosition

                            if (!point || !equalPoints(point, current)) {
                                await this.simulator.simulateMouseMove(point, { precision : action.movePrecision })

                                checks.push('reachable')
                                continueWaiting(false, checks)
                                return
                            }
                        }

                        const reachability  = isElementPointReachable(el, action.offset, action.allowChild)

                        if (!reachability.reachable) {
                            checks.push('reachable')
                            continueWaiting(false, checks)
                            return
                        }

                        resolve({ success : true, failedChecks : [], actionPoint : reachability.point, actionElement : reachability.elAtPoint })
                    }

                    const continueWaiting = (reset : boolean, checks : ActionableCheck[]) => {
                        if (reset) {
                            // prevEl      = undefined
                            prevRect    = undefined
                        }

                        failedChecks        = checks

                        win.requestAnimationFrame(step)
                    }

                    step()
                })

            }
        }


        async click (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {
            const action        = this.normalizeMouseActionOptions(target ?? this.simulator.currentPosition, offset)

            const waitRes       = await this.waitForTargetActionable(action, {
                sourcePoint     : this.getSourcePoint(),
                actionName      : 'click',
                timeout         : action.timeout
            })

            if (waitRes.success) await this.keepAlive(this.simulator.simulateClick({ button : action.button }))
        }


        async rightClick (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {
            const action        = this.normalizeMouseActionOptions(target ?? this.simulator.currentPosition, offset)

            const waitRes       = await this.waitForTargetActionable(action, {
                sourcePoint     : this.getSourcePoint(),
                actionName      : 'right click',
                timeout         : action.timeout
            })

            if (waitRes.success) await this.keepAlive(this.simulator.simulateClick({ button : 'right' }))
        }


        async doubleClick (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {
            const action        = this.normalizeMouseActionOptions(target ?? this.simulator.currentPosition, offset)

            const waitRes       = await this.waitForTargetActionable(action, {
                sourcePoint     : this.getSourcePoint(),
                actionName      : 'double click',
                timeout         : action.timeout
            })

            if (waitRes.success) await this.keepAlive(this.simulator.simulateDblClick({ button : action.button }))
        }


        async mouseDown (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {
            const action        = this.normalizeMouseActionOptions(target ?? this.simulator.currentPosition, offset)

            const waitRes       = await this.waitForTargetActionable(action, {
                sourcePoint     : this.getSourcePoint(),
                actionName      : 'mouse down',
                timeout         : action.timeout
            })

            if (waitRes.success) await this.keepAlive(this.simulator.simulateMouseDown({ button : action.button }))
        }


        async mouseUp (target? : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {
            const action        = this.normalizeMouseActionOptions(target ?? this.simulator.currentPosition, offset)

            const waitRes       = await this.waitForTargetActionable(action, {
                sourcePoint     : this.getSourcePoint(),
                actionName      : 'mouse up',
                timeout         : action.timeout
            })

            if (waitRes.success) await this.keepAlive(this.simulator.simulateMouseUp({ button : action.button }))
        }


        async moveMouse (target : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {
            const action        = this.normalizeMouseActionOptions(target, offset)

            const waitRes       = await this.waitForTargetActionable(action, {
                sourcePoint     : this.getSourcePoint(),
                actionName      : 'mouse move',
                timeout         : action.timeout
            })
        }


        async moveMouseBy (delta : Point) {
            await this.moveMouse(sumPoints(this.simulator.currentPosition, delta))
        }
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
// this is user agent for classic browser automation tests,
// where the test itself is running in the OS process (like Node.js)
// and it operates on the browser page, usually using `page.evaluate()`
// this is how Puppeteer, Playwright and Selenium works

// idea is that the user actions API should be identical
export class UserAgentExternal extends Mixin(
    [ Base ],
    (base : AnyConstructor<Base, typeof Base>) =>

    class UserAgentExternal extends base implements UserAgent {

        simulator           : Simulator     = undefined


        async click (target : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {

        }


        async rightClick (target : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {

        }


        async doubleClick (target : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {

        }


        async mouseDown (target : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {
        }


        async mouseUp () {

        }


        async moveMouse (target : ActionTarget | Partial<MouseActionOptions>, offset? : ActionTargetOffset) {

        }


        async moveMouseBy (delta : Point) {
            await this.moveMouse(sumPoints(this.simulator.currentPosition, delta))
        }
    }
) {}

