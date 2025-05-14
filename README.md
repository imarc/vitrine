Vitrine
=======

Vitrine is a vite plugin that provides a lightweight component library. It is still being developed, and currently only supports working with vite's dev server; it does not build a static library.

Installation & Usage
-------------------

```
npm install @imarc/vitrine
```

Vitrine should be imported into your vite.config.js and added to the plugins in your vite config:

```
import vitrine from '@imarc/vitrine'

export default defineConfig({
  plugins: [vitrine({
    // ...
  })]
})
```

Options
-------

`vitrine()` can also take the following configuration options:

* **includes** - An array of paths to files that Vitrine should include. You almost always want to set this. Default: `[]`. Example: `includes: ['/src/main.js']`
* **basePaths** - An array of directory paths to look in for components and documentation. Default: `['resources/styles']`.
* **name** - Set the name of your pattern library. Default `vitrine`.
* **logo** - Provide HTML to use for the logo for your pattern library. Default: uses `name`.
* **version** - An optional version to display for your component library.

**Advanced options**

* **componentPattern** - A RegExp that should match all component and documentation files. Currently Vitrine supports .md, .htm and .html files. Default: `/\.md|\/.html?$/i`
* **includeVite** - Whether to include Vite. Default: `true`. You would want to turn this off if Vite is being included through another method. For example, if you're using Nuxt, you likely want to set this to `false`.
* **includes** - As an advanced configuration option, if you specify an include that begins with any HTML tag, it will include that string as is.
* **outDir** - Where to put the built pattern library. Default: `dist`
* **manifestDir** – path to Vite's manifest. Set to `false` to disable using the manifest at all. Default: `${outDir}/.vite`
* **prefix** - The prefix to use for the path to the pattern library. Default: `/components`
* **stylesheetPattern** - A RegExp that should differentiate when to link to them a `<link>` or `<script>` tag. Default: `/\.(css|less|sass|scss|styl)$/i`
* **template** - You can override the default template Vitrine includes as iframes. By default, Vitrine will look for a file named `_preview.html` and use that, but if it doesn't exist, it will fallback to its own builtin template. Default: `_preview.html`


**Sample configuration**

```
export default defineConfig({
  plugins: [vitrine({
    includes: [
      '/resources/styles/index.scss',
      '/resources/js/index.js',
    ],
    basePaths: [
      'resources',
    ],
  })]
})
```

Contributing
------------

Vitrine is being developed as an open source project and welcomes contributions. Vitrine's goal is to maintain a small footprint and not be tied to any specific framework - we may even remove the dependency on Vue for SSR. It should work anywhere Vite does.


### Working on Vitrine

The recommmended way to work on vitrine is to start with a parent project (like [imarc/pronto](https://github.com/imarc/pronto)), checkout out both the parent project and vitrine.

1. Within Vitrine's folder, run `npm link`
2. Within the parent project folder, run `npm link vitrine`
3. Run `npm run dev` within the parent project.

Using `npm link`, you can develop and test changes to Vitrine and see how it handles teh components in your parent project.
