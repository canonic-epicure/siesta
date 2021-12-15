import { CI } from "chained-iterator/index.js"
import { it } from "../../../index.js"
import { Exception } from "../../../src/siesta/test/TestResult.js"
import { isDeno } from "../../../src/util/Helpers.js"


//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
it('Should report exceptions, thrown outside of the test function', async t => {
    // Deno does not provide any "uncaughtexception/rejection" hooks (yet)
    if (isDeno()) return

    t.todo('Should report exceptions, thrown outside of the test function', async t => {
        const async = t.beginAsync()

        setTimeout(() => {
            t.endAsync(async)

            // @ts-ignore
            zxc
        }, 100)
    }).postFinishHook.on(todoTest => {
        const exceptions    = CI(todoTest.eachResultOfClassDeep(Exception)).toArray()

        t.eq(exceptions.length, 1)

        exceptions.forEach(exception => {
            t.match(exception.text, 'zxc')
        })
    })
})


//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
it('Should be able to generate source points for failures', async t => {
    t.todo('internal', async t => {
        t.true(false)
    }).postFinishHook.on(todoTest => {
        const assertion     = todoTest.assertions[ 0 ]

        t.true(assertion.sourcePoint)

        t.isNumber(assertion.sourcePoint.line)
        t.isNumber(assertion.sourcePoint.char)
    })
})

