Siesta sample test suite targeting all environments (isomorphic code) 
====================================================================

This is an example of testing isomorphic code with Siesta. It is structured as Node.js package for convenience, however the code is assumed to be generic EcmaScript.

Package has the only module in `src/module.js`, tests are in `tests/`, Siesta project file is `tests/index.js`

Note, this test suite contains intentional failures to demonstrate the failing assertions.

Setting up
----------

Change the current working directory to the example:

```shell
cd examples/isomorphic
```

Complete the setup with `npm`:

```shell
npm install
```

Launch
------

This test suite can be launched in all 3 supported target environments: Node.js, Deno and browsers!

Targeting Node.js, we can launch the project file directly, as a Node.js executable:

```shell
node tests/index.js
```

Targeting Deno, we can also launch the project file directly, as a Deno executable:

```shell
deno run --allow-net --allow-read --allow-env --unstable --quiet --no-check tests/index.js
```

Targeting browsers, we need a local webserver, which will be serving this example. Any webserver will work. Let's say the Siesta package is available via url: `http://localhost/siesta` . Then we can launch this example, by pointing Node.js launcher to the project file url:

```shell
npx siesta http://localhost/siesta/examples/isomorphic/tests/index.js --browser chrome
```

By default tests are launched in Chrome, supported browsers are also: `firefox`, `safari` and `edge` (currently same as `chrome`).

Note, that `npm` version 6 can sometimes [skip the creation](https://github.com/npm/cli/issues/2147) of `./node_modules/.bin` folder, and because of this, the `npx siesta` command may fail. Solution is to use the latest `npm` or launch the Siesta executable directly, as `node ./node_modules/siesta/bin/siesta.js`


Documentation
-------------

If you are just starting with Siesta, please consult this guide:

[[GettingStartedNodejsGuide|Getting started with Siesta in Node.js environment]]
[[GettingStartedNodejsGuide|Getting started with Siesta in Deno environment]]
[[GettingStartedNodejsGuide|Getting started with Siesta in browser environment]]


Github repo
===========

https://github.com/bryntum/siesta


Connect
=======

We welcome all feedback - please tell us what works well in Siesta, what causes trouble and what any other features you would like to see implemented.

Please report any found bugs in the [issues tracker](https://github.com/bryntum/siesta/issues)

Ask questions in the [forum](https://bryntum.com/forum/viewforum.php?f=20)

Chat live at [Discord](https://discord.gg/6mwJZGnwbq)

Follow the [development blog](https://www.bryntum.com/blog/)


COPYRIGHT AND LICENSE
=================

MIT License

Copyright (c) 2020-2025 Nickolay Platonov
