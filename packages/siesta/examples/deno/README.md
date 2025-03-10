Siesta sample test suite targeting Deno 
==========================================

This is an example of testing very simple Deno package with Siesta.

Package has the only module in `src/module.ts`, tests are in `tests/`, Siesta project file is `tests/index.ts`

Note, this test suite contains intentional failures to demonstrate the failing assertions.

Launch
------

We can launch the project file directly, as a Deno executable:

```shell
cd examples/deno

deno run --allow-read --allow-env --allow-net --unstable --quiet --no-check tests/index.ts
```

Documentation
-------------

If you are just starting with Siesta, please consult this guide:

[[GettingStartedDenoGuide|Getting started with Siesta in Deno environment]]


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
