Vitrine
=======

Vitrine is a vite plugin that provides a lightweight component library. It is still being developed, and currently only supports working with vite's dev server; it does not build a static library.

Usage
-----

```
import vitrine from '@imarc/vitrine'

export default defineConfig({
  plugins: [vitrine()]
})
```

Vitrine should be added to your vite.config.js like most vite plugins. `vitrine()` can also take the following configuration:

```
export default defineConfig({
  plugins: [vitrine({
    includes: [],
    basePaths: ['resources/styles'],
  })]
})
```

The above represents the default configuration values.

* **includes** - an array of paths to files that Vitrine should include. You almost always want to set this. Example: `includes: ['/src/main.js']`
* **basePaths** - an array of directory paths to look in for components and documentation.

**Advanced Options**

* **prefix** - the prefix to use for the path to the pattern library. 
* **template** - you can override the default template Vitrine includes as iframes.
* **componentPattern** - a RegExp that should match all component and documentation files. Currently Vitrine supports .md, .htm and .html files.
* **stylesheetPattern** - a RegExp that should differentiate when to link to them a `<link>` or `<script>` tag.
* **includes** - as an advanced configuration option, if you specify an include that begins with any HTML tag, it will include that string as is.
