import { Base } from "../class/Base.js"
import { AnyConstructor, ClassUnion, Mixin } from "../class/Mixin.js"
import { DataVisitor, Mapper, Mutator } from "../visitor/DataVisitor.js"
import { ArbitraryObject } from "../util/Helpers.js"

//---------------------------------------------------------------------------------------------------------------------
export type JsonReferenceId = number

let referenceIdSource : JsonReferenceId        = 0

export const setReferenceIdSource = (value : JsonReferenceId) => referenceIdSource = value

//---------------------------------------------------------------------------------------------------------------------
class CollapserPhase1 extends Mixin(
    [ DataVisitor, Base ],
    (base : ClassUnion<typeof DataVisitor, typeof Base>) =>

    class CollapserPhase1 extends base {
        cyclicPoint             : Set<unknown>              = new Set()


        afterVisit (value : unknown, depth : number, visitResult : unknown) : unknown {
            return super.afterVisit(value, depth, referenceIdSource++)
        }


        visitAlreadyVisited (value : unknown, depth : number) {
            this.cyclicPoint.add(value)

            return value
        }
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
export class Collapser extends Mixin(
    [ Mapper, Base ],
    (base : ClassUnion<typeof Mapper, typeof Base>) =>

    class Collapser extends base {
        collapser1              : CollapserPhase1           = CollapserPhase1.new()


        afterVisit (value : unknown, depth : number, visitResult : unknown) : unknown {
            super.afterVisit(value, depth, visitResult)

            const nativeSerializationEntry  = nativeSerializableClassesByConstructor.get(visitResult.constructor)

            const res = nativeSerializationEntry ? nativeSerializationEntry.toJSON(visitResult as object) : visitResult

            return this.collapser1.cyclicPoint.has(value) ?
                { $refId : this.collapser1.visited.get(value), value : res }
                    :
                res
        }


        visitAlreadyVisited (value : unknown, depth : number) {
            return { $ref : this.collapser1.visited.get(value) }
        }


        collapse (value : unknown) : unknown {
            this.collapser1.visit(value)

            return this.visit(value)
        }
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
class ExpanderPhase1 extends Mixin(
    [ Mapper, Base ],
    (base : ClassUnion<typeof Mapper, typeof Base>) =>

    class ExpanderPhase1 extends base {
        cyclicPoints            : Map<JsonReferenceId, unknown> = new Map()


        afterVisit (value : unknown, depth : number, visitResult : any) : unknown {
            let resolved        = visitResult

            if (resolved)
                if (resolved.$refId !== undefined) {
                    this.cyclicPoints.set(resolved.$refId, resolved.value)

                    resolved    = resolved.value
                }

            return super.afterVisit(value, depth, resolved)
        }
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
export class Expander extends Mixin(
    [ Mutator, Base ],
    (base : ClassUnion<typeof Mutator, typeof Base>) =>

    class Expander extends base {
        expander1               : ExpanderPhase1        = ExpanderPhase1.new()


        afterVisit (value : unknown, depth : number, visitResult : any) : unknown {
            let resolved        = visitResult

            if (resolved)
                if (resolved.$ref !== undefined) {
                    resolved    = this.expander1.cyclicPoints.get(resolved.$ref)
                }

            return super.afterVisit(value, depth, resolved)
        }


        expand (value : unknown) : unknown {
            const expanded  = this.expander1.visit(value)

            this.visit(expanded)

            return expanded
        }
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
export const stringify = (value : any, space? : string | number) : string => {
    const decycled      = Collapser.new().collapse(value)

    return JSON.stringify(decycled, null, space)
}


export const parse = (text : string) : any => {
    const decycled      = JSON.parse(text, reviver)

    return Expander.new().expand(decycled)
}


//---------------------------------------------------------------------------------------------------------------------
export class Serializable extends Mixin(
    [],
    (base : AnyConstructor) =>

    class Serializable extends base {
        $class                  : string
        $mode                   : SerializationMode

        $includedProperties     : object
        $excludedProperties     : object


        toJSON (key : string) : any {
            if (!this.$class) throw new Error(`Missing serializable class id: ${ this.constructor }`)

            const json : any = {}

            if (this.$mode === 'optOut')
                for (const [ key, propValue ] of Object.entries(this)) {
                    if (!this.$excludedProperties || !this.$excludedProperties[ key ]) json[ key ] = propValue
                }
            else if (this.$includedProperties)
                for (const key in this.$includedProperties) {
                    json[ key ] = this[ key ]
                }

            json.$class         = this.$class

            return json
        }

        // does not call actual constructor for a purpose - class "revivification"
        // supposed to be pure
        // also when this method is called the cyclic references are not resolved yet
        static fromJSON<T extends typeof Serializable> (this : T, json : object) : InstanceType<T> {
            const instance  = Object.create(this.prototype)

            for (const [ key, value ] of Object.entries(json)) {
                if (key !== '$class') instance[ key ] = value
            }

            return instance
        }
    }
) {}


//---------------------------------------------------------------------------------------------------------------------
// TODO consider using 'moduleUrl/symbol' pair as class key
// deserialization becomes async in this case
const serializableClasses           = new Map<string, typeof Serializable>()

const registerSerializableClass = (options : { id : string, mode : SerializationMode }, cls : typeof Serializable) => {
    const id                    = options.id

    cls.prototype.$class        = id
    cls.prototype.$mode         = options.mode

    if (serializableClasses.has(id) && serializableClasses.get(id) !== cls) {
        throw new Error(`Serializable class with id: [${ id }] already registered`)
    }

    serializableClasses.set(id, cls)
}

export const lookupSerializableClass = (id : string) : typeof Serializable => {
    return serializableClasses.get(id)
}


//---------------------------------------------------------------------------------------------------------------------
type NativeSerializationEntry = { toJSON : (native : object) => object, fromJSON : (json : object) => object }

const nativeSerializableClassesByConstructor    = new Map<Function, NativeSerializationEntry>()
const nativeSerializableClassesById             = new Map<string, NativeSerializationEntry>()

const registerNativeSerializableClass = (cls : Function, entry : NativeSerializationEntry) => {
    nativeSerializableClassesByConstructor.set(cls, entry)
    nativeSerializableClassesById.set(cls.name, entry)
}


//---------------------------------------------------------------------------------------------------------------------
export type SerializationMode = 'optIn' | 'optOut'


export const serializable = (opts? : { id? : string, mode? : SerializationMode }) : ClassDecorator => {
    // @ts-ignore
    return <T extends typeof Serializable>(target : T) : T => {
        if (!(target.prototype instanceof Serializable))
            throw new Error(`The class [${ target.name }] is decorated with @serializable, but does not include the Serializable mixin.`)

        registerSerializableClass(
            { id : opts?.id ?? target.name, mode : opts?.mode ?? 'optOut' },
            target
        )

        return target
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const exclude = () : PropertyDecorator => {

    return function (target : Serializable, propertyKey : string) : void {
        if (!target.hasOwnProperty('$excludedProperties')) {
            target.$excludedProperties = Object.create(target.$excludedProperties || null)
        }

        target.$excludedProperties[ propertyKey ] = true
    }
}

export const include = () : PropertyDecorator => {

    return function (target : Serializable, propertyKey : string) : void {
        if (!target.hasOwnProperty('$includedProperties')) {
            target.$includedProperties = Object.create(target.$includedProperties || null)
        }

        target.$includedProperties[ propertyKey ] = true
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const reviver = function (key : string | number, value : number | string | boolean | ArbitraryObject) {
    if (typeof value === 'object' && value !== null) {
        const $class        = value.$class as string

        if ($class !== undefined) {
            const cls       = lookupSerializableClass($class)

            if (!cls) throw new Error(`Unknown serializable class id: ${ $class }`)

            return cls.fromJSON(value)
        }

        const $$class        = value.$$class as string

        if ($$class !== undefined) {
            const entry       = nativeSerializableClassesById.get($$class)

            if (!entry) throw new Error(`Unknown native serializable class id: ${ $$class }`)

            return entry.fromJSON(value)
        }
    }

    return value
}


//---------------------------------------------------------------------------------------------------------------------
registerNativeSerializableClass(Map, {
    toJSON : (map : Map<unknown, unknown>) => {
        return {
            $$class     : 'Map',
            entries     : Array.from(map.entries())
        }
    },
    fromJSON : (data : any) => {
        return new Map(data.entries)
    }
})

registerNativeSerializableClass(Set, {
    toJSON : (set : Set<unknown>) => {
        return {
            $$class     : 'Set',
            entries     : Array.from(set)
        }
    },
    fromJSON : (data : any) => {
        return new Set(data.entries)
    }
})

// possibly can be improved by storing Date in "magical" string format
registerNativeSerializableClass(Date, {
    toJSON : (date : Date) => {
        return {
            $$class     : 'Date',
            time        : date.getTime()
        }
    },
    fromJSON : (data : any) => {
        return new Date(data.time)
    }
})


const errorClasses = [ Error, TypeError, RangeError, EvalError, ReferenceError, SyntaxError, URIError ]

errorClasses.forEach(cls =>

    registerNativeSerializableClass(cls, {
        toJSON : (error : Error) => {
            return Object.assign({}, error, {
                $$class     : cls.name,
                stack       : error.stack,
                message     : error.message,
                name        : error.name
            })
        },
        fromJSON : (data : any) => {
            const error     = Object.create(cls.prototype)

            Object.assign(error, data)

            delete error.$$class

            error.stack     = data.stack
            error.message   = data.message
            error.name      = data.name

            return error
        }
    })
)
