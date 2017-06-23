# jim-d53 fork of [`refined-bitbucket`](https://github.com/andremw/refined-bitbucket)

To build this and use it as a Chrome extension:

1. `npm i`
1. `npm run build`
1. Open the [Chrome Extensions Page](chrome://extensions) (Window > Extensions)
1. Check the "Developer mode" box at the top right
1. Find any Refined BitBucket extensions and remove them
1. Click "Load unpacked extension..."
1. Open then `extension` folder from this project in this file dialog box

And you're all set!

## Changes

- Collapsible "Files Changed" list
- Collapsible assets diff content (`.png`, `.jpg`, `.svg`, `.snap`)
- `.tsx` files now correctly identified as TypeScript files 
- Slightly modified PrismJS coy theme: highlight colors have better contrast
- Added Github like DiffStat widget to the changeset summary
- Added script to update build time in extension manifest
