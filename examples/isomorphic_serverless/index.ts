import { GetIsomorphicProjectClass } from "../../main.js"

(async () => {

const project = (await GetIsomorphicProjectClass()).new({
    title                   : 'Isomorphic test suite example',

    // global test-specific options
    descriptor              : {}
})

project.plan([
    {
        filename    : 'basic',

        tags        : [ 'basic' ],

        items       : [
            {
                filename    : 'basic_test.t.js',
            },
            'another_test.t.js'
        ]
    },
    {
        filename    : 'assertions',

        items       : [
            'is_deeply.t.js'
        ]
    },
    {
        filename    : 'advanced',

        tags        : [ 'advanced' ],

        items       : [
            'advanced_test.t.js'
        ]
    },
])

project.start()

})()

