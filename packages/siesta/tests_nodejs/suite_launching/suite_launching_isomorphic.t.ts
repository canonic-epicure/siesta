import path from "path"
import { fileURLToPath } from "url"
import { it } from "../../nodejs.js"
import {
    launchWebServer,
    runProjectDirectly,
    runProjectViaLauncher,
    runTestDirectly,
    verifySampleProjectLaunch,
    verifySampleTestLaunch
} from "../@src/suite_launch_helpers.js"

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const __filename    = fileURLToPath(import.meta.url)
const __dirname     = path.dirname(__filename)


//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
it('Should be able to launch the isomorphic project in Node.js directly', async t => {
    const launchRes     = await runProjectDirectly(path.resolve(__dirname, '../@sample_test_suites/isomorphic/index.js'))

    await verifySampleProjectLaunch(t, launchRes)
})


it('Should be able to launch the isomorphic project in Node.js via launcher', async t => {
    const launchRes     = await runProjectViaLauncher(path.resolve(__dirname, '../@sample_test_suites/isomorphic/index.js'))

    await verifySampleProjectLaunch(t, launchRes)
})


it('Should be able to launch the isomorphic test file in Node.js directly', async t => {
    const launchRes     = await runTestDirectly(path.resolve(__dirname, '../@sample_test_suites/isomorphic/test_1.t.js'))

    await verifySampleTestLaunch(t, launchRes)
})


it('Should be able to launch the isomorphic test file in Node.js via launcher', async t => {
    const launchRes     = await runProjectViaLauncher(path.resolve(__dirname, '../@sample_test_suites/isomorphic/test_1.t.js'))

    await verifySampleTestLaunch(t, launchRes)
})


it('Should be able to launch the isomorphic test file in Node.js via launcher with glob', async t => {
    const launchRes     = await runProjectViaLauncher(path.resolve(__dirname, '../@sample_test_suites/isomo*/t*t_1.t.js'))

    await verifySampleTestLaunch(t, launchRes)
})


//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Deno tests can run only in bundled build
if (process.env.BUNDLED) {

    it('Should be able to launch the isomorphic project in Deno directly', async t => {
        const launchRes     = await runProjectDirectly(path.resolve(__dirname, '../@sample_test_suites/isomorphic/index.js'), {}, true)

        await verifySampleProjectLaunch(t, launchRes)
    })


    it('Should be able to launch the isomorphic project in Deno via launcher', async t => {
        const launchRes     = await runProjectViaLauncher(path.resolve(__dirname, '../@sample_test_suites/isomorphic/index.js'), {}, true)

        await verifySampleProjectLaunch(t, launchRes)
    })


    it('Should be able to launch the isomorphic test file in Deno directly', async t => {
        const launchRes     = await runTestDirectly(path.resolve(__dirname, '../@sample_test_suites/isomorphic/test_1.t.js'), {}, true)

        await verifySampleTestLaunch(t, launchRes)
    })

    it('Should be able to launch the isomorphic test file in Deno via launcher', async t => {
        const launchRes     = await runProjectViaLauncher(path.resolve(__dirname, '../@sample_test_suites/isomorphic/test_1.t.js'), {}, true)

        await verifySampleTestLaunch(t, launchRes)
    })

    it('Should be able to launch the isomorphic test file in Deno via launcher with glob', async t => {
        const launchRes     = await runProjectViaLauncher(path.resolve(__dirname, '../@sample_test_suites/isomo*/t*t_1.t.js'), {}, true)

        await verifySampleTestLaunch(t, launchRes)
    })
}


//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
it('Should be able to launch the isomorphic project in browser via launcher', async t => {
    const { server, port } = await launchWebServer({ argv : [ '--root-dir', `${ __dirname }/../..` ] })

    const launchRes     = await runProjectViaLauncher(
        `http://localhost:${ port }/tests_nodejs/@sample_test_suites/isomorphic/index.js`
    )

    await verifySampleProjectLaunch(t, launchRes)

    await server.stop()
})
