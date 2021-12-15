import { Project } from "../deno.js"

const project = Project.new({
    title                   : 'Siesta 6 Deno specific test suite',

    testDescriptor          : {}
})

project.plan(
    {
        url    : 'plan',

        items       : [
            'project_plan.t.js'
        ]
    },
)

project.start()

