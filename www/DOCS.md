# Middleman / HTML5 Boilerplate Notes

Please note that this port of the HTML5 Boilerplate has been converted to use HAML and Sprockets, while using a Middleman 3.x workflow.

[The original HTML5 Boilerplate documentation](https://github.com/dannyprose/Middleman-HTML5BP-HAML/tree/master/html5bp-docs) is included at /html5bp-docs/ for your reference, but certain things (e.g. ways of including, specific javascript and CSS paths) may be different in our implementation.

## Recommendations

* Update `.rvmrc` to the [gemset](https://rvm.io/gemsets/basics/) of your choosing (or remove it if you do not use [RVM](https://rvm.io/))
* Double check `.gitignore` and make sure it is what you want.
  * eg: `build/` is ignored by default.
* If you don't use `middleman init` to load the template, make sure to [use and run Bundler](http://gembundler.com/).

## Site and Individual Page Titles and Descriptions

One change we have made from the Boilerplate is some smarter ways of handling site/page titles and descriptions.

Titles and descriptions are handled 2 ways:

For the site at large, the title & description is handled through `/helpers/site_helpers.rb`. You can set them there, and the default layout file will include them on every page.

For individual pages, just add some YAML data to the top of any given page (see our default index for an example):

```yaml
---
title:
description:
---
```

### Changing the Site Title and Description

To the change site's title and description, edit the values in `/helpers/site_helpers.rb`. You can also edit the formatting for individual page title and descriptions here.

To change, individual page's titles and descriptions, see the YAML method above.

### But I Don't Want This

No problem - we only included it because we just thought this was a good, DRY use case for Middelman, and it is what the Middleman Docs site uses. 

If you want to develop a method of your own, just remove the `page_title` and `page_description` methods in `/helpers/site_helpers.rb`, remove their references in `/layouts/layout.haml` (all within `<head>`), and restart Middleman. Then do whatever you want to include titles and headers.