import { Channel, local, remote } from "../../src/channel/Channel.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be able to use chained iterators', t => {
        class MyChannel extends Channel {

            @remote()
            remoteMethod : (arg1 : number, arg2 : string) => Promise<string>

            @local()
            async localMethod (arg1 : number) {
                return arg1 + 1
            }
        }
    })
})


