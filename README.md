# binder
A simple DOM data binding tool that can be used to bind data or events to DOM elements.

## View demo
- `npm install`
- `npm run test`

## Usage
- `npm install @yuanliwei/binder`

```html
<template id="templ-code">
    <hr>
    <h1>{{title}}</h1>
    <p>{{desc}}</p>
    <code><pre>
            {{template}}
    </pre></code>
    <code><pre>
            {{code}}
    </pre></code>
</template>
```
```js
import Binder from '@yuanliwei/binder'

let b = new Binder()
let templ = document.getElementById('templ-code')

b.render(templ, {
    title: 'title',
    template: templ.outerHTML,
    code: Binder.toString(),
    desc: desc,
    'h1@onclick':()=>{
        alert('click h1')
    }
})
```
