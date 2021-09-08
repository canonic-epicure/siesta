import { OrPromise, SetTimeoutHandler } from "./Helpers.js"

//---------------------------------------------------------------------------------------------------------------------
export const delay = (timeout : number) : Promise<any> => new Promise(resolve => setTimeout(resolve, timeout))

//---------------------------------------------------------------------------------------------------------------------
// it is recommended, that the error instance, to throw on timeout, to be provided from the call site of this method
// this way, the stack trace will point to the `timeout` call, instead of the `timeout` internals
export const timeout = <T>(promise : Promise<T>, timeout : number, error : any = new Error(`Timeout of ${ timeout }ms exceeded`)) : Promise<T> => {

    return new Promise((resolve, reject) => {
        let timeOutHappened     = false
        let promiseSettled      = false

        promise.then(resolved => {
            promiseSettled      = true

            if (!timeOutHappened) {
                clearTimeout(timeoutHandler)
                resolve(resolved)
            }

        }, rejected => {
            promiseSettled      = true

            if (!timeOutHappened) {
                clearTimeout(timeoutHandler)
                reject(rejected)
            }
        })

        const timeoutHandler    = setTimeout(() => {
            timeOutHappened     = true

            if (!promiseSettled) reject(error)
        }, timeout)
    })
}

//---------------------------------------------------------------------------------------------------------------------
export const buffer = <Args extends unknown[]>(func : (...args : Args) => unknown, timeout : number) : (...args : Args) => void => {
    let timeoutHandler : SetTimeoutHandler  = undefined

    return (...args : Args) => {
        if (timeoutHandler !== undefined) clearTimeout(timeoutHandler)

        timeoutHandler      = setTimeout(() => func(...args), timeout)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const waitFor  = async <R> (condition : () => OrPromise<R>, timeout : number, interval : number)
    : Promise<{ conditionIsMet : boolean, result : R, exception : unknown, elapsedTime : number }> =>
{
    const start             = Date.now()

    let result : R

    do {
        try {
            result = await condition()
        } catch (e) {
            return { conditionIsMet : false, result : undefined, exception : e, elapsedTime : Date.now() - start }
        }

        if (result)
            break
        else {
            if (Date.now() - start >= timeout) {
                return { conditionIsMet : false, result : undefined, exception : undefined, elapsedTime : Date.now() - start }
            }

            await delay(interval)
        }

    } while (!result)

    return { conditionIsMet : true, result, exception : undefined, elapsedTime : Date.now() - start }
}
