import { Base } from "../../class/Base.js"
import { DeepCompareOptions } from "../../compare_deep/CompareDeepDiff.js"
import { XmlRendererDifference } from "../../compare_deep/CompareDeepDiffRendering.js"
import { CI } from "../../iterator/Iterator.js"
import { serializable, Serializable } from "../../serializable/Serializable.js"
import { SerializerXml } from "../../serializer/SerializerXml.js"
import { TreeNode } from "../../tree/TreeNode.js"
import { ArbitraryObject, cloneObject, objectEntriesDeep } from "../../util/Helpers.js"
import { isString } from "../../util/Typeguards.js"
import { HasOptions, option, OptionGroup } from "../option/Option.js"
import { Test } from "./Test.js"


//---------------------------------------------------------------------------------------------------------------------
export const OptionsGroupTestDescriptor  = OptionGroup.new({
    name        : 'Test descriptor',
    weight      : 800
})


//---------------------------------------------------------------------------------------------------------------------
// some properties in this class don't have an initializer, that intentional,
// because when "flattening" the descriptor and its parent descriptors,
// we check `descriptor.hasOwnProperty('property')` to find out if there's an
// explicitly provided value for that property
// obviously with initializer, that check will always be `true`, which is not
// what we want

@serializable()
export class TestDescriptor extends Serializable.mix(HasOptions.mix(TreeNode.mix(Base))) {
    childNodeT      : TestDescriptor
    parentNode      : TestDescriptor

    // TODO should support `name` alias (primary and recommended should be `title` to avoid
    // confusion with `filename`
    title           : string                = ''

    // TODO support `fileName` alias?
    filename        : string                = ''

    url             : string

    @option({ defaultValue : [], group : OptionsGroupTestDescriptor })
    tags            : string[]

    @option({ type : 'boolean', defaultValue : false, group : OptionsGroupTestDescriptor })
    isTodo          : boolean

    @option({ type : 'string', group : OptionsGroupTestDescriptor })
    snooze          : string | Date

    // @option()
    // isolation       : IsolationLevel

    @option({ type : 'boolean', defaultValue : false, group : OptionsGroupTestDescriptor })
    failOnIit           : boolean

    // will be applied directly to test instance
    config          : ArbitraryObject

    @option({ defaultValue : false, group : OptionsGroupTestDescriptor })
    autoCheckGlobals    : boolean

    serializerConfig    : Partial<SerializerXml>            = { maxBreadth : 10, maxDepth : 4 }
    stringifierConfig   : Partial<XmlRendererDifference>    = { prettyPrint : true }
    deepCompareConfig   : DeepCompareOptions                = undefined


    planItem (item : TestDescriptor) : TestDescriptor {
        this.appendChild(item)

        return item
    }


    getOptionValueReducers () : { [ key in keyof this ]? : (name : keyof this, parentsAxis : this[]) => this[ typeof name ] } {
        return {
            url     : (name : 'url', parentsAxis : this[]) : this[ typeof name ] => {
                const urlParts      = []

                CI(parentsAxis).forEach(desc => {
                    if (desc.url) {
                        urlParts.push(desc.url.replace(/\/$/, '')); return false
                    }
                    else {
                        urlParts.push(desc.filename)
                    }
                })

                urlParts.reverse()

                return urlParts.join('/')
            },
            tags    : (name : 'tags', parentsAxis : this[]) : this[ typeof name ] => {
                return CI(parentsAxis.flatMap(desc => desc.tags)).uniqueOnly().toArray()
            }
        }
    }

    // here the type should be `this`, but TS got mad when mixin `Project` and `ProjectBrowser` for example
    // `TestDescriptor` seems to be enough, since `flatten` is always used in generic `TestDescriptor` context it seems
    $flatten        : TestDescriptor      = undefined

    get flatten () : TestDescriptor {
        if (this.$flatten !== undefined) return this.$flatten

        if (this.childNodes) throw new Error("Can only flatten leaf descriptors, not groups")

        const descriptor        = cloneObject(this)
        descriptor.parentNode   = undefined

        if (!descriptor.url && !descriptor.filename) throw new Error("Descriptor needs to have either `filename` or `url` property defined")

        const parentsAxis       = [ this, ...this.parentsAxis() ]

        const reducers          = this.getOptionValueReducers()

        const defaultReducer    = (name : keyof this, parentsAxis : this[]) : this[ typeof name ] => {
            let res : this[ typeof name ]

            CI(parentsAxis).forEach((desc, index) => {
                if (desc.hasOwnProperty(name) || index === parentsAxis.length - 1) { res = desc[ name ]; return false }
            })

            return res
        }

        objectEntriesDeep(this.$options).map(([ key, _ ]) => key).concat('url', 'config').forEach(key => {
            const reducer       = reducers[ key ] || defaultReducer

            descriptor[ key ]   = reducer(key, parentsAxis)
        })

        return this.$flatten    = descriptor
    }


    static fromTestDescriptorArgument<T extends typeof TestDescriptor> (this : T, desc : string | Partial<InstanceType<T>>) : InstanceType<T> {
        if (isString(desc)) {
            return this.new({ title : desc } as Partial<InstanceType<T>>)
        } else {
            return this.new(desc)
        }
    }


    static fromProjectPlanItemDescriptor<T extends typeof TestDescriptor> (this : T, desc : ProjectPlanItemDescriptor<InstanceType<T>>) : InstanceType<T> {
        if (isString(desc)) {
            return this.new({ filename : desc } as Partial<InstanceType<T>>)
        }
        else if (desc.items !== undefined) {
            const groupDesc     = Object.assign({}, desc)

            delete groupDesc.items

            const group         = this.new(groupDesc)

            // need to force-create the `childNodes` array for the case when the `items` array is empty
            // so that this descriptor will be counted as a group, not leaf
            group.childNodes    = []

            desc.items.forEach(item => group.planItem(this.fromProjectPlanItemDescriptor(item)))

            return group
        } else {
            return this.new(desc)
        }
    }
}

export type TestDescriptorArgument<T extends Test> = string | Partial<InstanceType<T[ 'testDescriptorClass' ]>>

export type ProjectPlanItemDescriptor<T extends TestDescriptor> = string | (Partial<T> & { items? : ProjectPlanItemDescriptor<T>[] })

