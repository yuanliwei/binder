//@ts-check

class Binder {

    constructor(rule) {
        this.matchRule = rule || MATCH_RULE
    }
    /**
     * bind obj values to node
     * @param {Node} node
     * @param {Object} object 
     */
    bind(node, object) {
        if (node instanceof HTMLElement) {
            node['___binder_instanse___'] = this
            node['___binder_data___'] = object
        }

        let handles = []
        if (node['___cached_handles___']) {
            handles = node['___cached_handles___']
        } else if (node instanceof HTMLElement) {
            parseNode(this, node, handles)
        } else if (node instanceof Text) {
            parseNode(this, node, handles)
        } else {
            throw Error(`not support ${node}`)
        }
        node['___cached_handles___'] = handles

        handles.forEach(f => f(object))
        for (const key in object) {
            if (typeof (object[key]) != 'function') { continue }
            let [selector, event] = key.split('@')
            if (node instanceof HTMLElement) {
                if (node.matches(selector)) { node[event] = object[key] }
            }
            if (node instanceof Text) continue
            //@ts-ignore
            node.querySelectorAll(selector).forEach(e => {
                e[event] = object[key]
            })
        }
        return node
    }

    /**
     * @param {HTMLTemplateElement} templ 
     * @param {*} object 
     */
    render(templ, object) {
        let parent = templ.parentElement
        let array = object
        if (!(array instanceof Array)) {
            array = [array]
        }
        let nodes = []
        for (let obj of array) {
            let node = templ.content.cloneNode(true)
            for (const cNode of node.childNodes) {
                cNode['___binder_instanse___'] = this
                cNode['___binder_data___'] = object
                if (cNode instanceof HTMLElement) {
                    nodes.push(cNode)
                    this.bind(cNode, obj)
                }
            }
            parent.appendChild(node)
        }
        return nodes
    }

    /**
     * @param {Node} node 
     * @returns {Binder}
     */
    static getBinder(node) {
        return node['___binder_instanse___']
    }

    /**
     * @param {Node} node 
     * @returns {Object}
     */
    static getData(node) {
        return node['___binder_data___']
    }

    /**
     * @param {Node} node
     */
    static from(node) {
        return {
            'bind': (object) => {
                let b = node['___binder_instanse___']
                if (b) b.bind(node, object)
            }
        }
    }

}

export default Binder

const MATCH_RULE = /{{(\S+?)}}/g

/**
 * @param {ChildNode} node 
 */
function parseNode(context, node, handles) {
    if (node instanceof Text) {
        handleTextNode(context, node, handles)
    } else if (node instanceof HTMLTemplateElement) {
        let name = node.getAttribute('name')
        handles.push((object) => {
            if (object.hasOwnProperty(name)) {
                if (object[name]) {
                    context.render(node, object[name])
                }
            }
        })
    } else if (node instanceof HTMLElement) {
        handleHTMLElementNode(context, node, handles)
    }
}

function handleTextNode(context, node, handles) {
    let matches = node.textContent.match(context.matchRule)
    if (!matches) return
    const rawTextContent = node.textContent
    handles.push((object) => {
        let isHtml = false
        let newTextContent = rawTextContent.replace(context.matchRule, (m, key) => {
            if (key.startsWith('#')) {
                isHtml = true
                key = key.substr(1)
            }
            if (object.hasOwnProperty(key)) {
                return object[key]
            } else {
                return m
            }
        })
        if (isHtml) {
            node.parentNode.innerHTML = newTextContent
        } else {
            node.textContent = newTextContent
        }
    })
}

function handleHTMLElementNode(context, node, handles) {
    for (const attr of [...node.attributes]) {
        let { name, value } = attr
        let matches = name.match(context.matchRule)
        if (matches) {
            node.removeAttribute(name)
            handles.push((object) => {
                let reg = new RegExp(context.matchRule, '')
                for (let m of matches) {
                    let matchKey = m.match(reg)
                    let key = matchKey[1].trim()
                    if (object.hasOwnProperty(key)) {
                        if (object[key] == true) {
                            node.setAttribute(key, '')
                        } else if (object[key]) {
                            node.setAttribute(key, object[key])
                        } else {
                            node.removeAttribute(key)
                        }
                    }
                }
            })
        } else {
            if (name == 'class') {
                handleAttrClass(context, node, handles)
            } else {
                handleAttrOthers(context, node, handles, name, value)
            }
        }
    }
    for (const o of node.childNodes) {
        parseNode(context, o, handles)
    }
}

/**
 * 
 * @param {HTMLElement} node 
 * @param {Function[]} handles 
 */
function handleAttrClass(context, node, handles) {
    const alias = {}
    for (const className of [...node.classList]) {
        let match = className.match(new RegExp(context.matchRule, ''))
        if (!match) { continue }
        let key = match[1]
        alias[key] = className
        node.classList.remove(className)
        handles.push((object) => {
            node.classList.remove(alias[key])
            if (object.hasOwnProperty(key)) {
                const value = object[key];
                alias[key] = value
                if (value == true) {
                    node.classList.add(key)
                } else if (value) {
                    node.classList.add(className.replace(context.matchRule, value))
                }
            }
        })
    }
}

function handleAttrOthers(context, node, handles, name, value) {
    if (!value.match(context.matchRule)) { return }
    const rawValue = value
    handles.push((object) => {
        let newValue = rawValue.replace(context.matchRule, (_, key) => {
            if (object.hasOwnProperty(key)) {
                return object[key]
            } else {
                return ''
            }
        })

        if (newValue.trim()) {
            node.setAttribute(name, newValue)
        } else {
            node.removeAttribute(name)
        }
    })
}